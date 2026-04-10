import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://dashboard-online-fe-2.onrender.com'
]);

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
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, FRONTEND_ORIGIN, ...FRONTEND_ORIGINS]);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT'],
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

function createSession(user) {
  const accessToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;

  sessions.set(accessToken, {
    email: user.email,
    empresaId: user.empresaId,
    empresaNombre: user.empresaNombre,
    expiresAt
  });

  return {
    access_token: accessToken,
    expires_in: TOKEN_TTL_SECONDS,
    user: {
      email: user.email,
      empresa_id: user.empresaId,
      empresa_nombre: user.empresaNombre
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

async function getUserByEmail(email) {
  return supabase
    .from('usuarios')
    .select('correo,password,empresa_id,empresas:empresa_id(id,nombre)')
    .eq('correo', email.toLowerCase())
    .maybeSingle();
}

function normalizeRegistroPayload(payload) {
  const anio = Number(payload.anio);
  const mes = Number(payload.mes);
  const ventas = Number(payload.ventas);
  const costoVariable = Number(payload.costo_variable);
  const utilidadBruta = Number(payload.utilidad_bruta);
  const costoFijo = Number(payload.costo_fijo);
  const utilidadNeta = Number(payload.utilidad_neta);
  const margenNeto = Number(payload.margen_neto);

  return {
    anio,
    mes,
    ventas,
    costo_variable: costoVariable,
    utilidad_bruta: utilidadBruta,
    costo_fijo: costoFijo,
    utilidad_neta: utilidadNeta,
    margen_neto: margenNeto
  };
}

function validateRegistroPayload(payload) {
  const required = ['anio', 'mes', 'ventas', 'costo_variable', 'utilidad_bruta', 'costo_fijo', 'utilidad_neta', 'margen_neto'];
  for (const key of required) {
    if (!Number.isFinite(payload[key])) {
      return `${key} debe ser numérico`;
    }
  }

  if (payload.anio < 2000 || payload.anio > 2100) {
    return 'anio debe estar entre 2000 y 2100';
  }
  if (payload.mes < 1 || payload.mes > 12) {
    return 'mes debe estar entre 1 y 12';
  }

  return null;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  const { data: user, error } = await getUserByEmail(email);

  if (error) {
    return res.status(500).json({ error: 'No se pudo validar el usuario' });
  }

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica correo y contraseña.' });
  }

  return res.json(createSession({
    email: user.correo,
    empresaId: user.empresa_id,
    empresaNombre: user.empresas?.nombre || null
  }));
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({
    user: {
      email: req.auth.session.email,
      empresa_id: req.auth.session.empresaId,
      empresa_nombre: req.auth.session.empresaNombre
    }
  });
});

app.get('/api/registros-base', requireAuth, async (req, res) => {
  const empresaId = req.auth.session.empresaId;

  if (!empresaId) {
    return res.status(400).json({ error: 'El usuario no tiene una empresa asociada' });
  }

  const { data, error } = await supabase
    .from('registros_base')
    .select('id,empresa_id,anio,mes,ventas,costo_variable,utilidad_bruta,costo_fijo,utilidad_neta,margen_neto,updated_at')
    .eq('empresa_id', empresaId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'No se pudieron consultar los registros' });
  }

  return res.json({
    empresa: {
      id: req.auth.session.empresaId,
      nombre: req.auth.session.empresaNombre
    },
    registros: data || []
  });
});

app.post('/api/registros-base', requireAuth, async (req, res) => {
  const empresaId = req.auth.session.empresaId;

  if (!empresaId) {
    return res.status(400).json({ error: 'El usuario no tiene una empresa asociada' });
  }

  const payload = normalizeRegistroPayload(req.body || {});
  const validationError = validateRegistroPayload(payload);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await supabase
    .from('registros_base')
    .insert({ empresa_id: empresaId, ...payload })
    .select('id,empresa_id,anio,mes,ventas,costo_variable,utilidad_bruta,costo_fijo,utilidad_neta,margen_neto,updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un registro para ese año y mes en tu empresa' });
    }
    return res.status(500).json({ error: 'No se pudo crear el registro' });
  }

  return res.status(201).json({ registro: data });
});

app.put('/api/registros-base/:id', requireAuth, async (req, res) => {
  const empresaId = req.auth.session.empresaId;
  const id = Number(req.params.id);

  if (!empresaId) {
    return res.status(400).json({ error: 'El usuario no tiene una empresa asociada' });
  }

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'El id del registro es inválido' });
  }

  const payload = normalizeRegistroPayload(req.body || {});
  const validationError = validateRegistroPayload(payload);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await supabase
    .from('registros_base')
    .update(payload)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select('id,empresa_id,anio,mes,ventas,costo_variable,utilidad_bruta,costo_fijo,utilidad_neta,margen_neto,updated_at')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otro registro con ese año y mes en tu empresa' });
    }
    return res.status(500).json({ error: 'No se pudo actualizar el registro' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Registro no encontrado para tu empresa' });
  }

  return res.json({ registro: data });
});

app.post('/api/logout', requireAuth, (req, res) => {
  sessions.delete(req.auth.token);
  return res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Backend iniciado en http://localhost:${PORT}`);
});
