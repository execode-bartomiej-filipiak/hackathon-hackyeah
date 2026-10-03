'use client';

import type {
  CommuteProfile,
  TravelMode,
  CommuteAnalysis,
  CommuteRouteResult,
} from '@/types/commute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SparklesIcon,
  TrainIcon,
  CarIcon,
  BikeIcon,
  FootprintsIcon,
  ClockIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ChevronRightIcon,
  MapPinIcon,
  Building2Icon,
} from 'lucide-react';

interface CommuteHudProps {
  profiles: CommuteProfile[];
  activeProfile: CommuteProfile;
  onSelectProfile: (profile: CommuteProfile) => void;
  travelMode: TravelMode;
  onSelectTravelMode: (mode: TravelMode) => void;
  analysis: CommuteAnalysis | null;
  selectedBuildingName?: string;
  onFocusDestination?: (route: CommuteRouteResult) => void;
  onSelectDemoOrigin?: () => void;
}

export function CommuteHud({
  profiles,
  activeProfile,
  onSelectProfile,
  travelMode,
  onSelectTravelMode,
  analysis,
  selectedBuildingName,
  onFocusDestination,
  onSelectDemoOrigin,
}: CommuteHudProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const getStatusBadge = (status: 'optimal' | 'moderate' | 'heavy') => {
    switch (status) {
      case 'optimal':
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            &lt; 15 min
          </span>
        );
      case 'moderate':
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
            15-30 min
          </span>
        );
      case 'heavy':
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
            &gt; 30 min
          </span>
        );
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 max-h-[calc(100vh-2rem)] flex flex-col gap-2.5 overflow-y-auto pointer-events-auto select-none font-sans scrollbar-none">
      {/* KARTA GŁÓWNA COMMUTE SCORE */}
      <Card className="border border-border/80 bg-background/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden p-0">
        <CardContent className="p-4 space-y-3.5">
          {/* NAGŁÓWEK I WYBÓR PROFILU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Analiza Dojazdów 3D
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                Kraków Model
              </Badge>
            </div>

            {/* PRZYCISKI PROFILI UŻYTKOWNIKA */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl border border-border/60">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectProfile(p)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span className="truncate">{p.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRZEŁĄCZNIK ŚRODKA TRANSPORTU */}
          <div className="flex items-center justify-between gap-1 p-1 bg-muted/40 rounded-lg border border-border/40 text-xs">
            <button
              onClick={() => onSelectTravelMode('transit')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] transition-colors ${
                travelMode === 'transit'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrainIcon className="size-3" />
              <span>MPK</span>
            </button>

            <button
              onClick={() => onSelectTravelMode('driving')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] transition-colors ${
                travelMode === 'driving'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CarIcon className="size-3" />
              <span>Auto</span>
            </button>

            <button
              onClick={() => onSelectTravelMode('bicycling')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] transition-colors ${
                travelMode === 'bicycling'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BikeIcon className="size-3" />
              <span>Rower</span>
            </button>

            <button
              onClick={() => onSelectTravelMode('walking')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] transition-colors ${
                travelMode === 'walking'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FootprintsIcon className="size-3" />
              <span>Pieszo</span>
            </button>
          </div>

          {/* JEŚLI BRAK WYBRANEGO BUDYNKU */}
          {!analysis ? (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2.5">
              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Building2Icon className="size-4.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-foreground">
                  Wybierz lokalizację na mapie
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Kliknij dowolny budynek 3D w Krakowie, aby wyliczyć czas dojazdów dla profilu: <strong>{activeProfile.name}</strong>.
                </p>
              </div>

              {onSelectDemoOrigin && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={onSelectDemoOrigin}
                  className="w-full text-xs h-7.5 gap-1.5 font-medium shadow-xs"
                >
                  <SparklesIcon className="size-3 text-amber-300" />
                  Testuj przykładowy budynek (Rynek)
                </Button>
              )}
            </div>
          ) : (
            /* WYNIKI ANALIZY COMMUTE SCORE */
            <div className="space-y-3 animate-in fade-in">
              {/* KAFELEK KPI */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="size-3 text-primary" />
                    Tygodniowo w drodze
                  </span>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {analysis.totalHoursPerWeek} h
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ tydzień</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    {analysis.weeklySavingsHours >= 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDownIcon className="size-3" />
                        Oszczędzasz {analysis.weeklySavingsHours} h/tydz.
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                        <TrendingUpIcon className="size-3" />
                        +{Math.abs(analysis.weeklySavingsHours)} h ponad normę
                      </span>
                    )}
                  </div>
                </div>

                {/* DUŻY PIERŚCIEŃ PUNKTOWY */}
                <div
                  className={`flex flex-col items-center justify-center size-16 rounded-2xl border-2 ${getScoreColor(
                    analysis.score
                  )} shadow-sm`}
                >
                  <span className="text-xl font-black leading-none">{analysis.score}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 mt-0.5">
                    Score
                  </span>
                </div>
              </div>

              {/* LISTA PUNKTÓW DOCELOWYCH */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
                  <span>Twoje cele podróży ({analysis.routes.length}):</span>
                  {selectedBuildingName && (
                    <span className="font-normal truncate max-w-[150px] text-foreground">
                      Z: {selectedBuildingName}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                  {analysis.routes.map((route) => (
                    <div
                      key={route.destinationId}
                      onClick={() => onFocusDestination?.(route)}
                      className="group flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-sm shrink-0">{route.destinationIcon}</span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {route.destinationName}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span>{route.distanceKm} km</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPinIcon className="size-2.5" />
                              {activeProfile.destinations.find((d) => d.id === route.destinationId)
                                ?.frequencyPerWeek}
                              x/tydz.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-foreground">
                            {route.durationMinutes} min
                          </div>
                          {getStatusBadge(route.status)}
                        </div>
                        <ChevronRightIcon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
