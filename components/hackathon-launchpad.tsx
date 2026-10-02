'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2Icon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  BellIcon,
  DatabaseIcon,
  LayersIcon,
  TerminalIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface HackathonLaunchpadProps {
  isDemo: boolean;
  supabaseConfigured: boolean;
}

const STARTER_PROMPT = `Nasz temat na hackathonie to: [WSTAW TEMAT PROJEKTU].
Główny problem użytkownika: [OPISZ W 1 ZDANIU PROBLEM].

Działasz ściśle według wytycznych z GEMINI.md oraz ARCHITECTURE.md.
Zrealizuj pierwsze zadanie:
1. Zdefiniuj encje w types/ oraz zaktualizuj mock/demo-data.ts i supabase/schema.sql
2. Zbuduj główny pulpit z 3 kafelkami KPI oraz formularzem zawierającym przycisk [✨ Wypełnij przykładowe dane]
3. Dodaj Server Action w app/actions/ z powiadomieniami sonner toast i revalidatePath
Pamiętaj: ZERO autentykacji, pełna odporność na brak sieci, async await params.`;

export function HackathonLaunchpad({ isDemo, supabaseConfigured }: HackathonLaunchpadProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(STARTER_PROMPT);
      setCopied(true);
      toast.success('Skopiowano prompt startowy do schowka!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Nie udało się skopiować automatycznie. Zaznacz i skopiuj tekst ręcznie.');
    }
  };

  const handleTestToast = () => {
    toast.success('Powiadomienia Sonner działają bezbłędnie!', {
      description: 'System powiadomień UI/UX jest gotowy do prezentacji przed jury.',
    });
  };

  return (
    <div className="space-y-8">
      {/* BANER STATUSU */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                Środowisko Gotowe do Startu
              </Badge>
              {isDemo && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                  Aktywny tryb ?demo=true (wymuszony mock)
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Czysty Szablon Hackathonowy (24h)
            </h2>
            <p className="text-sm text-muted-foreground">
              Wszystkie fundamenty architektoniczne, komponenty shadcn/ui oraz silnik offline są zainstalowane i przetestowane.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestToast}
              className="gap-1.5 text-xs"
            >
              <BellIcon className="size-3.5" />
              Test Toast (Sonner)
            </Button>

            {isDemo ? (
              <Button variant="secondary" size="sm" asChild className="text-xs">
                <Link href="/?demo=false">
                  Wyłącz tryb demo
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link href="/?demo=true">
                  Wymuś tryb ?demo=true
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CHECKLISTA KOMPONENTÓW SILNIKA */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Framework & SSR</span>
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">Next.js 16 (App Router)</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Turbopack, async <code className="font-mono text-[11px]">params</code>, brak błędów hydracji.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Interfejs Użytkownika</span>
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">20 Komponentów shadcn</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Zainstalowane w <code className="font-mono text-[11px]">@/components/ui</code>, Tailwind v4.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Baza Danych</span>
              <DatabaseIcon className="size-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {supabaseConfigured ? 'Supabase Połączone' : 'Supabase (Mock Ready)'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {supabaseConfigured
                ? 'Klucze .env aktywne, anon access RLS.'
                : 'Brak env — automatyczny fallback na mocki.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Niezawodność Demo</span>
              <ShieldCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">Awaryjne proxy.ts</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Przełącznik <code className="font-mono text-[11px]">?demo=true</code> z obsługą cookies.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PROMPT STARTER DLA AGENTA */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <TerminalIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Prompt startowy dla Agenta Antigravity
                </CardTitle>
                <CardDescription className="text-xs">
                  Gdy poznacie temat hackathonu, wklej poniższy prompt w okno rozmowy z agentem:
                </CardDescription>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleCopyPrompt}
              className="gap-1.5 font-medium shadow-xs"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5" />
                  Skopiowano!
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  Kopiuj prompt
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground select-all">
            <pre className="whitespace-pre-wrap">{STARTER_PROMPT}</pre>
          </div>
        </CardContent>
      </Card>

      {/* INSTRUKCJA SZYBKIEGO WDROŻENIA */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <SparklesIcon className="size-4 text-amber-500" />
              Zasady Prezentacji przed Jury (2-3 min)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              • <strong>Brak logowania:</strong> Nie trać czasu jury na formularze rejestracji.
            </p>
            <p>
              • <strong>Przycisk demo:</strong> Zawsze dodawaj w głównym formularzu przycisk wypełniający przykładowe dane.
            </p>
            <p>
              • <strong>3 metryki KPI:</strong> Jury zapamiętuje liczby (np. czas, oszczędność, skuteczność).
            </p>
            <p>
              • <strong>Plan B:</strong> Sprawdź dokument <code className="font-semibold text-foreground">DEMO_SPEC_TEMPLATE.md</code> w repozytorium.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LayersIcon className="size-4 text-primary" />
              Gdzie znajduje się dokumentacja?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              • <code className="font-semibold text-foreground">GEMINI.md</code> — reguły architektoniczne dla agenta.
            </p>
            <p>
              • <code className="font-semibold text-foreground">ARCHITECTURE.md</code> — wzorce kodu i struktura folderów.
            </p>
            <p>
              • <code className="font-semibold text-foreground">TASK_TEMPLATE.md</code> — szablon zlecania zadań.
            </p>
            <p>
              • <code className="font-semibold text-foreground">supabase/schema.sql</code> — szablon tabeli i polityk RLS.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
