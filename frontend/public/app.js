const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:3000';
const TOKEN_KEY = 'sb_access_token';

const authCard = document.getElementById('auth-card');
const welcomeCard = document.getElementById('welcome-card');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const toggleModeBtn = document.getElementById('toggle-mode');
const authForm = document.getElementById('auth-form');
const message = document.getElementById('message');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');
const submitBtn = document.getElementById('submit-btn');

let mode = 'login';

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

function setMode(nextMode) {
  mode = nextMode;
  if (mode === 'login') {
    authTitle.textContent = 'Iniciar sesión';
    authSubtitle.textContent = 'Accede a tu portal.';
    submitBtn.textContent = 'Entrar';
    toggleModeBtn.textContent = '¿No tienes cuenta? Regístrate';
  } else {
    authTitle.textContent = 'Crear cuenta';
    authSubtitle.textContent = 'Regístrate para empezar.';
    submitBtn.textContent = 'Registrarme';
    toggleModeBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
  }
  setMessage('');
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

function showWelcome(user) {
  authCard.classList.add('hidden');
  welcomeCard.classList.remove('hidden');
  welcomeText.textContent = `Sesión iniciada como ${user.email}.`;
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
    showWelcome(data.user);
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
    if (mode === 'login') {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(data.access_token);
      showWelcome(data.user);
      setMessage('');
      authForm.reset();
    } else {
      const data = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setMessage(data.message, false);
      setMode('login');
      authForm.reset();
    }
  } catch (error) {
    setMessage(error.message, true);
  }
});

toggleModeBtn.addEventListener('click', () => {
  setMode(mode === 'login' ? 'register' : 'login');
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } finally {
    setToken(null);
    showAuth();
    setMode('login');
  }
});

setMode('login');
checkSession();
