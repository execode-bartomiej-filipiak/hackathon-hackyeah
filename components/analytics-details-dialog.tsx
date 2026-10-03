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
  TrainIcon,
  CarIcon,
  BikeIcon,
  FootprintsIcon,
  SparklesIcon,
  CheckCircle2Icon,
} from 'lucide-react';

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
              ? `Analiza dla lokalizacji: ${homeBuildingName}`
              : 'Zestawienie czasowe, środowiskowe i transportowe dla wybranego punktu w Krakowie.'}
            {referenceBuildingName && ` • Punkt odniesienia: ${referenceBuildingName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* GŁÓWNY WYNIK COMMUTE SCORE */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 shadow-xs">
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

          {/* DWA KAFELKI KPI: CZAS I ŚRODOWISKO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* KARTA CZASU */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-primary" />
                  Budżet czasowy
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Czas w drodze
                </span>
              </div>

              <div className="text-2xl font-bold tracking-tight text-foreground">
                {analysis.totalHoursPerWeek} h
                <span className="text-xs font-normal text-muted-foreground ml-1">/ tydzień</span>
              </div>

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
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 uppercase">
                  Eko KPI
                </span>
              </div>

              <div className="text-2xl font-bold tracking-tight text-foreground">
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
