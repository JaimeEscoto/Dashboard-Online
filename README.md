# Dashboard Online (MVP)

Primera versión de un portal web con **Node.js + Express + Supabase**.

## Incluye

- Registro de usuario con correo y contraseña.
- Inicio de sesión con Supabase Auth.
- Página de bienvenida protegida por autenticación.
- Cierre de sesión.

## Requisitos

- Node.js 18+
- Un proyecto en Supabase con Auth habilitado

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

3. Completa en `.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORT` (opcional)

## Ejecutar

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Estructura

- `src/server.js`: servidor Express, rutas y validación de sesión.
- `views/login.ejs`: pantalla de login/registro.
- `views/welcome.ejs`: pantalla protegida de bienvenida.
- `public/styles.css`: estilos básicos.

## Próximos pasos sugeridos

1. Crear tabla en Supabase para capturar registros de usuario.
2. Agregar formulario de carga de datos.
3. Construir dashboard con métricas (por ejemplo con Chart.js o Recharts).
4. Implementar control de acceso por usuario y políticas RLS en Supabase.
