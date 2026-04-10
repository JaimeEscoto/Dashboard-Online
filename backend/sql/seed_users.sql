-- =========================================================
-- Seed de usuarios para Supabase Auth
-- Ejecuta este script en el SQL Editor de Supabase.
-- =========================================================

-- Requiere pgcrypto para gen_random_uuid() y crypt()/gen_salt().
create extension if not exists pgcrypto;

-- Usuario inicial solicitado:
--   email: araujo@a.com
--   password: araujo123
with new_user as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmed_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'araujo@a.com',
    crypt('araujo123', gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now()
  )
  on conflict (email) do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = now(),
        confirmed_at = now(),
        updated_at = now()
  returning id, email
)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
select
  gen_random_uuid(),
  nu.id,
  jsonb_build_object('sub', nu.id::text, 'email', nu.email),
  'email',
  nu.email,
  now(),
  now(),
  now()
from new_user nu
where not exists (
  select 1
  from auth.identities i
  where i.provider = 'email'
    and i.provider_id = nu.email
);

-- Plantilla para crear más usuarios:
-- 1) duplica el bloque CTE cambiando email/password
-- 2) o usa Dashboard > Authentication > Users > Add user
