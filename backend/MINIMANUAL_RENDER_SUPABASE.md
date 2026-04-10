# Mini manual: conectar Backend en Render con Supabase

Este backend ya usa `@supabase/supabase-js` y espera variables de entorno.

## 1) Crear usuario inicial para login

1. Abre **Supabase > SQL Editor**.
2. Ejecuta el script:

```sql
-- archivo en este repo
backend/sql/seed_users.sql
```

Usuario inicial creado:

- **Email:** `araujo@a.com`
- **Password:** `araujo123`

> Si vuelves a correr el script, actualiza la contraseña de ese email y no duplica identidad.

---

## 2) Tomar credenciales de Supabase

En Supabase, ve a **Project Settings > API** y copia:

- `Project URL`  -> `SUPABASE_URL`
- `anon public key` -> `SUPABASE_ANON_KEY`

> Para este backend actual (login por `signInWithPassword`) usa la `anon key`.

---

## 3) Configurar servicio backend en Render

En Render crea (o edita) un **Web Service** con:

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Variables de entorno mínimas:

- `SUPABASE_URL=<tu_project_url>`
- `SUPABASE_ANON_KEY=<tu_anon_key>`
- `FRONTEND_ORIGIN=<url_publica_del_frontend>`
- `PORT` (Render normalmente la inyecta; opcional para local)

---

## 4) Verificar conexión backend <-> Supabase

1. Abre la URL pública del backend en Render:
   - `GET /health` debe responder `{ "status": "ok" }`.
2. Prueba login:

```bash
curl -X POST https://TU_BACKEND_RENDER/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"araujo@a.com","password":"araujo123"}'
```

Si responde `access_token`, la conexión está correcta y el frontend mostrará la pantalla de bienvenida tras iniciar sesión.

---

## 5) Notas de seguridad recomendadas

- No publiques las keys en repositorio.
- Usa variables de entorno en Render.
- Si cambias `FRONTEND_ORIGIN`, redeploy del backend.
- Para producción, rota passwords iniciales después del primer acceso.
