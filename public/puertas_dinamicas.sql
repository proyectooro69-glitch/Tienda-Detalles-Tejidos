-- ============================================================
-- Dtalles Tejidos · Puertas dinámicas (ejecutar en Supabase > SQL Editor)
-- ============================================================

-- 1) Tabla de puertas nuevas (las 4 originales siguen en el código)
create table if not exists public.secciones (
  slug       text primary key,
  nombre     text not null,
  emoji      text default '🧶',
  orden      int  default 0,
  created_at timestamptz default now()
);

-- 2) Subsecciones de cualquier puerta (incluye las nuevas)
create table if not exists public.subsecciones (
  id         bigint generated always as identity primary key,
  seccion    text not null,
  slug       text not null,
  nombre     text not null,
  emoji      text default '🔹',
  orden      int  default 0,
  created_at timestamptz default now(),
  unique (seccion, slug)
);

alter table public.secciones    enable row level security;
alter table public.subsecciones enable row level security;

-- 3) Políticas. Mismo modelo que usa hoy el admin (clave anon desde el navegador).
--    OJO: esto deja escribir a cualquiera que tenga la clave anon; ver nota de seguridad.
do $$
declare t text;
begin
  foreach t in array array['secciones','subsecciones'] loop
    execute format('drop policy if exists "dt_%1$s_select" on public.%1$s', t);
    execute format('drop policy if exists "dt_%1$s_insert" on public.%1$s', t);
    execute format('drop policy if exists "dt_%1$s_update" on public.%1$s', t);
    execute format('drop policy if exists "dt_%1$s_delete" on public.%1$s', t);
    execute format('create policy "dt_%1$s_select" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('create policy "dt_%1$s_insert" on public.%1$s for insert to anon, authenticated with check (true)', t);
    execute format('create policy "dt_%1$s_update" on public.%1$s for update to anon, authenticated using (true) with check (true)', t);
    execute format('create policy "dt_%1$s_delete" on public.%1$s for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- 4) Las tablas que ya tenías solo se usaban con PATCH/POST parcial.
--    Crear y borrar puertas necesita INSERT y DELETE en estas dos:
do $$
declare t text;
begin
  foreach t in array array['configuracion_tienda','portadas_secciones'] loop
    execute format('drop policy if exists "dt_%1$s_insert" on public.%1$s', t);
    execute format('drop policy if exists "dt_%1$s_delete" on public.%1$s', t);
    execute format('create policy "dt_%1$s_insert" on public.%1$s for insert to anon, authenticated with check (true)', t);
    execute format('create policy "dt_%1$s_delete" on public.%1$s for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- 5) Comprobación: si alguna tabla limita 'seccion' a 4 valores (CHECK o enum),
--    las puertas nuevas fallarán al guardar productos. Mira si aparece algo:
select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as regla
from pg_constraint
where conrelid in ('public.productos'::regclass,
                   'public.configuracion_tienda'::regclass,
                   'public.portadas_secciones'::regclass)
  and contype = 'c';
-- Si sale una regla que menciona infancia/mujer/hombre/hogar, elimínala con:
--   alter table public.productos drop constraint <nombre_de_conname>;
