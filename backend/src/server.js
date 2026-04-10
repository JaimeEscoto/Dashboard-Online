import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY) en el archivo .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const sessions = new Map();

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function hashPassword(password, salt, iterations = 120000) {
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash = '') {
  const [algorithm, iterations, salt, hash] = storedHash.split('$');

  if (algorithm !== 'pbkdf2' || !iterations || !salt || !hash) {
    return false;
  }

  const recalculated = hashPassword(password, salt, Number(iterations));
  return timingSafeEqual(recalculated, storedHash);
}

function createSession(email) {
  const accessToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;

  sessions.set(accessToken, {
    email,
    expiresAt
  });

  return {
    access_token: accessToken,
    expires_in: TOKEN_TTL_SECONDS,
    user: {
      email
    }
  };
}

function getSessionFromRequest(req) {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  return { token, session };
}

async function requireAuth(req, res, next) {
  const auth = getSessionFromRequest(req);

  if (!auth) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  req.auth = auth;
  return next();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('correo,password')
    .eq('correo', email.toLowerCase())
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'No se pudo validar el usuario' });
  }

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica correo y contraseña.' });
  }

  return res.json(createSession(user.correo));
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({
    user: {
      email: req.auth.session.email
    }
  });
});

app.post('/api/logout', requireAuth, (req, res) => {
  sessions.delete(req.auth.token);
  return res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Backend iniciado en http://localhost:${PORT}`);
});
