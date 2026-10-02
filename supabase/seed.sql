-- ==============================================================================
-- SEED DATA: Idempotentne rekordy demonstracyjne pod prezentację dla jury
-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor (po wykonaniu schema.sql)
-- ==============================================================================

insert into public.items (id, title, category, value, status, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Automatyczna weryfikacja danych wejściowych',
    'Diagnostyka',
    12500.00,
    'done',
    '2026-10-02T10:00:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Optymalizacja zużycia energii w węźle A3',
    'Ekologia',
    8400.00,
    'done',
    '2026-10-02T11:30:00Z'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Analiza predykcyjna drgań pompy głównej',
    'Prewencja',
    19800.00,
    'in_progress',
    '2026-10-02T14:15:00Z'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Kompensacja mocy biernej na linii montażowej',
    'Infrastruktura',
    6200.00,
    'new',
    '2026-10-02T16:45:00Z'
  )
on conflict (id) do nothing;
