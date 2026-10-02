import { isDemoMode } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase';
import { HackathonLaunchpad } from '@/components/hackathon-launchpad';
import { Code2Icon } from 'lucide-react';

export default async function HomePage() {
  const isDemo = await isDemoMode();
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* GŁÓWNY NAGŁÓWEK */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Code2Icon className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight tracking-tight sm:text-base">
                Hackathon Workspace Starter
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Google Antigravity • Next.js 16 • shadcn/ui • Supabase
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <HackathonLaunchpad
          isDemo={isDemo}
          supabaseConfigured={supabaseConfigured}
        />
      </main>

      {/* STOPKA */}
      <footer className="border-t border-border bg-background/50 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Przygotowane na Hackathon (24h)</span>
          <span className="font-mono text-[11px]">
            Wymuszenie trybu offline: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">?demo=true</code>
          </span>
        </div>
      </footer>
    </div>
  );
}
