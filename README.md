# Dashboard Online (separado en Frontend + Backend)

Proyecto dividido en dos servicios para publicarlo fácilmente en Render:

- `backend/`: API con Node.js + Express + tabla `public.usuarios` en Supabase.
- `frontend/`: cliente web (HTML/CSS/JS) servido por Express.

## Estructura

```text
.
├── backend/
│   ├── src/server.js
│   ├── package.json
│   ├── sql/supabase_login_setup.sql
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── package.json
```

## 1) Backend

### Variables de entorno

Crea `backend/.env` basado en `backend/.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recomendado)
- `SUPABASE_ANON_KEY` (solo fallback)
- `PORT` (por defecto `3000`)
- `FRONTEND_ORIGIN` (por defecto `http://localhost:5173`)

### Crear tabla y usuario inicial

En `backend/sql/supabase_login_setup.sql` tienes el SQL para:

- borrar usuarios previos de este flujo (`drop table if exists public.usuarios`)
- crear tabla `public.usuarios(correo, password)`
- insertar usuario genérico:
  - correo: `admin@dashboard.com`
  - password: `Admin12345!`

### Ejecutar backend

```bash
npm install --prefix backend
npm run dev --prefix backend
```

API disponible en `http://localhost:3000`.

Endpoints:

- `POST /api/login`
- `GET /api/me` (Bearer token)
- `POST /api/logout`
- `GET /health`

## 2) Frontend

### Variables de entorno

Crea `frontend/.env` basado en `frontend/.env.example`.

### Configurar URL del backend

El frontend toma `API_BASE_URL` desde `frontend/.env` (inyectado por `frontend/server.js`).

Si no se define, usa por defecto: `https://dashboard-online-be.onrender.com`.

### Ejecutar frontend

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Frontend en `http://localhost:5173`.
