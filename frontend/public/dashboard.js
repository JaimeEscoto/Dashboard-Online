const API_BASE_URL = window.__API_BASE_URL__ || 'https://dashboard-online-be.onrender.com';
const TOKEN_KEY = 'app_access_token';

const logoutBtn = document.getElementById('logout-btn');
const message = document.getElementById('dash-message');
const subtitle = document.getElementById('dashboard-subtitle');
const kpiGrid = document.getElementById('kpi-grid');

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1' } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } }
    }
  };
}

function renderDashboard(registros) {
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

  const common = chartOptions();

  new Chart(document.getElementById('chart-ventas'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Ventas', data: data.map((r) => r.ventas), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.2)', fill: true, tension: 0.35 }] },
    options: common
  });

  new Chart(document.getElementById('chart-utilidad-neta'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Utilidad neta', data: data.map((r) => r.utilidad_neta), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', fill: true, tension: 0.3 }] },
    options: common
  });

  new Chart(document.getElementById('chart-costos'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ventas', data: data.map((r) => r.ventas), backgroundColor: '#2563eb' },
        { label: 'Costo variable', data: data.map((r) => r.costo_variable), backgroundColor: '#f97316' },
        { label: 'Costo fijo', data: data.map((r) => r.costo_fijo), backgroundColor: '#ef4444' }
      ]
    },
    options: common
  });

  new Chart(document.getElementById('chart-utilidades'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Utilidad bruta', data: data.map((r) => r.utilidad_bruta), backgroundColor: '#a78bfa' },
        { label: 'Utilidad neta', data: data.map((r) => r.utilidad_neta), backgroundColor: '#22c55e' }
      ]
    },
    options: common
  });

  new Chart(document.getElementById('chart-composicion'), {
    type: 'doughnut',
    data: {
      labels: ['Costo variable total', 'Costo fijo total', 'Utilidad neta total'],
      datasets: [{ data: [totalCostoVar, totalCostoFijo, totalUtilidad], backgroundColor: ['#fb923c', '#f87171', '#4ade80'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
  });

  new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: {
      datasets: [{ label: 'Ventas vs utilidad neta', data: data.map((r) => ({ x: r.ventas, y: r.utilidad_neta })), backgroundColor: '#38bdf8' }]
    },
    options: common
  });

  new Chart(document.getElementById('chart-margen'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Margen neto %', data: data.map((r) => r.margen_neto), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', fill: true }] },
    options: common
  });

  new Chart(document.getElementById('chart-radar'), {
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
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.25)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: 'rgba(148,163,184,0.2)' }, pointLabels: { color: '#cbd5e1' }, ticks: { color: '#94a3b8', backdropColor: 'transparent' } } }, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
  });

  new Chart(document.getElementById('chart-top'), {
    type: 'bar',
    data: { labels: topPeriods.map(periodLabel), datasets: [{ label: 'Top ventas', data: topPeriods.map((r) => r.ventas), backgroundColor: '#14b8a6' }] },
    options: { ...common, indexAxis: 'y' }
  });

  new Chart(document.getElementById('chart-anual'), {
    type: 'polarArea',
    data: {
      labels: Object.keys(yearly),
      datasets: [{
        label: 'Ventas anuales',
        data: Object.values(yearly),
        backgroundColor: ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { r: { grid: { color: 'rgba(148,163,184,0.25)' }, ticks: { color: '#94a3b8', backdropColor: 'transparent' } } } }
  });
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
    const registros = response.registros || [];

    if (!registros.length) {
      setMessage('No hay registros todavía para construir los gráficos.', true);
      return;
    }

    renderDashboard(registros);
    setMessage('Dashboard cargado con 10 visualizaciones.', false);
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

init();
