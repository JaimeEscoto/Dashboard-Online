import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables SUPABASE_URL y/o SUPABASE_ANON_KEY en el archivo .env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

async function requireAuth(req, res, next) {
  const token = req.cookies.sb_access_token;

  if (!token) {
    return res.redirect('/login');
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.clearCookie('sb_access_token');
    return res.redirect('/login');
  }

  req.user = user;
  return next();
}

app.get('/', async (req, res) => {
  const token = req.cookies.sb_access_token;

  if (!token) {
    return res.redirect('/login');
  }

  const {
    data: { user }
  } = await supabase.auth.getUser(token);

  if (!user) {
    res.clearCookie('sb_access_token');
    return res.redirect('/login');
  }

  return res.redirect('/welcome');
});

app.get('/login', (req, res) => {
  return res.render('login', {
    error: null,
    mode: 'login'
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session) {
    return res.status(401).render('login', {
      error: 'Credenciales inválidas. Verifica correo y contraseña.',
      mode: 'login'
    });
  }

  res.cookie('sb_access_token', data.session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: data.session.expires_in * 1000
  });

  return res.redirect('/welcome');
});

app.get('/register', (req, res) => {
  return res.render('login', {
    error: null,
    mode: 'register'
  });
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    return res.status(400).render('login', {
      error: error.message,
      mode: 'register'
    });
  }

  return res.render('login', {
    error: 'Cuenta creada. Si tienes confirmación por email, revísala antes de iniciar sesión.',
    mode: 'login'
  });
});

app.post('/logout', (req, res) => {
  res.clearCookie('sb_access_token');
  return res.redirect('/login');
});

app.get('/welcome', requireAuth, (req, res) => {
  return res.render('welcome', {
    user: req.user
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
