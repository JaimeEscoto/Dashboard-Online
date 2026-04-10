const API_BASE_URL = window.__API_BASE_URL__ || 'https://dashboard-online-be.onrender.com';
const TOKEN_KEY = 'app_access_token';
const THEME_KEY = 'app_theme';

const logoutBtn = document.getElementById('logout-btn');
const printBtn = document.getElementById('print-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const message = document.getElementById('dash-message');
const subtitle = document.getElementById('dashboard-subtitle');
const kpiGrid = document.getElementById('kpi-grid');

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const palette = {
  blue: '#3b82f6',
  cyan: '#22d3ee',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#ef4444',
  purple: '#a855f7',
  yellow: '#eab308',
  slate: '#64748b',
  teal: '#0d9488',
  rose: '#ec4899'
};

const monthNames = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

const filterRefs = {
  anio: document.getElementById('filter-anio'),
  mes: document.getElementById('filter-mes')
};

const chartInstances = [];
let sourceRegistros = [];

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.classList.toggle('success', !isError && !!text);
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

function getThemePalette() {
  const css = getComputedStyle(document.body);
  return {
    muted: css.getPropertyValue('--muted').trim() || '#64748b',
    border: css.getPropertyValue('--border').trim() || '#d6dee8'
  };
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || 'light';
  applyTheme(theme);

  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    if (sourceRegistros.length) updateByFilters();
  });
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

function axisFormatMoney(value) {
  return money.format(value);
}

function chartOptions(yAsPercent = false) {
  const t = getThemePalette();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: t.muted } }
    },
    scales: {
      x: { ticks: { color: t.muted }, grid: { color: t.border } },
      y: {
        beginAtZero: true,
        ticks: {
          color: t.muted,
          callback: (value) => (yAsPercent ? `${value}%` : axisFormatMoney(value))
        },
        grid: { color: t.border }
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
    meses: months.length ? months : null
  };
}

function filterData(registros, f) {
  return registros.filter((r) => {
    if (f.anios !== null && !f.anios.includes(Number(r.anio))) return false;
    if (f.meses !== null && !f.meses.includes(Number(r.mes))) return false;
    return true;
  });
}

function renderDashboard(registros) {
  destroyCharts();

  const t = getThemePalette();
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
    data: { labels, datasets: [{ label: 'Ventas', data: data.map((r) => r.ventas), borderColor: palette.blue, backgroundColor: 'rgba(59,130,246,0.2)', fill: true, tension: 0.35 }] },
    options: chartOptions(false)
  }));

  chartInstances.push(new Chart(document.getElementById('chart-utilidad-neta'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Utilidad neta', data: data.map((r) => r.utilidad_neta), borderColor: palette.green, backgroundColor: 'rgba(34,197,94,0.2)', fill: true, tension: 0.3 }] },
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
    options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1, plugins: { legend: { labels: { color: t.muted } } } }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: {
      datasets: [{ label: 'Ventas vs utilidad neta', data: data.map((r) => ({ x: r.ventas, y: r.utilidad_neta })), backgroundColor: palette.slate }]
    },
    options: {
      ...chartOptions(false),
      scales: {
        x: { beginAtZero: true, ticks: { color: t.muted, callback: (value) => axisFormatMoney(value) }, grid: { color: t.border } },
        y: { beginAtZero: true, ticks: { color: t.muted, callback: (value) => axisFormatMoney(value) }, grid: { color: t.border } }
      }
    }
  }));

  chartInstances.push(new Chart(document.getElementById('chart-margen'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Margen neto %', data: data.map((r) => r.margen_neto), borderColor: palette.yellow, backgroundColor: 'rgba(234,179,8,0.2)', fill: true }] },
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
        backgroundColor: 'rgba(236,72,153,0.2)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, grid: { color: t.border }, pointLabels: { color: t.muted }, ticks: { color: t.muted, backdropColor: 'transparent' } } }, plugins: { legend: { labels: { color: t.muted } } } }
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
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: t.muted } } }, scales: { r: { beginAtZero: true, grid: { color: t.border }, ticks: { color: t.muted, backdropColor: 'transparent' } } } }
  }));
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

  if (!filtered.length) {
    destroyCharts();
    kpiGrid.innerHTML = '';
    setMessage('No hay datos para los filtros seleccionados. Ajusta año o mes e intenta nuevamente.', true);
    return;
  }

  renderDashboard(filtered);
  setMessage(`Dashboard actualizado con ${filtered.length} período(s) filtrados.`, false);
}

function clearFilters() {
  Object.values(filterRefs).forEach((el) => {
    [...el.options].forEach((option) => {
      option.selected = false;
    });
  });
  updateByFilters();
}

async function init() {
  initTheme();

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

Object.values(filterRefs).forEach((el) => {
  el.addEventListener('change', updateByFilters);
});
clearFiltersBtn.addEventListener('click', clearFilters);
printBtn.addEventListener('click', () => window.print());

init();
