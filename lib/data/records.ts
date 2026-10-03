import { getSupabaseClient } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';
import { INITIAL_DEMO_DATA } from '@/mock/demo-data';
import type { RecordItem } from '@/types/record';

export interface GetRecordsResult {
  data: RecordItem[];
  source: 'db' | 'mock';
  latencyMs?: number;
  projectHost?: string;
}

export async function getRecords(): Promise<GetRecordsResult> {
  if (await isDemoMode()) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }

  const supabase = getSupabaseClient();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectHost = rawUrl ? new URL(rawUrl).host : undefined;

  if (!supabase) {
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }

  try {
    const startTime = performance.now();
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(3000));

    const latencyMs = Math.round(performance.now() - startTime);

    if (error || !data) {
      console.warn('[getRecords] Błąd Supabase, aktywowano fallback:', error?.message);
      return { data: INITIAL_DEMO_DATA, source: 'mock' };
    }

    return {
      data: data as RecordItem[],
      source: 'db',
      latencyMs,
      projectHost,
    };
  } catch (err) {
    console.warn('[getRecords] Timeout/wyjątek, aktywowano fallback:', err);
    return { data: INITIAL_DEMO_DATA, source: 'mock' };
  }
}
