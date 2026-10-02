-- ==============================================================================
-- SUPABASE SEED DATA TEMPLATE
-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor (po wykonaniu schema.sql)
-- Zapewnia idempotentne wgranie rekordów początkowych zgodnych z mock/demo-data.ts
-- ==============================================================================

insert into public.records (id, name, category, value, status, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Przykładowy rekord #1',
    'Ogólne',
    12000.00,
    'completed',
    '2026-10-02T10:00:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Przykładowy rekord #2',
    'Priorytet',
    8500.00,
    'active',
    '2026-10-02T12:00:00Z'
  )
on conflict (id) do nothing;
