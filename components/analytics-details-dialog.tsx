'use client';

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
  ClockIcon,
  LeafIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  SparklesIcon,
  CheckCircle2Icon,
  WalletIcon,
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
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const comparison = analysis.comparisonToHome;

  // Skrót taryf MPK do opisów metodologii
  const mpkTicketSummary = MPK_TICKETS.map(
    (ticket) =>
      `${ticket.maxMinutes === Infinity ? 'powyżej 60' : ticket.maxMinutes} min — ${formatPln(ticket.pricePln, 2)} zł`
  ).join(' · ');

  const scoreTooltip = [
    `CommuteScore: ${analysis.score} / 100 (${analysis.totalHoursPerWeek} h w drodze tygodniowo).`,
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

  const getScoreAssessment = (score: number) => {
    if (score >= 85) return 'Wybitna lokalizacja (idealny standard 15-minutowego miasta)';
    if (score >= 70) return 'Bardzo dobra dostępność komunikacyjna i niska uciążliwość dojazdów';
    if (score >= 50) return 'Przeciętna dostępność, zbalansowany czas podróży w skali tygodnia';
    return 'Podwyższona uciążliwość dojazdów względem standardów miejskich';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[88vh] overflow-y-auto font-sans p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <SparklesIcon className="size-3.5 text-amber-500" />
            <span>Raport Mobilności & Ekologii 3D</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Szczegółowa analityka dojazdów miejskich
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {homeBuildingName
              ? `Obecne miejsce zamieszkania: ${homeBuildingName}`
              : 'Zestawienie czasowe, środowiskowe i transportowe dla wybranego punktu w Krakowie.'}
            {referenceBuildingName && ` • Nowe miejsce zamieszkania: ${referenceBuildingName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* GŁÓWNY WYNIK COMMUTE SCORE */}
          <div className="p-4 rounded-xl border border-border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <SparklesIcon className="size-3.5 text-primary" />
                CommuteScore
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
                {analysis.comparisonToHome && analysis.comparisonToHome.hasReference
                  ? `Ocena zmiany lokalizacji (${analysis.comparisonToHome.scoreDelta >= 0 ? '+' : ''}${analysis.comparisonToHome.scoreDelta} pkt vs obecne mieszkanie)`
                  : 'Ocena potencjału komunikacyjnego'}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysis.comparisonToHome && analysis.comparisonToHome.hasReference
                  ? analysis.comparisonToHome.scoreDelta >= 0
                    ? `Wybór tej lokalizacji podnosi Twój CommuteScore z ${analysis.comparisonToHome.homeScore} do ${analysis.score} punktów, znacząco redukując czas spędzany w korkach.`
                    : `Ta lokalizacja obniża Twój CommuteScore z ${analysis.comparisonToHome.homeScore} do ${analysis.score} punktów ze względu na większą odległość od Twoich stałych celów.`
                  : getScoreAssessment(analysis.score)}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                <CheckCircle2Icon className="size-3.5 shrink-0" />
                <span>Wyliczone na podstawie realnych tras i prędkości ruchu w Krakowie</span>
              </div>
            </div>
            </div>
          </div>

          {/* DWA KAFELKI KPI: CZAS I ŚRODOWISKO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* KARTA CZASU */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-primary" />
                  Budżet czasowy
                </span>
                <MethodologyHint tooltip={timeTooltip} />
              </div>

              <div className="w-fit text-2xl font-bold tracking-tight text-foreground">
                {analysis.totalHoursPerWeek} h
                <span className="text-xs font-normal text-muted-foreground ml-1">/ tydzień</span>
              </div>

              <p className="text-[10px] text-muted-foreground leading-snug">
                Każda wizyta liczona jest w obie strony (dojazd + powrót), czyli podany czas jednorazowy
                mnożymy przez liczbę wizyt w tygodniu i przez 2.
              </p>

              <div className="pt-2 border-t border-border/50 text-[11px] space-y-1 text-muted-foreground">
                {analysis.comparisonToHome && analysis.comparisonToHome.hasReference ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Obecne mieszkanie:</span>
                      <span className="font-semibold text-foreground">{analysis.comparisonToHome.homeHoursPerWeek} h / tydz.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Różnica czasu:</span>
                      {analysis.comparisonToHome.savedHoursPerWeek >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <TrendingDownIcon className="size-3" />
                          -{analysis.comparisonToHome.savedHoursPerWeek} h (oszczędność)
                        </span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center gap-0.5">
                          <TrendingUpIcon className="size-3" />
                          +{Math.abs(analysis.comparisonToHome.savedHoursPerWeek)} h dłużej
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Średnia w Krakowie:</span>
                      <span className="font-semibold text-foreground">7.2 h / tydz.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bilans dojazdów:</span>
                      {analysis.weeklySavingsHours >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <TrendingDownIcon className="size-3" />
                          -{analysis.weeklySavingsHours} h (oszczędność)
                        </span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center gap-0.5">
                          <TrendingUpIcon className="size-3" />
                          +{Math.abs(analysis.weeklySavingsHours)} h ponad normę
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* KARTA ŚRODOWISKA (CO2) */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <LeafIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Ślad węglowy
                </span>
                <MethodologyHint tooltip={co2Tooltip} />
              </div>

              <div className="w-fit text-2xl font-bold tracking-tight text-foreground">
                {analysis.totalWeeklyCo2Kg} kg
                <span className="text-xs font-normal text-muted-foreground ml-1">CO₂ / tydzień</span>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 text-[11px] space-y-1 text-emerald-800 dark:text-emerald-300">
                {analysis.comparisonToHome && analysis.comparisonToHome.hasReference ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Obecne mieszkanie:</span>
                      <span className="font-semibold">{analysis.comparisonToHome.homeCo2Kg} kg CO₂/tydz.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Różnica emisji:</span>
                      {analysis.comparisonToHome.savedCo2Kg >= 0 ? (
                        <span className="font-bold flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                          <TrendingDownIcon className="size-3" />
                          -{analysis.comparisonToHome.savedCo2Kg} kg CO₂/tydz.
                        </span>
                      ) : (
                        <span className="font-bold flex items-center gap-0.5 text-rose-500">
                          <TrendingUpIcon className="size-3" />
                          +{Math.abs(analysis.comparisonToHome.savedCo2Kg)} kg CO₂/tydz.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Oszczędność vs auto:</span>
                      <span className="font-bold flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                        <TrendingDownIcon className="size-3" />
                        -{analysis.weeklyCo2SavingsKg} kg CO₂/tydz.
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Kompensacja w drzewach:</span>
                      <span className="font-semibold">🌲 ≈ {analysis.treesEquivalentWeekly} drzew/rok</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* KARTA BUDŻETU I OSZCZĘDNOŚCI FINANSOWYCH */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <WalletIcon className="size-3.5 text-primary" />
                Analiza budżetu i oszczędności finansowych
              </span>
              <MethodologyHint tooltip={costTooltip} />
            </div>

            {/* KOSZT TYGODNIOWY / MIESIĘCZNY / ROCZNY */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Tydzień', value: analysis.totalWeeklyCostPln },
                { label: 'Miesiąc', value: (analysis.totalWeeklyCostPln * 52) / 12 },
                { label: 'Rok', value: analysis.totalWeeklyCostPln * 52 },
              ].map((period) => (
                <div key={period.label} className="px-2 py-1.5 rounded-lg bg-muted/60 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    {period.label}
                  </div>
                  <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                    {formatPln(period.value, 0)} zł
                  </div>
                </div>
              ))}
            </div>

            {/* RÓŻNICA BUDŻETOWA */}
            <div className="pt-2 border-t border-border/50 text-[11px] space-y-1 text-muted-foreground">
              {comparison && comparison.hasReference ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>Obecne mieszkanie:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatPln(comparison.homeWeeklyCostPln, 0)} zł / tydz.
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Różnica budżetowa:</span>
                    {comparison.savedCostWeeklyPln >= 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingDownIcon className="size-3" />
                        -{formatPln(comparison.savedCostWeeklyPln, 0)} zł/tydz. (
                        {formatPln(comparison.savedCostWeeklyPln * 52, 0)} zł/rok)
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold flex items-center gap-0.5">
                        <TrendingUpIcon className="size-3" />+
                        {formatPln(Math.abs(comparison.savedCostWeeklyPln), 0)} zł/tydz. drożej
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Oszczędność vs wariant czysto samochodowy:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 tabular-nums">
                    <TrendingDownIcon className="size-3" />
                    {formatPln(analysis.weeklyCostSavingsVsCarPln, 0)} zł/tydz.
                  </span>
                </div>
              )}
            </div>

            {/* TARYFY */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Taryfy MPK Kraków (Strefa I+II+III, normalne)
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {MPK_TICKETS.map((ticket) => (
                  <div
                    key={ticket.label}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-muted/60"
                  >
                    <span className="text-muted-foreground truncate">{ticket.label}</span>
                    <span className="font-semibold text-foreground tabular-nums shrink-0">
                      {formatPln(ticket.pricePln, 2)} zł
                    </span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-muted/60">
                  <span className="text-muted-foreground">
                    Paliwo {formatPln(FUEL_PRICE_PLN_PER_LITER, 2)} zł/l ×{' '}
                    {formatPln(CAR_FUEL_CONSUMPTION_L_PER_100KM, 1)} l/100 km
                  </span>
                  <span className="font-semibold text-foreground tabular-nums shrink-0">
                    {formatPln(CAR_COST_PER_KM_PLN, 2)} zł/km
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Rower i spacer: 0,00 zł — transport zeroemisyjny. Koszt biletu dobierany jest do czasu
                jednego przejazdu, a bilans tygodniowy obejmuje dojazd i powrót.
              </p>
            </div>
          </div>

          {/* TABELA ZESTAWIENIA TRAS I CELÓW */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground px-0.5 block">
              Zestawienie tras i emisji per cel podróży ({analysis.routes.length}):
            </span>

            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 bg-card text-xs">
              {analysis.routes.map((route) => (
                <div
                  key={route.destinationId}
                  className="p-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-sm shrink-0">{route.destinationIcon}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {route.destinationName}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{route.distanceKm} km</span>
                        <span>•</span>
                        <span>{route.durationMinutes} min w 1 stronę</span>
                        <span>•</span>
                        <span className="capitalize">{route.travelMode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-foreground">
                      {route.durationMinutes} min
                    </div>
                    <div
                      className={`text-[10px] font-mono font-medium ${
                        (route.co2EmissionKg ?? 0) === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {(route.co2EmissionKg ?? 0) === 0 ? '0 g CO₂' : `${route.co2EmissionKg} kg CO₂`}
                    </div>
                    <div
                      className="text-[10px] font-mono font-medium text-muted-foreground"
                      title={route.ticketType}
                    >
                      {formatPln(route.costPlnPerTrip, 2)} zł / przejazd
                    </div>
                  </div>
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
