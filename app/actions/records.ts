'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import type { ActionResult } from '@/types/action';
import type { CreateRecordInput, RecordItem } from '@/types/record';

export async function createRecord(
  input: CreateRecordInput
): Promise<ActionResult<RecordItem>> {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, error: 'Nazwa rekordu jest wymagana.' };
  }

  const newRecord: RecordItem = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category || 'Ogólne',
    value: Number(input.value) || 0,
    status: input.status || 'active',
    created_at: new Date().toISOString(),
  };

  if (await isDemoMode()) {
    revalidatePath('/');
    return {
      ok: true,
      data: newRecord,
      message: 'Rekord dodany lokalnie w trybie demo (?demo=true).',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    revalidatePath('/');
    return {
      ok: true,
      data: newRecord,
      message: 'Zapisano w trybie offline fallback (brak połączenia z bazą).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('records')
      .insert({
        id: newRecord.id,
        name: newRecord.name,
        category: newRecord.category,
        value: newRecord.value,
        status: newRecord.status,
        created_at: newRecord.created_at,
      })
      .select()
      .single();

    if (error) {
      console.error('[createRecord] Supabase insert error:', error);
      return { ok: false, error: `Błąd bazy danych: ${error.message}` };
    }

    revalidatePath('/');
    return {
      ok: true,
      data: data as RecordItem,
      message: 'Rekord został pomyślnie zapisany w bazie Supabase!',
    };
  } catch (err) {
    console.error('[createRecord] Exception:', err);
    return {
      ok: false,
      error: 'Wystąpił nieoczekiwany błąd podczas zapisu w Supabase.',
    };
  }
}
