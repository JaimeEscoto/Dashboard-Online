-- =========================================================
-- MIGRACION INCREMENTAL
-- Extiende el esquema actual (public.usuarios) para soportar:
-- 1) Empresa por usuario
-- 2) Catalogo de empresas
-- 3) Registros base (editable) por empresa + anio + mes
--
-- Compatible con PostgreSQL / Supabase.
-- =========================================================

begin;

-- 1) TABLA DE EMPRESAS
create table if not exists public.empresas (
  id bigserial primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- 2) AGREGAR EMPRESA AL USUARIO
alter table public.usuarios
  add column if not exists empresa_id bigint;

-- Relacion usuarios -> empresas
alter table public.usuarios
  drop constraint if exists usuarios_empresa_id_fkey;

alter table public.usuarios
  add constraint usuarios_empresa_id_fkey
  foreign key (empresa_id)
  references public.empresas (id)
  on update cascade
  on delete set null;

create index if not exists idx_usuarios_empresa_id
  on public.usuarios (empresa_id);

-- 3) TABLA REGISTROS_BASE
create table if not exists public.registros_base (
  id bigserial primary key,
  empresa_id bigint not null,
  anio smallint not null check (anio between 2000 and 2100),
  mes smallint not null check (mes between 1 and 12),

  ventas numeric(14,2) not null check (ventas >= 0),
  costo_variable numeric(14,2) not null check (costo_variable >= 0),
  utilidad_bruta numeric(14,2) not null check (utilidad_bruta >= 0),
  costo_fijo numeric(14,2) not null check (costo_fijo >= 0),
  utilidad_neta numeric(14,2) not null,
  margen_neto numeric(5,2) not null check (margen_neto >= 0 and margen_neto <= 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint registros_base_empresa_id_fkey
    foreign key (empresa_id)
    references public.empresas (id)
    on update cascade
    on delete cascade,

  constraint uq_registros_base_empresa_anio_mes unique (empresa_id, anio, mes)
);

create index if not exists idx_registros_base_empresa_anio
  on public.registros_base (empresa_id, anio);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_registros_base_set_updated_at on public.registros_base;
create trigger trg_registros_base_set_updated_at
before update on public.registros_base
for each row
execute function public.set_updated_at();

-- =========================================================
-- DATOS BASE DE EJEMPLO (reorganizados con anio + mes)
-- Tabla original: Ago, Sep, Oct, Nov, Dic, En, Feb, Mar
-- Se carga una empresa demo y se asocia al usuario admin.
-- =========================================================

insert into public.empresas (nombre)
values ('Empresa Demo')
on conflict (nombre) do nothing;

update public.usuarios u
set empresa_id = e.id
from public.empresas e
where u.correo = 'admin@dashboard.com'
  and e.nombre = 'Empresa Demo';

insert into public.registros_base (
  empresa_id,
  anio,
  mes,
  ventas,
  costo_variable,
  utilidad_bruta,
  costo_fijo,
  utilidad_neta,
  margen_neto
)
select
  e.id,
  v.anio,
  v.mes,
  v.ventas,
  v.costo_variable,
  v.utilidad_bruta,
  v.costo_fijo,
  v.utilidad_neta,
  v.margen_neto
from public.empresas e
join (
  values
    (2024,  8, 320500.00, 144225.00, 176275.00, 54541.00, 121734.00, 38.00),
    (2024,  9, 426520.00, 191934.00, 234586.00, 54541.00, 180045.00, 42.00),
    (2024, 10, 284820.00, 128169.00, 156651.00, 54541.00, 102110.00, 36.00),
    (2024, 11, 267890.00, 120550.50, 147339.50, 54541.00,  92798.50, 35.00),
    (2024, 12, 359230.00, 161653.50, 197576.50, 54541.00, 143035.50, 40.00),
    (2025,  1, 526090.00, 236740.50, 289349.50, 54541.00, 234808.50, 45.00),
    (2025,  2, 313810.00, 141214.50, 172595.50, 54541.00, 118054.50, 38.00),
    (2025,  3, 368270.00, 165721.50, 202548.50, 54541.00, 148007.50, 40.00)
) as v(anio, mes, ventas, costo_variable, utilidad_bruta, costo_fijo, utilidad_neta, margen_neto)
  on true
where e.nombre = 'Empresa Demo'
on conflict (empresa_id, anio, mes) do update
set
  ventas = excluded.ventas,
  costo_variable = excluded.costo_variable,
  utilidad_bruta = excluded.utilidad_bruta,
  costo_fijo = excluded.costo_fijo,
  utilidad_neta = excluded.utilidad_neta,
  margen_neto = excluded.margen_neto,
  updated_at = now();

commit;
