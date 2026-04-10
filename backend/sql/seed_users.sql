-- =========================================================
-- Seed de usuarios para tabla public.usuarios
-- Ejecuta este script en Supabase SQL Editor.
-- =========================================================

insert into public.usuarios (correo, password)
values (
  'admin@dashboard.com',
  'pbkdf2$120000$b890e1cf3ddf36ef0dc8b212ec4246f8$3b0dc914c41ef7fd37600f8c28bdc162b4a0e56a03ca705bbd532121dd3e3af080575ccb214d424f8b62cfe6dab476e2a573bb5da4f122c8c250fad5b5a90f50'
)
on conflict (correo) do update
  set password = excluded.password;
