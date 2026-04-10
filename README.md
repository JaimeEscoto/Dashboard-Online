# Dashboard Online (separado en Frontend + Backend)

Proyecto dividido en dos servicios para publicarlo fácilmente en Render:

- `backend/`: API con Node.js + Express + Supabase Auth.
- `frontend/`: cliente web (HTML/CSS/JS) servido por Express.

## Estructura

```text
.
├── backend/
│   ├── src/server.js
│   ├── package.json
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
- `SUPABASE_ANON_KEY`
- `PORT` (por defecto `3000`)
- `FRONTEND_ORIGIN` (por defecto `http://localhost:5173`)


### Usuario inicial y script SQL

En `backend/sql/seed_users.sql` tienes un script para crear/actualizar usuarios de Supabase Auth.

Incluye por defecto:

- email: `araujo@a.com`
- password: `araujo123`

También se agregó un mini manual de despliegue y conexión Render + Supabase en:

- `backend/MINIMANUAL_RENDER_SUPABASE.md`

### Ejecutar backend

```bash
npm install --prefix backend
npm run dev --prefix backend
```

API disponible en `http://localhost:3000`.

Endpoints:

- `POST /api/register`
- `POST /api/login`
- `GET /api/me` (Bearer token)
- `POST /api/logout`
- `GET /health`

## 2) Frontend

### Variables de entorno

Crea `frontend/.env` basado en `frontend/.env.example`.

### Configurar URL del backend

En `frontend/public/app.js`, cambia `API_BASE_URL` si tu backend corre en otra URL (por ejemplo Render).

### Ejecutar frontend

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Frontend en `http://localhost:5173`.

## 3) Deploy en Render

### Servicio Backend (Web Service)

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FRONTEND_ORIGIN`

### Servicio Frontend (Web Service)

- Root Directory: `frontend`
- Build Command: `npm install`
- Start Command: `npm start`

Luego actualiza `API_BASE_URL` en `frontend/public/app.js` con la URL pública del backend en Render.
