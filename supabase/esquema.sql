-- ═══════════════════════════════════════════════════════════════════════
-- Custovia — Esquema de base de datos (Fase 4)
--
-- CÓMO USARLO (una sola vez):
--   1. Entra a tu proyecto en https://supabase.com/dashboard
--   2. Menú lateral → SQL Editor → New query
--   3. Pega TODO este archivo y presiona RUN
--
-- Crea 3 tablas chicas (cabe de sobra en el plan gratuito):
--   abuelitos  → cada adulto mayor protegido, con su código de vinculación
--   familiares → quiénes reciben las alertas de cada abuelito
--   alertas    → cada alerta disparada (el historial de la familia)
-- y deja la tabla de alertas transmitiendo en tiempo real (Realtime).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────────────

create table if not exists public.abuelitos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Abuelito(a)',
  -- Código corto que el abuelito comparte con su familia para vincularse.
  codigo text not null unique,
  creado_en timestamptz not null default now()
);

create table if not exists public.familiares (
  id uuid primary key default gen_random_uuid(),
  abuelito_id uuid not null references public.abuelitos (id) on delete cascade,
  nombre text not null,
  -- Token de notificaciones push de Expo (puede faltar si usa Expo Go).
  push_token text,
  -- Sonido de alarma elegido por este familiar (clasica | sirena | campana).
  sonido text not null default 'clasica',
  creado_en timestamptz not null default now()
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  abuelito_id uuid not null references public.abuelitos (id) on delete cascade,
  -- 'rojo' = posible estafa · 'prueba' = botón de prueba de la familia
  nivel text not null default 'rojo',
  -- La frase corta que explica la sospecha (la genera el cerebro).
  motivo text not null,
  -- El fragmento de conversación que gatilló la alerta.
  fragmento text,
  falsa_alarma boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists alertas_por_abuelito
  on public.alertas (abuelito_id, creado_en desc);

-- ── Tiempo real ─────────────────────────────────────────────────────────
-- Deja la tabla de alertas emitiendo cada INSERT por Realtime, que es lo
-- que hace sonar la alarma en el teléfono del familiar al instante.

alter publication supabase_realtime add table public.alertas;

-- ── Seguridad (nivel MVP) ───────────────────────────────────────────────
-- Activamos RLS (obligatorio en Supabase) con políticas abiertas para la
-- clave "anon" que usa la app. Traducción: cualquiera que tenga tu clave
-- anon puede leer/escribir estas tablas. Para un prototipo con datos de
-- prueba está bien y nos ahorra todo el sistema de cuentas; antes de
-- lanzar de verdad se agrega Supabase Auth y políticas por usuario.

alter table public.abuelitos enable row level security;
alter table public.familiares enable row level security;
alter table public.alertas enable row level security;

create policy "mvp abuelitos" on public.abuelitos
  for all to anon using (true) with check (true);

create policy "mvp familiares" on public.familiares
  for all to anon using (true) with check (true);

create policy "mvp alertas" on public.alertas
  for all to anon using (true) with check (true);
