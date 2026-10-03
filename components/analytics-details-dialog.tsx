'use client';

import { useState } from 'react';
import type { CommuteAnalysis } from '@/types/commute';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  TrendingDownIcon,
  TrendingUpIcon,
  SparklesIcon,
  InfoIcon,
} from 'lucide-react';
import {
  CAR_COST_PER_KM_PLN,
  CAR_FUEL_CONSUMPTION_L_PER_100KM,
  COMMUTE_SCORE_BASE,
  COMMUTE_SCORE_FALL_PER_HOUR,
  COMMUTE_SCORE_FULL_HOURS,
  COMMUTE_SCORE_MAX,
  COMMUTE_SCORE_MIN,
  FUEL_PRICE_PLN_PER_LITER,
  MPK_TICKETS,
  getCo2FactorKgPerKm,
  getCommuteScore,
} from '@/lib/commute';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPln } from '@/lib/utils';

// Horyzonty oszczędności: tydzień → miesiąc (52 tyg. / 12 mies.) → rok (52 tyg.)
const HORIZONS = [
  { id: 'week', label: 'Tydzień', factor: 1, suffix: '/ tydz.' },
  { id: 'month', label: 'Miesiąc', factor: 52 / 12, suffix: '/ mies.' },
  { id: 'year', label: 'Rok', factor: 52, suffix: '/ rok' },
] as const;

type HorizonId = (typeof HORIZONS)[number]['id'];

// Przykładowa cena kawy na mieście — punkt odniesienia dla kosztu alternatywnego
const COFFEE_PRICE_PLN = 15;

// Dyskretna etykieta „Metodologia obliczeń” — szczegóły w tooltipie po najechaniu
function MethodologyHint({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors cursor-help shrink-0">
          <InfoIcon className="size-2.5 shrink-0" />
          Metodologia obliczeń
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="max-w-[380px] text-[11px] leading-relaxed whitespace-pre-line text-left"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

interface AnalyticsDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: CommuteAnalysis;
  homeBuildingName?: string;
  referenceBuildingName?: string;
}

export function AnalyticsDetailsDialog({
  open,
  onOpenChange,
  analysis,
  homeBuildingName,
  referenceBuildingName,
}: AnalyticsDetailsDialogProps) {
  const [horizonId, setHorizonId] = useState<HorizonId>('week');
  const horizon = HORIZONS.find((item) => item.id === horizonId) ?? HORIZONS[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const getScoreAssessment = (score: number) => {
    if (score >= 85) return 'Wybitna lokalizacja (idealny standard 15-minutowego miasta)';
    if (score >= 70) return 'Bardzo dobra dostępność komunikacyjna i niska uciążliwość dojazdów';
    if (score >= 50) return 'Przeciętna dostępność, zbalansowany czas podróży w skali tygodnia';
    return 'Podwyższona uciążliwość dojazdów względem standardów miejskich';
  };

  const comparison = analysis.comparisonToHome;
  const hasReference = Boolean(comparison?.hasReference);

  // Skrót taryf MPK do opisu metodologii
  const mpkTicketSummary = MPK_TICKETS.map(
    (ticket) =>
      `${ticket.maxMinutes === Infinity ? 'powyżej 60' : ticket.maxMinutes} min — ${formatPln(ticket.pricePln, 2)} zł`
  ).join(' · ');

  const scoreTooltip = [
    `NearBy Score: ${analysis.score} / 100 (${analysis.totalHoursPerWeek} h w drodze tygodniowo).`,
    `Wzór: ${COMMUTE_SCORE_BASE} − (godziny w drodze / ${COMMUTE_SCORE_FULL_HOURS}) × ${COMMUTE_SCORE_FALL_PER_HOUR}, przycięty do zakresu ${COMMUTE_SCORE_MIN}–${COMMUTE_SCORE_MAX} pkt.`,
    `Punkty orientacyjne: ${[3, 7, COMMUTE_SCORE_FULL_HOURS]
      .map((hours) => `${hours} h → ${getCommuteScore(hours)} pkt`)
      .join(' · ')}.`,
  ].join('\n');

  const timeTooltip = [
    `Czas w drodze: ${analysis.totalHoursPerWeek} h / tydzień.`,
    'Jedna wizyta liczona jest w obie strony (×2), a wynik tygodniowy to suma po wszystkich celach.',
    'Czas przejazdu szacowany jest dla krakowskich warunków szczytowych (komunikacja miejska, samochód, rower, spacer) na podstawie odległości drogowej.',
  ].join('\n');

  const co2Tooltip = [
    `Emisja: ${analysis.totalWeeklyCo2Kg} kg CO₂ / tydzień.`,
    'Bilans w obie strony (×2) dla każdej wizyty.',
    `Współczynniki: samochód ${getCo2FactorKgPerKm('driving')} kg/km, MPK ${getCo2FactorKgPerKm('transit')} kg/pkm, rower i spacer ${getCo2FactorKgPerKm('bicycling')} kg/km.`,
  ].join('\n');

  const costTooltip = [
    `Koszt dojazdów: ${formatPln(analysis.totalWeeklyCostPln, 0)} zł / tydzień.`,
    'Koszt jednego przejazdu liczymy w jedną stronę, a bilans tygodniowy mnożymy przez liczbę wizyt × 2 (dojazd i powrót).',
    `MPK Kraków (Strefa I+II+III, normalne): ${mpkTicketSummary}.`,
    `Samochód: ${formatPln(CAR_FUEL_CONSUMPTION_L_PER_100KM, 1)} l/100 km × ${formatPln(
      FUEL_PRICE_PLN_PER_LITER,
      2
    )} zł/l = ${formatPln(CAR_COST_PER_KM_PLN, 2)} zł/km × odległość drogowa.`,
    'Rower i spacer: 0,00 zł — transport zeroemisyjny.',
    'Odległość drogowa = dystans w linii prostej × 1,28 (krętość siatki ulic Krakowa).',
  ].join('\n');

  const formatValue = (value: number, decimals: number) =>
    decimals === 0 ? formatPln(value, 0) : value.toFixed(decimals);

  // Oszczędności tygodniowe względem obecnego miejsca zamieszkania
  const savedHoursWeekly = hasReference
    ? comparison?.savedHoursPerWeek ?? 0
    : analysis.weeklySavingsHours;
  const savedCostWeekly = hasReference
    ? comparison?.savedCostWeeklyPln ?? 0
    : analysis.weeklyCostSavingsVsCarPln;
  const savedCo2Weekly = hasReference ? comparison?.savedCo2Kg ?? 0 : analysis.weeklyCo2SavingsKg;

  // Fun facty: liczby przelozone na cos wyobrazalnego
  const yearlyHoursSaved = Math.abs(savedHoursWeekly) * 52;
  const yearlyCostSaved = Math.abs(savedCostWeekly) * 52;
  const yearlyCo2Saved = Math.abs(savedCo2Weekly) * 52;


  const headlineFact = {
    emoji: '🗓️',
    value: `${Math.round(yearlyHoursSaved / 24)} dni`,
    label: `wolnego w ciągu roku — tyle czasu odzyskujesz na dojazdach (${formatValue(
      yearlyHoursSaved,
      0
    )} h mniej w drodze)`,
  };

  const facts = [
    {
      emoji: '☕',
      value: `≈ ${Math.round(yearlyCostSaved / COFFEE_PRICE_PLN)} kaw`,
      label: `na mieście za roczną oszczędność ${formatPln(yearlyCostSaved, 0)} zł (po ${formatPln(
        COFFEE_PRICE_PLN,
        0
      )} zł)`,
    },
    {
      emoji: '🌳',
      value: `${analysis.treesEquivalentWeekly} drzew`,
      label: `równowartość CO₂, którego nie wyemitujesz (${Math.round(yearlyCo2Saved)} kg w roku)`,
    },
    {
      emoji: '⏱️',
      value: `${Math.round((analysis.totalHoursPerWeek * 60) / 7)} min`,
      label: 'dziennie w drodze z nowego mieszkania — mniej niż odcinek serialu',
    },
  ];

  // Zestawienie decyzyjne: obecne vs nowe miejsce zamieszkania (w wybranym horyzoncie)
  const homeHours = comparison?.homeHoursPerWeek ?? 0;
  const homeCost = comparison?.homeWeeklyCostPln ?? 0;
  const homeCo2 = comparison?.homeCo2Kg ?? 0;
  const homeScore = comparison?.homeScore ?? 0;

  const comparisonRows = [
    {
      id: 'score',
      label: 'NearBy Score',
      unit: 'pkt',
      decimals: 0,
      weeklyMetric: false,
      lowerIsBetter: false,
      current: homeScore,
      next: analysis.score,
    },
    {
      id: 'hours',
      label: 'Czas w drodze',
      unit: 'h',
      decimals: 1,
      weeklyMetric: true,
      tooltip: timeTooltip,
      lowerIsBetter: true,
      current: homeHours,
      next: analysis.totalHoursPerWeek,
    },
    {
      id: 'cost',
      label: 'Koszt dojazdów',
      unit: 'zł',
      decimals: 0,
      weeklyMetric: true,
      tooltip: costTooltip,
      lowerIsBetter: true,
      current: homeCost,
      next: analysis.totalWeeklyCostPln,
    },
    {
      id: 'co2',
      label: 'Emisja CO₂',
      unit: 'kg',
      decimals: 1,
      weeklyMetric: true,
      tooltip: co2Tooltip,
      lowerIsBetter: true,
      current: homeCo2,
      next: analysis.totalWeeklyCo2Kg,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto font-sans p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-3">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <SparklesIcon className="size-4 text-amber-500 shrink-0" />
            Podsumowanie
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {homeBuildingName
              ? `Obecne miejsce zamieszkania: ${homeBuildingName}`
              : 'Zestawienie czasowe, środowiskowe i transportowe dla wybranego punktu w Krakowie.'}
            {referenceBuildingName && ` • Nowe miejsce zamieszkania: ${referenceBuildingName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* WYNIK OGÓLNY */}
          <div className="p-4 rounded-xl border border-border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <SparklesIcon className="size-3.5 text-primary" />
                NearBy Score
              </span>
              <MethodologyHint tooltip={scoreTooltip} />
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex flex-col items-center justify-center size-20 rounded-2xl border-2 ${getScoreColor(
                  analysis.score
                )} shadow-sm shrink-0`}
              >
                <span className="text-2xl font-black leading-none">{analysis.score}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 mt-1">
                  Score
                </span>
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-foreground">
                  {hasReference
                    ? `Ocena zmiany lokalizacji (${(comparison?.scoreDelta ?? 0) >= 0 ? '+' : ''}${comparison?.scoreDelta ?? 0} pkt vs obecne miejsce zamieszkania)`
                    : 'Ocena potencjału komunikacyjnego'}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hasReference
                    ? (comparison?.scoreDelta ?? 0) >= 0
                      ? `Nowe miejsce zamieszkania podnosi NearBy Score z ${comparison?.homeScore} do ${analysis.score} punktów.`
                      : `Nowe miejsce zamieszkania obniża NearBy Score z ${comparison?.homeScore} do ${analysis.score} punktów.`
                    : getScoreAssessment(analysis.score)}
                </p>
              </div>
            </div>
          </div>

          {/* ZESTAWIENIE DECYZYJNE: OBECNE vs NOWE MIEJSCE ZAMIESZKANIA */}
          {hasReference && comparison && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Obecne vs nowe miejsce zamieszkania
                </span>
                <div
                  role="tablist"
                  aria-label="Horyzont oszczędności"
                  className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-muted/50"
                >
                  {HORIZONS.map((item) => {
                    const isActive = horizonId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setHorizonId(item.id)}
                        className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${isActive
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <table className="w-full table-fixed text-[11px] tabular-nums">
                <colgroup>
                  <col />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[104px]" />
                </colgroup>
                <thead>
                  <tr className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                    <th className="text-left font-bold px-3.5 py-1.5">Wskaźnik</th>
                    <th className="text-right font-bold px-2 py-1.5">Obecne</th>
                    <th className="text-right font-bold px-2 py-1.5">Nowe</th>
                    <th className="text-right font-bold px-3.5 py-1.5">Zmiana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {comparisonRows.map((row) => {
                    const factor = row.weeklyMetric ? horizon.factor : 1;
                    const deltaScaled = (row.next - row.current) * factor;
                    const improves = row.lowerIsBetter ? deltaScaled <= 0 : deltaScaled >= 0;
                    return (
                      <tr key={row.id}>
                        <td className="px-3.5 py-2 text-muted-foreground">
                          <div>
                            {row.label}
                            {row.weeklyMetric && (
                              <span className="text-muted-foreground/70"> {horizon.suffix}</span>
                            )}
                          </div>
                          {row.tooltip && <MethodologyHint tooltip={row.tooltip} />}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {formatValue(row.current * factor, row.decimals)} {row.unit}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-foreground">
                          {formatValue(row.next * factor, row.decimals)} {row.unit}
                        </td>
                        <td
                          className={`px-3.5 py-2 text-right font-bold ${improves
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-500'
                            }`}
                        >
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {deltaScaled >= 0 ? (
                              <TrendingUpIcon className="size-3 shrink-0" />
                            ) : (
                              <TrendingDownIcon className="size-3 shrink-0" />
                            )}
                            {deltaScaled >= 0 ? '+' : '−'}
                            {formatValue(Math.abs(deltaScaled), row.decimals)} {row.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* KOSZT ALTERNATYWNY — NA CO PRZEKŁADAJĄ SIĘ TE OSZCZĘDNOŚCI */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SparklesIcon className="size-3 text-amber-500 shrink-0" />
                Koszt alternatywny — co zyskujesz
              </span>
              <span className="text-[10px] text-muted-foreground">
                obecne → nowe miejsce zamieszkania
              </span>
            </div>

            {/* NAJWAŻNIEJSZY ZYSK — WYSTAWIONY NA PIERWSZY PLAN */}
            <div className="px-3.5 py-4 flex flex-col items-center text-center gap-1.5 bg-primary/[0.04]">
              <span className="text-3xl leading-none">{headlineFact.emoji}</span>
              <div className="text-3xl font-black text-primary tabular-nums leading-none">
                {headlineFact.value}
              </div>
              <div className="text-[10px] text-muted-foreground leading-snug max-w-[440px]">
                {headlineFact.label}
              </div>
            </div>

            {/* POZOSTAŁE ZYSKI — PAS W TRZECH KOLUMNACH */}
            <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60">
              {facts.map((fact) => (
                <div key={fact.label} className="px-2.5 py-3 text-center space-y-1.5">
                  <div className="text-lg leading-none">{fact.emoji}</div>
                  <div className="text-sm font-black text-foreground tabular-nums leading-none">
                    {fact.value}
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-snug">{fact.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs font-medium"
          >
            Zamknij raport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
