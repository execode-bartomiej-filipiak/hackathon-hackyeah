'use client';

import { Badge } from '@/components/ui/badge';
import { DatabaseIcon, SparklesIcon } from 'lucide-react';

interface DemoBadgeProps {
  source: 'db' | 'mock';
}

export function DemoBadge({ source }: DemoBadgeProps) {
  if (source === 'db') {
    return (
      <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <DatabaseIcon className="size-3" />
        Połączono z bazą (Supabase)
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <SparklesIcon className="size-3 text-amber-600 dark:text-amber-400" />
      Tryb Demo (Offline Mock)
    </Badge>
  );
}
