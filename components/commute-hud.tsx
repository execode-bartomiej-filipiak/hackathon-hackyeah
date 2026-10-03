'use client';

import type {
  CommuteProfile,
  TravelMode,
  CommuteAnalysis,
  CommuteRouteResult,
} from '@/types/commute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  CrosshairIcon,
  XIcon,
} from 'lucide-react';

interface CommuteHudProps {
  activeProfile: CommuteProfile;
  analysis: CommuteAnalysis | null;
  selectedBuildingName?: string;
  onFocusDestination?: (route: CommuteRouteResult) => void;
  onSelectDemoOrigin?: () => void;
  isAddingTarget?: boolean;
  onToggleAddTarget?: () => void;
  onRemoveDestination?: (destinationId: string) => void;
  onUpdateDestinationMode?: (destinationId: string, mode: TravelMode) => void;
}

export function CommuteHud({
  activeProfile,
  analysis,
  selectedBuildingName,
  onFocusDestination,
  onSelectDemoOrigin,
  isAddingTarget = false,
  onToggleAddTarget,
  onRemoveDestination,
  onUpdateDestinationMode,
}: CommuteHudProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 max-h-[calc(100vh-2rem)] flex flex-col gap-2.5 overflow-y-auto pointer-events-auto select-none font-sans scrollbar-none">
      {/* KARTA GŁÓWNA COMMUTE SCORE */}
      <Card className="border border-border/80 bg-background/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden p-0">
        <CardContent className="p-4 space-y-3.5">
          {/* NAGŁÓWEK */}
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Analiza Dojazdów 3D
            </span>
          </div>

          {/* JEŚLI BRAK WYBRANEGO BUDYNKU */}
          {!analysis ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2.5">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Building2Icon className="size-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">
                    Wybierz lokalizację na mapie
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Kliknij dowolny budynek 3D w Krakowie, aby wyliczyć czas dojazdów do zdefiniowanych celów.
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

              {/* LISTA ZDEFINIOWANYCH CELÓW Z PRZEŁĄCZNIKAMI TRANSPORTU */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
                  <span>Zdefiniowane cele podróży ({activeProfile.destinations.length}):</span>
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                  {activeProfile.destinations.map((dest) => (
                    <div
                      key={dest.id}
                      className="group flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-sm shrink-0">{dest.icon}</span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-medium text-foreground truncate">
                            {dest.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPinIcon className="size-2.5" />
                            <span>{dest.frequencyPerWeek}x w tygodniu</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* PRZEŁĄCZNIK ŚRODKA TRANSPORTU DLA CELU */}
                        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                          <button
                            type="button"
                            onClick={() => onUpdateDestinationMode?.(dest.id, 'transit')}
                            className={`p-1 rounded text-[10px] transition-colors ${
                              dest.travelMode === 'transit'
                                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="MPK (Tramwaj / Autobus)"
                          >
                            <TrainIcon className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateDestinationMode?.(dest.id, 'driving')}
                            className={`p-1 rounded text-[10px] transition-colors ${
                              dest.travelMode === 'driving'
                                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Samochód"
                          >
                            <CarIcon className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateDestinationMode?.(dest.id, 'bicycling')}
                            className={`p-1 rounded text-[10px] transition-colors ${
                              dest.travelMode === 'bicycling'
                                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Rower"
                          >
                            <BikeIcon className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateDestinationMode?.(dest.id, 'walking')}
                            className={`p-1 rounded text-[10px] transition-colors ${
                              dest.travelMode === 'walking'
                                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Pieszo"
                          >
                            <FootprintsIcon className="size-3" />
                          </button>
                        </div>

                        {onRemoveDestination && activeProfile.destinations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveDestination(dest.id)}
                            className="opacity-60 hover:opacity-100 p-1 hover:text-rose-500 transition-colors"
                            title="Usuń cel"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PRZYCISK DODAWANIA NOWEGO CELU */}
                {onToggleAddTarget && (
                  <Button
                    size="sm"
                    variant={isAddingTarget ? 'default' : 'outline'}
                    onClick={onToggleAddTarget}
                    className={`w-full text-xs h-8 gap-2 font-medium transition-all ${
                      isAddingTarget
                        ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                        : 'hover:border-primary/50 border-dashed'
                    }`}
                  >
                    <CrosshairIcon className="size-3.5" />
                    <span>{isAddingTarget ? 'Anuluj wybór celu' : '+ Dodaj nowy cel na mapie'}</span>
                  </Button>
                )}
              </div>
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
                    <span className="font-normal truncate max-w-[140px] text-foreground">
                      Z: {selectedBuildingName}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                  {analysis.routes.map((route) => {
                    const dest = activeProfile.destinations.find(
                      (d) => d.id === route.destinationId
                    );
                    const currentMode = dest?.travelMode || route.travelMode;

                    return (
                      <div
                        key={route.destinationId}
                        onClick={() => onFocusDestination?.(route)}
                        className="group flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1.5">
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
                                {dest?.frequencyPerWeek || 3}x/tydz.
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* PRZEŁĄCZNIK TRANSPORTU DLA TEGO CELU */}
                          <div
                            className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateDestinationMode?.(route.destinationId, 'transit')
                              }
                              className={`p-1 rounded text-[10px] transition-colors ${
                                currentMode === 'transit'
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="MPK (Tramwaj / Autobus)"
                            >
                              <TrainIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateDestinationMode?.(route.destinationId, 'driving')
                              }
                              className={`p-1 rounded text-[10px] transition-colors ${
                                currentMode === 'driving'
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Samochód"
                            >
                              <CarIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateDestinationMode?.(route.destinationId, 'bicycling')
                              }
                              className={`p-1 rounded text-[10px] transition-colors ${
                                currentMode === 'bicycling'
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Rower"
                            >
                              <BikeIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateDestinationMode?.(route.destinationId, 'walking')
                              }
                              className={`p-1 rounded text-[10px] transition-colors ${
                                currentMode === 'walking'
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Pieszo"
                            >
                              <FootprintsIcon className="size-3" />
                            </button>
                          </div>

                          {/* CZAS BEZ BADGE'A <15m */}
                          <div className="text-right min-w-[44px]">
                            <div className="text-xs font-bold text-foreground">
                              {route.durationMinutes} min
                            </div>
                          </div>

                          {onRemoveDestination && activeProfile.destinations.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDestination(route.destinationId);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                              title="Usuń cel"
                            >
                              <XIcon className="size-3.5" />
                            </button>
                          )}

                          <ChevronRightIcon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PRZYCISK DODAWANIA NOWEGO CELU W TRYBIE ANALIZY */}
                {onToggleAddTarget && (
                  <Button
                    size="sm"
                    variant={isAddingTarget ? 'default' : 'outline'}
                    onClick={onToggleAddTarget}
                    className={`w-full text-xs h-8 gap-2 font-medium mt-1 transition-all ${
                      isAddingTarget
                        ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                        : 'hover:border-primary/50 border-dashed'
                    }`}
                  >
                    <CrosshairIcon className="size-3.5" />
                    <span>{isAddingTarget ? 'Anuluj wybór celu' : '+ Dodaj nowy cel na mapie'}</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
