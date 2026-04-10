const API_BASE_URL = window.__API_BASE_URL__ || 'https://dashboard-online-be.onrender.com';
const TOKEN_KEY = 'app_access_token';

const logoutBtn = document.getElementById('logout-btn');
const printBtn = document.getElementById('print-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const message = document.getElementById('dash-message');
const subtitle = document.getElementById('dashboard-subtitle');
const kpiGrid = document.getElementById('kpi-grid');
const recordsBody = document.getElementById('records-body');
const recordsMessage = document.getElementById('records-message');

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const palette = {
  blue: '#4c78a8',
  cyan: '#72b7b2',
  green: '#54a24b',
  orange: '#f58518',
  red: '#e45756',
  purple: '#b279a2',
  yellow: '#eeca3b',
  slate: '#8097b1',
  teal: '#72b7b2',
  rose: '#d37295'
};

const monthNames = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

const filterRefs = {
  anio: document.getElementById('filter-anio'),
  mes: document.getElementById('filter-mes'),
  ventasMin: document.getElementById('filter-ventas-min'),
  ventasMax: document.getElementById('filter-ventas-max'),
  cvMin: document.getElementById('filter-cv-min'),
  cvMax: document.getElementById('filter-cv-max'),
  cfMin: document.getElementById('filter-cf-min'),
  cfMax: document.getElementById('filter-cf-max'),
  ubMin: document.getElementById('filter-ub-min'),
  ubMax: document.getElementById('filter-ub-max'),
  unMin: document.getElementById('filter-un-min'),
  unMax: document.getElementById('filter-un-max'),
  mnMin: document.getElementById('filter-mn-min'),
  mnMax: document.getElementById('filter-mn-max')
};

const chartInstances = [];
let sourceRegistros = [];

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.classList.toggle('success', !isError && !!text);
}

function setRecordsMessage(text, isError = false) {
  recordsMessage.textContent = text;
  recordsMessage.classList.toggle('error', isError);
  recordsMessage.classList.toggle('success', !isError && !!text);
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(value) {
  if (!value) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, value);
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const accessToken = token();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

function toSortedRegistros(registros) {
  return [...registros].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
}

function periodLabel(r) {
  return `${r.anio}-${String(r.mes).padStart(2, '0')}`;
}

function createKPI(title, value, accent = '') {
  const card = document.createElement('article');
  card.className = `kpi-card ${accent}`.trim();
  card.innerHTML = `<p>${title}</p><h3>${value}</h3>`;
  return card;
}

function parseMaybeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function axisFormatMoney(value) {
  return money.format(value);
}

function chartOptions(yAsPercent = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#334155' } }
    },
    scales: {
      x: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#475569',
          callback: (value) => (yAsPercent ? `${value}%` : axisFormatMoney(value))
        },
        grid: { color: '#e2e8f0' }
      }
    }
  };
}

function destroyCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.length = 0;
}

function readFilters() {
  const years = [...filterRefs.anio.selectedOptions].map((option) => Number(option.value));
  const months = [...filterRefs.mes.selectedOptions].map((option) => Number(option.value));

  return {
    anios: years.length ? years : null,
    meses: months.length ? months : null,
    ventasMin: parseMaybeNumber(filterRefs.ventasMin.value),
    ventasMax: parseMaybeNumber(filterRefs.ventasMax.value),
    cvMin: parseMaybeNumber(filterRefs.cvMin.value),
    cvMax: parseMaybeNumber(filterRefs.cvMax.value),
    cfMin: parseMaybeNumber(filterRefs.cfMin.value),
    cfMax: parseMaybeNumber(filterRefs.cfMax.value),
    ubMin: parseMaybeNumber(filterRefs.ubMin.value),
    ubMax: parseMaybeNumber(filterRefs.ubMax.value),
    unMin: parseMaybeNumber(filterRefs.unMin.value),
    unMax: parseMaybeNumber(filterRefs.unMax.value),
    mnMin: parseMaybeNumber(filterRefs.mnMin.value),
    mnMax: parseMaybeNumber(filterRefs.mnMax.value)
  };
}

function inRange(value, min, max) {
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function filterData(registros, f) {
  return registros.filter((r) => {
    if (f.anios !== null && !f.anios.includes(Number(r.anio))) return false;
    if (f.meses !== null && !f.meses.includes(Number(r.mes))) return false;
    if (!inRange(Number(r.ventas), f.ventasMin, f.ventasMax)) return false;
    if (!inRange(Number(r.costo_variable), f.cvMin, f.cvMax)) return false;
    if (!inRange(Number(r.costo_fijo), f.cfMin, f.cfMax)) return false;
    if (!inRange(Number(r.utilidad_bruta), f.ubMin, f.ubMax)) return false;
    if (!inRange(Number(r.utilidad_neta), f.unMin, f.unMax)) return false;
    if (!inRange(Number(r.margen_neto), f.mnMin, f.mnMax)) return false;
    return true;
  });
}

function renderDashboard(registros) {
  destroyCharts();

  const data = toSortedRegistros(registros);
  const labels = data.map(periodLabel);

  const totalVentas = data.reduce((acc, r) => acc + Number(r.ventas), 0);
  const totalUtilidad = data.reduce((acc, r) => acc + Number(r.utilidad_neta), 0);
  const margenPromedio = data.length ? data.reduce((acc, r) => acc + Number(r.margen_neto), 0) / data.length : 0;
  const mejorPeriodo = data.reduce((best, r) => (r.ventas > (best?.ventas || 0) ? r : best), null);

  kpiGrid.innerHTML = '';
  kpiGrid.append(
    createKPI('Ventas acumuladas', money.format(totalVentas), 'accent-blue'),
    createKPI('Utilidad neta acumulada', money.format(totalUtilidad), 'accent-green'),
    createKPI('Margen promedio', `${margenPromedio.toFixed(2)}%`, 'accent-purple'),
    createKPI('Mejor período', mejorPeriodo ? `${periodLabel(mejorPeriodo)} · ${money.format(mejorPeriodo.ventas)}` : 'Sin datos', 'accent-amber')
  );

  const totalCostoVar = data.reduce((acc, r) => acc + Number(r.costo_variable), 0);
  const totalCostoFijo = data.reduce((acc, r) => acc + Number(r.costo_fijo), 0);
  const yearly = data.reduce((acc, r) => {
    acc[r.anio] = (acc[r.anio] || 0) + Number(r.ventas);
    return acc;
  }, {});
  const topPeriods = [...data].sort((a, b) => b.ventas - a.ventas).slice(0, 7);

  chartInstances.push(new Chart(document.getElementById('chart-ventas'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Ventas', data: data.map((r) => r.ventas), borderColor: palette.blue, backgroundColor: 'rgba(76,120,168,0.2)', fill: true, tension: 0.35 }] },
    options: chartOptions(false)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-utilidad-neta'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Utilidad neta', data: data.map((r) => r.utilidad_neta), borderColor: palette.green, backgroundColor: 'rgba(84,162,75,0.2)', fill: true, tension: 0.3 }] },
    options: chartOptions(false)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-costos'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ventas', data: data.map((r) => r.ventas), backgroundColor: palette.blue },
        { label: 'Costo variable', data: data.map((r) => r.costo_variable), backgroundColor: palette.orange },
        { label: 'Costo fijo', data: data.map((r) => r.costo_fijo), backgroundColor: palette.red }
      ]
    },
    options: chartOptions(false)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-utilidades'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Utilidad bruta', data: data.map((r) => r.utilidad_bruta), backgroundColor: palette.purple },
        { label: 'Utilidad neta', data: data.map((r) => r.utilidad_neta), backgroundColor: palette.green }
      ]
    },
    options: chartOptions(false)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-composicion'), {
    type: 'doughnut',
    data: {
      labels: ['Costo variable total', 'Costo fijo total', 'Utilidad neta total'],
      datasets: [{ data: [totalCostoVar, totalCostoFijo, totalUtilidad], backgroundColor: [palette.orange, palette.red, palette.green] }]
    },
    options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1, plugins: { legend: { labels: { color: '#334155' } } } }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: {
      datasets: [{ label: 'Ventas vs utilidad neta', data: data.map((r) => ({ x: r.ventas, y: r.utilidad_neta })), backgroundColor: palette.slate }]
    },
    options: {
      ...chartOptions(false),
      scales: {
        x: { beginAtZero: true, ticks: { color: '#475569', callback: (value) => axisFormatMoney(value) }, grid: { color: '#e2e8f0' } },
        y: { beginAtZero: true, ticks: { color: '#475569', callback: (value) => axisFormatMoney(value) }, grid: { color: '#e2e8f0' } }
      }
    }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-margen'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Margen neto %', data: data.map((r) => r.margen_neto), borderColor: palette.yellow, backgroundColor: 'rgba(238,202,59,0.2)', fill: true }] },
    options: chartOptions(true)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-radar'), {
    type: 'radar',
    data: {
      labels: ['Ventas', 'Costo variable', 'Costo fijo', 'Utilidad bruta', 'Utilidad neta', 'Margen neto'],
      datasets: [{
        label: 'Promedios',
        data: [
          totalVentas / (data.length || 1),
          totalCostoVar / (data.length || 1),
          totalCostoFijo / (data.length || 1),
          data.reduce((acc, r) => acc + Number(r.utilidad_bruta), 0) / (data.length || 1),
          totalUtilidad / (data.length || 1),
          margenPromedio
        ],
        borderColor: palette.rose,
        backgroundColor: 'rgba(211,114,149,0.2)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, grid: { color: '#dbe4ef' }, pointLabels: { color: '#334155' }, ticks: { color: '#64748b', backdropColor: 'transparent' } } }, plugins: { legend: { labels: { color: '#334155' } } } }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-top'), {
    type: 'bar',
    data: { labels: topPeriods.map(periodLabel), datasets: [{ label: 'Top ventas', data: topPeriods.map((r) => r.ventas), backgroundColor: palette.teal }] },
    options: { ...chartOptions(false), indexAxis: 'y' }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-anual'), {
    type: 'polarArea',
    data: {
      labels: Object.keys(yearly),
      datasets: [{
        label: 'Ventas anuales',
        data: Object.values(yearly),
        backgroundColor: [palette.blue, palette.purple, palette.green, palette.yellow, palette.red, palette.teal]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#334155' } } }, scales: { r: { beginAtZero: true, grid: { color: '#dbe4ef' }, ticks: { color: '#64748b', backdropColor: 'transparent' } } } }
  }));
}

function toMoney(value) {
  return Number(value).toFixed(2);
}

function renderRegistros(registros) {
  recordsBody.innerHTML = '';
  if (!registros.length) {
    recordsBody.innerHTML = '<tr><td colspan="9">No hay registros para los filtros seleccionados.</td></tr>';
    return;
  }

  registros.forEach((registro) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="number" min="2000" max="2100" value="${registro.anio}" data-field="anio"></td>
      <td><input type="number" min="1" max="12" value="${registro.mes}" data-field="mes"></td>
      <td><input type="number" min="0" step="0.01" value="${toMoney(registro.ventas)}" data-field="ventas"></td>
      <td><input type="number" min="0" step="0.01" value="${toMoney(registro.costo_variable)}" data-field="costo_variable"></td>
      <td><input type="number" min="0" step="0.01" value="${toMoney(registro.utilidad_bruta)}" data-field="utilidad_bruta"></td>
      <td><input type="number" min="0" step="0.01" value="${toMoney(registro.costo_fijo)}" data-field="costo_fijo"></td>
      <td><input type="number" step="0.01" value="${toMoney(registro.utilidad_neta)}" data-field="utilidad_neta"></td>
      <td><input type="number" min="0" max="100" step="0.01" value="${toMoney(registro.margen_neto)}" data-field="margen_neto"></td>
      <td><button type="button" data-action="save">Guardar</button></td>
    `;

    row.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const body = {};
      row.querySelectorAll('input').forEach((input) => {
        body[input.dataset.field] = Number(input.value);
      });

      try {
        await api(`/api/registros-base/${registro.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        setRecordsMessage('Registro actualizado correctamente.');
        const response = await api('/api/registros-base', { method: 'GET' });
        sourceRegistros = response.registros || [];
        populateFilterSelectors(sourceRegistros);
        updateByFilters();
      } catch (error) {
        setRecordsMessage(error.message || 'No se pudo actualizar el registro.', true);
      }
    });

    recordsBody.appendChild(row);
  });
}

function populateFilterSelectors(registros) {
  const years = [...new Set(registros.map((r) => Number(r.anio)))].sort((a, b) => a - b);
  const months = [...new Set(registros.map((r) => Number(r.mes)))].sort((a, b) => a - b);

  filterRefs.anio.innerHTML = '';
  years.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    filterRefs.anio.appendChild(option);
  });

  filterRefs.mes.innerHTML = '';
  months.forEach((month) => {
    const option = document.createElement('option');
    option.value = String(month);
    option.textContent = monthNames[month] || String(month);
    filterRefs.mes.appendChild(option);
  });
}

function updateByFilters() {
  const filtered = filterData(sourceRegistros, readFilters());
  renderRegistros(filtered);

  if (!filtered.length) {
    destroyCharts();
    kpiGrid.innerHTML = '';
    setMessage('No hay datos para los filtros seleccionados. Ajusta los rangos e intenta nuevamente.', true);
    return;
  }

  renderDashboard(filtered);
  setMessage(`Dashboard actualizado con ${filtered.length} período(s) filtrados.`, false);
}

function clearFilters() {
  Object.entries(filterRefs).forEach(([key, el]) => {
    if (key === 'anio' || key === 'mes') {
      [...el.options].forEach((option) => {
        option.selected = false;
      });
      return;
    }
    el.value = '';
  });
  setRecordsMessage('');
  updateByFilters();
}

async function init() {
  if (!token()) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const me = await api('/api/me', { method: 'GET' });
    const empresaTexto = me.user.empresa_nombre ? `Empresa: ${me.user.empresa_nombre}` : 'Sin empresa asignada';
    subtitle.textContent = `${empresaTexto} · Usuario: ${me.user.email}`;

    const response = await api('/api/registros-base', { method: 'GET' });
    sourceRegistros = response.registros || [];

    if (!sourceRegistros.length) {
      setMessage('No hay registros todavía para construir los gráficos.', true);
      return;
    }

    populateFilterSelectors(sourceRegistros);
    updateByFilters();
  } catch (error) {
    setToken(null);
    setMessage(error.message || 'No fue posible cargar el dashboard.', true);
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1200);
  }
}

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } finally {
    setToken(null);
    window.location.href = '/index.html';
  }
});

Object.entries(filterRefs).forEach(([key, el]) => {
  const eventType = key === 'anio' || key === 'mes' ? 'change' : 'input';
  el.addEventListener(eventType, updateByFilters);
});
clearFiltersBtn.addEventListener('click', clearFilters);
printBtn.addEventListener('click', () => window.print());

init();
