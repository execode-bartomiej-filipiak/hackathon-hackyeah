import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { INITIAL_DEMO_DATA } from '@/mock/demo-data';
import type { RecordItem } from '@/types/record';

export async function getRecords(): Promise<{ data: RecordItem[]; source: 'db' | 'mock' }> {
  if (await isDemoMode()) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }

  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(3000));

    if (error || !data) {
      console.warn('[getRecords] Błąd Supabase, aktywowano fallback:', error?.message);
      return { data: INITIAL_DEMO_DATA, source: 'mock' };
    }

    return { data: data as RecordItem[], source: 'db' };
  } catch (err) {
    console.warn('[getRecords] Timeout/wyjątek, aktywowano fallback:', err);
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }
}
