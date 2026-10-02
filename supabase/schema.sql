-- ==============================================================================
-- SUPABASE SCHEMA TEMPLATE
-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor po zdefiniowaniu tabel
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- PRZYKŁADOWA TABELA STARTOWA (dostosuj nazwę i kolumny po ogłoszeniu tematu)
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  value numeric(12, 2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- BEZPIECZEŃSTWO & RLS
-- RLS jest WŁĄCZONE, a anonimowy użytkownik ma pełne uprawnienia bez logowania.
-- Zapewnia to działanie zapytań z kluczem anon bez blokad i bez cichego zwracania [].
-- ==============================================================================

alter table public.records enable row level security;

drop policy if exists "anon_all_access" on public.records;
create policy "anon_all_access" on public.records
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "authenticated_all_access" on public.records;
create policy "authenticated_all_access" on public.records
  for all
  to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.records to anon, authenticated;
