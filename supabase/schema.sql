-- ==============================================================================
-- SCHEMA: Tabela referencyjna dla projektu hackathonowego
-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor
-- ==============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  value numeric(12, 2) not null default 0,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

-- Indeksy dla szybkiego sortowania i filtrowania
create index if not exists idx_items_created_at on public.items (created_at desc);
create index if not exists idx_items_status on public.items (status);

-- ==============================================================================
-- BEZPIECZEŃSTWO & RLS
-- RLS jest włączone, ale polityka pozwala na pełny dostęp anonimowy bez uwierzytelniania.
-- Zapobiega to cichym błędom zwracania pustych tablic przez Supabase przy domyślnym RLS.
-- ==============================================================================

alter table public.items enable row level security;

drop policy if exists "anon_all_access" on public.items;
create policy "anon_all_access" on public.items
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "authenticated_all_access" on public.items;
create policy "authenticated_all_access" on public.items
  for all
  to authenticated
  using (true)
  with check (true);

-- Jawne uprawnienia dla ról anon i authenticated
grant usage on schema public to anon, authenticated;
grant all on public.items to anon, authenticated;
