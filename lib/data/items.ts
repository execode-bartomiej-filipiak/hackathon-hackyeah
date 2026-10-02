import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { DEMO_ITEMS } from '@/mock/demo-data';
import type { Item } from '@/types/item';

export async function getItems(): Promise<{ items: Item[]; source: 'db' | 'mock' }> {
  if (await isDemoMode()) {
    return { items: DEMO_ITEMS, source: 'mock' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { items: DEMO_ITEMS, source: 'mock' };
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(3000));

    if (error || !data) {
      console.warn('[getItems] Błąd Supabase, aktywowano fallback:', error?.message);
      return { items: DEMO_ITEMS, source: 'mock' };
    }

    // Mapowanie wartości numerycznych na liczbę JS
    const items: Item[] = data.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      category: String(row.category),
      value: Number(row.value) || 0,
      status: (row.status as Item['status']) || 'new',
      created_at: String(row.created_at),
    }));

    return { items, source: 'db' };
  } catch (err) {
    console.warn('[getItems] Wyjątek/timeout podczas zapytania, aktywowano fallback:', err);
    return { items: DEMO_ITEMS, source: 'mock' };
  }
}

export async function getItem(id: string): Promise<{ item: Item | null; source: 'db' | 'mock' }> {
  if (await isDemoMode()) {
    const item = DEMO_ITEMS.find((it) => it.id === id) ?? null;
    return { item, source: 'mock' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    const item = DEMO_ITEMS.find((it) => it.id === id) ?? null;
    return { item, source: 'mock' };
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .abortSignal(AbortSignal.timeout(3000))
      .maybeSingle();

    if (error || !data) {
      const mockItem = DEMO_ITEMS.find((it) => it.id === id) ?? null;
      return { item: mockItem, source: 'mock' };
    }

    const item: Item = {
      id: String(data.id),
      title: String(data.title),
      category: String(data.category),
      value: Number(data.value) || 0,
      status: (data.status as Item['status']) || 'new',
      created_at: String(data.created_at),
    };

    return { item, source: 'db' };
  } catch (err) {
    console.warn('[getItem] Błąd/timeout dla id:', id, err);
    const mockItem = DEMO_ITEMS.find((it) => it.id === id) ?? null;
    return { item: mockItem, source: 'mock' };
  }
}
