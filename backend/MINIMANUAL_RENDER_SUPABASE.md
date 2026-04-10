# Mini manual: conectar Backend en Render con Supabase

Este backend usa tabla propia `public.usuarios` con dos columnas: `correo` y `password` (hash).

## 1) Crear tabla y usuario inicial

1. Abre **Supabase > SQL Editor**.
2. Ejecuta el script:

```sql
backend/sql/supabase_login_setup.sql
```

Usuario inicial:

- **Correo:** `admin@dashboard.com`
- **Password:** `Admin12345!`

## 2) Credenciales de Supabase

En Supabase, ve a **Project Settings > API** y copia:

- `Project URL`  -> `SUPABASE_URL`
- `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY`

## 3) Configurar backend en Render

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Variables de entorno:

- `SUPABASE_URL=<tu_project_url>`
- `SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>`
- `FRONTEND_ORIGIN=<url_publica_del_frontend>`

## 4) Verificar login

```bash
curl -X POST https://TU_BACKEND_RENDER/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@dashboard.com","password":"Admin12345!"}'
```

Debe responder con `access_token`.
