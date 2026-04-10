const API_BASE_URL = window.__API_BASE_URL__ || 'https://dashboard-online-be.onrender.com';
const TOKEN_KEY = 'app_access_token';

const authCard = document.getElementById('auth-card');
const welcomeCard = document.getElementById('welcome-card');
const authForm = document.getElementById('auth-form');
const message = document.getElementById('message');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');

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
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(data.access_token);
    showWelcome(data.user);
    setMessage('');
    authForm.reset();
  } catch (error) {
    setMessage(error.message, true);
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

checkSession();
