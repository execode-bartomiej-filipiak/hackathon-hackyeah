import { getItems } from '@/lib/data/items';
import { ItemsBoard } from '@/components/dashboard/items-board';
import { DemoBadge } from '@/components/dashboard/demo-badge';
import { LayersIcon } from 'lucide-react';

export default async function HomePage() {
  const { items, source } = await getItems();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* GŁÓWNY PASEK APLIKACJI */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <LayersIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight sm:text-lg">
                QuickResolve AI
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Hackathon Demo Platform (24h)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DemoBadge source={source} />
          </div>
        </div>
      </header>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <ItemsBoard initialItems={items} />
      </main>

      {/* STOPKA DEMO DLA JURY */}
      <footer className="border-t border-border bg-background/50 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Hackathon 2026 • Przygotowane dla zespołu w Antigravity (Gemini)</span>
          <span className="font-mono text-[11px]">
            Wymuszenie trybu offline: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">?demo=true</code>
          </span>
        </div>
      </footer>
    </div>
  );
}
