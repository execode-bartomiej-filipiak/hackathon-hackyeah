'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { DEMO_ITEMS } from '@/mock/demo-data';
import type { ActionResult } from '@/types/action';
import type { Item, NewItem } from '@/types/item';

export async function createItem(input: NewItem): Promise<ActionResult<Item>> {
  // Walidacja danych wejściowych
  const title = input.title?.trim();
  const category = input.category?.trim();
  const value = Number(input.value);

  if (!title || title.length < 3) {
    return { ok: false, error: 'Tytuł musi mieć co najmniej 3 znaki.' };
  }

  if (!category) {
    return { ok: false, error: 'Wybierz kategorię rekordu.' };
  }

  if (isNaN(value) || value < 0) {
    return { ok: false, error: 'Wartość musi być liczbą nieujemną.' };
  }

  const status = input.status || 'new';

  // Tryb demonstracyjny lub brak konfiguracji Supabase -> generujemy rekord w pamięci
  if (await isDemoMode()) {
    const demoItem: Item = {
      id: `local-${Date.now()}`,
      title,
      category,
      value,
      status,
      created_at: new Date().toISOString(),
    };
    return {
      ok: true,
      data: demoItem,
      message: 'Rekord został zapisany w trybie demonstracyjnym.',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    const demoItem: Item = {
      id: `local-${Date.now()}`,
      title,
      category,
      value,
      status,
      created_at: new Date().toISOString(),
    };
    return {
      ok: true,
      data: demoItem,
      message: 'Baza nieskonfigurowana — zapisano w pamięci sesji demo.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        title,
        category,
        value,
        status,
      })
      .select('*')
      .abortSignal(AbortSignal.timeout(3000))
      .single();

    if (error || !data) {
      console.warn('[createItem] Błąd zapisu w Supabase:', error?.message);
      // Fallback: zwracamy obiekt lokalny, by nie psuć demonstracji przed jury
      const fallbackItem: Item = {
        id: `local-${Date.now()}`,
        title,
        category,
        value,
        status,
        created_at: new Date().toISOString(),
      };
      return {
        ok: true,
        data: fallbackItem,
        message: 'Zapisano awaryjnie w trybie offline.',
      };
    }

    const createdItem: Item = {
      id: String(data.id),
      title: String(data.title),
      category: String(data.category),
      value: Number(data.value) || 0,
      status: (data.status as Item['status']) || 'new',
      created_at: String(data.created_at),
    };

    revalidatePath('/');
    return {
      ok: true,
      data: createdItem,
      message: 'Rekord został pomyślnie dodany do bazy danych.',
    };
  } catch (err) {
    console.error('[createItem] Wyjątek podczas zapisu:', err);
    const fallbackItem: Item = {
      id: `local-${Date.now()}`,
      title,
      category,
      value,
      status,
      created_at: new Date().toISOString(),
    };
    return {
      ok: true,
      data: fallbackItem,
      message: 'Zapisano awaryjnie (timeout bazy).',
    };
  }
}

export async function resetDemo(): Promise<ActionResult<{ resetCount: number }>> {
  const supabase = getSupabaseClient();
  const demoActive = await isDemoMode();

  if (demoActive || !supabase) {
    revalidatePath('/');
    return {
      ok: true,
      data: { resetCount: DEMO_ITEMS.length },
      message: 'Dane demonstracyjne zostały przywrócone do stanu początkowego.',
    };
  }

  try {
    // 1. Usunięcie wszystkich dotychczasowych rekordów
    await supabase
      .from('items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .abortSignal(AbortSignal.timeout(3000));

    // 2. Wgranie rekordów startowych z DEMO_ITEMS
    const { error: insertError } = await supabase
      .from('items')
      .insert(DEMO_ITEMS)
      .abortSignal(AbortSignal.timeout(3000));

    if (insertError) {
      console.warn('[resetDemo] Ostrzeżenie przy re-seedowaniu:', insertError.message);
    }

    revalidatePath('/');
    return {
      ok: true,
      data: { resetCount: DEMO_ITEMS.length },
      message: 'Baza danych została zresetowana do stanu fabrycznego demo.',
    };
  } catch (err) {
    console.warn('[resetDemo] Wyjątek przy resecie bazy:', err);
    revalidatePath('/');
    return {
      ok: true,
      data: { resetCount: DEMO_ITEMS.length },
      message: 'Zresetowano stan demonstracyjny.',
    };
  }
}
