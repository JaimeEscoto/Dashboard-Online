const API_BASE_URL = window.__API_BASE_URL__ || 'https://dashboard-online-be.onrender.com';
const TOKEN_KEY = 'app_access_token';
const THEME_KEY = 'app_theme';

const authCard = document.getElementById('auth-card');
const welcomeCard = document.getElementById('welcome-card');
const authForm = document.getElementById('auth-form');
const message = document.getElementById('message');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');
const recordsBody = document.getElementById('records-body');
const recordsMessage = document.getElementById('records-message');
const addRecordForm = document.getElementById('add-record-form');
const themeToggleBtn = document.getElementById('theme-toggle');

let currentRegistros = [];

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


function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || 'light');

  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
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

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error inesperado');
  }

  return data;
}

function toMoney(value) {
  return Number(value).toFixed(2);
}

function renderRegistros() {
  recordsBody.innerHTML = '';

  if (currentRegistros.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="9">No hay registros para esta empresa.</td></tr>';
    return;
  }

  currentRegistros.forEach((registro) => {
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
        await loadRegistros();
      } catch (error) {
        setRecordsMessage(error.message, true);
      }
    });

    recordsBody.appendChild(row);
  });
}

async function loadRegistros() {
  const data = await api('/api/registros-base', { method: 'GET' });
  currentRegistros = data.registros || [];
  renderRegistros();
}

async function showWelcome(user) {
  authCard.classList.add('hidden');
  welcomeCard.classList.remove('hidden');
  const empresaTexto = user.empresa_nombre ? `Empresa: ${user.empresa_nombre}.` : 'Sin empresa asignada.';
  welcomeText.textContent = `Sesión iniciada como ${user.email}. ${empresaTexto}`;
  await loadRegistros();
}

function showAuth() {
  welcomeCard.classList.add('hidden');
  authCard.classList.remove('hidden');
}

async function checkSession() {
  if (!token()) {
    showAuth();
    return;
  }

  try {
    const data = await api('/api/me', { method: 'GET' });
    await showWelcome(data.user);
  } catch {
    setToken(null);
    showAuth();
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(authForm);
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(data.access_token);
    await showWelcome(data.user);
    setMessage('');
    authForm.reset();
  } catch (error) {
    setMessage(error.message, true);
  }
});

addRecordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(addRecordForm);
  const body = Object.fromEntries(formData.entries());

  try {
    await api('/api/registros-base', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    setRecordsMessage('Registro agregado correctamente.');
    addRecordForm.reset();
    await loadRegistros();
  } catch (error) {
    setRecordsMessage(error.message, true);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } finally {
    setToken(null);
    showAuth();
  }
});

initTheme();
checkSession();
