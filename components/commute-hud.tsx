'use client';

import { useState } from 'react';
import type {
  CommuteProfile,
  TravelMode,
  CommuteAnalysis,
  CommuteRouteResult,
  CommuteDestination,
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

  Building2Icon,
  CrosshairIcon,
  PencilIcon,
  XIcon,
  HomeIcon,
  LeafIcon,
  ExternalLinkIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { AnalyticsDetailsDialog } from '@/components/analytics-details-dialog';

function getTransportIcon(mode: TravelMode) {
  switch (mode) {
    case 'transit':
      return <TrainIcon className="size-3 text-primary" />;
    case 'driving':
      return <CarIcon className="size-3 text-primary" />;
    case 'bicycling':
      return <BikeIcon className="size-3 text-primary" />;
    case 'walking':
      return <FootprintsIcon className="size-3 text-primary" />;
  }
}

function getTransportLabel(mode: TravelMode): string {
  switch (mode) {
    case 'transit':
      return 'MPK';
    case 'driving':
      return 'Auto';
    case 'bicycling':
      return 'Rower';
    case 'walking':
      return 'Pieszo';
  }
}

interface CommuteHudProps {
  activeProfile: CommuteProfile;
  analysis: CommuteAnalysis | null;
  homeBuildingName?: string;
  referenceBuildingName?: string;
  selectedBuildingName?: string;
  activeFocusPoint?: 'home' | 'reference';
  onSelectFocusPoint?: (point: 'home' | 'reference') => void;
  onFocusDestination?: (route: CommuteRouteResult) => void;
  onSelectDemoOrigin?: () => void;
  isAddingTarget?: boolean;
  onToggleAddTarget?: () => void;
  isSelectingHome?: boolean;
  onToggleSelectHome?: () => void;
  isSelectingReference?: boolean;
  onToggleSelectReference?: () => void;
  isSelectingOrigin?: boolean;
  onToggleSelectOrigin?: () => void;
  onClearSelection?: () => void;
  onRemoveDestination?: (destinationId: string) => void;
  onUpdateDestinationMode?: (destinationId: string, mode: TravelMode) => void;
  onEditDestination?: (destination: CommuteDestination) => void;
  onResetData?: () => void;
}

export function CommuteHud({
  activeProfile,
  analysis,
  homeBuildingName,
  referenceBuildingName,
  selectedBuildingName,
  activeFocusPoint = 'reference',
  onSelectFocusPoint,
  onFocusDestination,
  onSelectDemoOrigin,
  isAddingTarget = false,
  onToggleAddTarget,
  isSelectingHome = false,
  onToggleSelectHome,
  isSelectingReference = false,
  onToggleSelectReference,
  isSelectingOrigin = false,
  onToggleSelectOrigin,
  onClearSelection,
  onRemoveDestination,
  onUpdateDestinationMode,
  onEditDestination,
  onResetData,
}: CommuteHudProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const effectiveHomeName = homeBuildingName || (!referenceBuildingName ? selectedBuildingName : undefined);
  const effectiveRefName = referenceBuildingName;

  // Bohater panelu: zaoszczędzony czas tygodniowo (względem mieszkania lub normy krakowskiej)
  const comparison = analysis?.comparisonToHome;
  const hasReference = Boolean(comparison?.hasReference);
  const savedHours = hasReference
    ? comparison?.savedHoursPerWeek ?? 0
    : analysis?.weeklySavingsHours ?? 0;
  const timeSaved = savedHours >= 0;
  const timeScope = hasReference ? 'vs mieszkanie' : 'vs norma krakowska';

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 max-h-[calc(100vh-2rem)] flex flex-col gap-2.5 overflow-y-auto pointer-events-auto select-none font-sans scrollbar-none">
      {/* KARTA GŁÓWNA COMMUTE SCORE */}
      <Card className="border border-border/80 bg-background/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden p-0">
        <CardContent className="p-4 space-y-3.5">
          {/* NAGŁÓWEK */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Analiza Dojazdów 3D
              </span>
            </div>
            {onResetData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetData}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 font-medium hover:bg-muted/80 cursor-pointer"
                title="Zresetuj dane analizy i widok mapy"
              >
                <RotateCcwIcon className="size-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* JEŚLI BRAK WYBRANEGO BUDYNKU / PRZED PEŁNĄ ANALIZĄ */}
          {!analysis ? (
            <div className="space-y-3">
              {/* 1. PIERWSZE MIEJSCE: MIEJSCE ZAMIESZKANIA */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold px-0.5 block">
                  Miejsce zamieszkania:
                </span>
                {effectiveHomeName ? (
                  <div
                    onClick={() => onSelectFocusPoint?.('home')}
                    title="Kliknij, aby wycentrować widok 3D i pokazać dojazdy dla miejsca zamieszkania"
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeFocusPoint === 'home'
                        ? 'border-primary ring-2 ring-primary/40 bg-primary/10 shadow-xs'
                        : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1.5">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <HomeIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Miejsce zamieszkania
                          </span>
                          {activeFocusPoint === 'home' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-bold leading-none">
                              Aktywne
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs font-semibold text-foreground truncate"
                          title={effectiveHomeName}
                        >
                          {effectiveHomeName}
                        </div>
                      </div>
                    </div>
                    {(onToggleSelectHome || onToggleSelectOrigin) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          (onToggleSelectHome || onToggleSelectOrigin)?.();
                        }}
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                      >
                        Zmień
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={isSelectingHome || isSelectingOrigin ? 'default' : 'outline'}
                    onClick={onToggleSelectHome || onToggleSelectOrigin}
                    className={`w-full text-xs h-8.5 gap-2 font-medium transition-all ${
                      isSelectingHome || isSelectingOrigin
                        ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                        : 'border-dashed border-primary/50 hover:bg-primary/5 text-foreground'
                    }`}
                  >
                    <HomeIcon className="size-3.5 text-primary" />
                    <span>
                      {isSelectingHome || isSelectingOrigin
                        ? 'Wskaż budynek na mapie...'
                        : '+ Wskaż miejsce zamieszkania'}
                    </span>
                  </Button>
                )}
              </div>

              {/* 2. DRUGIE MIEJSCE: MIEJSCE ODNIESIENIA */}
              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground font-semibold px-0.5 block">
                  Miejsce odniesienia:
                </span>
                {effectiveRefName ? (
                  <div
                    onClick={() => onSelectFocusPoint?.('reference')}
                    title="Kliknij, aby wycentrować widok 3D i pokazać dojazdy dla miejsca odniesienia"
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeFocusPoint === 'reference'
                        ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/10 shadow-xs'
                        : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 hover:bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1.5">
                      <div className="size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Building2Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Miejsce odniesienia
                          </span>
                          {activeFocusPoint === 'reference' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-[8px] font-bold leading-none">
                              Aktywne
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs font-semibold text-foreground truncate"
                          title={effectiveRefName}
                        >
                          {effectiveRefName}
                        </div>
                      </div>
                    </div>
                    {onToggleSelectReference && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelectReference();
                        }}
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                      >
                        Zmień
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={isSelectingReference ? 'default' : 'outline'}
                    onClick={onToggleSelectReference}
                    className={`w-full text-xs h-8.5 gap-2 font-medium transition-all ${
                      isSelectingReference
                        ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                        : 'border-dashed border-blue-500/40 hover:bg-blue-500/5 text-foreground'
                    }`}
                  >
                    <Building2Icon className="size-3.5 text-blue-500" />
                    <span>
                      {isSelectingReference
                        ? 'Wskaż budynek na mapie...'
                        : '+ Wskaż miejsce odniesienia'}
                    </span>
                  </Button>
                )}
              </div>

              {/* 3. TRZECIE MIEJSCE: SEKCJA CELE */}
              <div className="space-y-2 pt-1 border-t border-border/40 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
                  <span>Cele ({activeProfile.destinations.length}):</span>
                </div>

                {activeProfile.destinations.length > 0 && (
                  <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                    {activeProfile.destinations.map((dest) => (
                      <div
                        key={dest.id}
                        className="group flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="text-sm shrink-0">{dest.icon}</span>
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs font-medium text-foreground truncate">
                              {dest.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{dest.frequencyPerWeek}x w tyg.</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const modes: TravelMode[] = ['transit', 'driving', 'bicycling', 'walking'];
                                  const nextMode = modes[(modes.indexOf(dest.travelMode) + 1) % modes.length];
                                  onUpdateDestinationMode?.(dest.id, nextMode);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 hover:bg-muted text-foreground border border-border/50 text-[10px] transition-colors"
                                title={`Środek transportu: ${getTransportLabel(dest.travelMode)} (kliknij, aby zmienić)`}
                              >
                                {getTransportIcon(dest.travelMode)}
                                <span className="font-mono text-[9px] uppercase text-muted-foreground">
                                  {getTransportLabel(dest.travelMode)}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onEditDestination && (
                            <button
                              type="button"
                              onClick={() => onEditDestination(dest)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                              title="Edytuj cel"
                            >
                              <PencilIcon className="size-3" />
                            </button>
                          )}

                          {onRemoveDestination && (
                            <button
                              type="button"
                              onClick={() => onRemoveDestination(dest.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                              title="Usuń cel"
                            >
                              <XIcon className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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

              {/* 4. DÓŁ: PRZYCISK TESTUJ PRZYKŁADOWE DANE */}
              {onSelectDemoOrigin && (
                <div className="pt-1 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onSelectDemoOrigin}
                    className="w-full text-xs h-8 gap-1.5 font-medium shadow-xs"
                  >
                    <SparklesIcon className="size-3.5 text-amber-300" />
                    Testuj przykładowe dane
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* WYNIKI ANALIZY COMMUTE SCORE */
            <div className="space-y-3 animate-in fade-in">
              {/* 1. KPI: WYEKSPONOWANA OSZCZĘDNOŚĆ CZASU + SCORE, CO₂ ZDEEMFATYZOWANE */}
              <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  {/* LEWA STRONA: BOHATER — ZAOSZCZĘDZONY CZAS W TYGODNIU */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {timeSaved ? (
                        <TrendingDownIcon className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <TrendingUpIcon className="size-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        {timeSaved ? 'Oszczędzasz' : 'Tracisz'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span
                        className={`text-3xl font-black leading-none tabular-nums ${
                          timeSaved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {Math.abs(savedHours).toFixed(1)}
                      </span>
                      <span className="text-sm font-bold text-foreground/80 leading-none">h / tydz.</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium mt-1.5">{timeScope}</div>
                  </div>

                  {/* PRAWA STRONA: STAŁY, NIENARUSZONY PIERŚCIEŃ PUNKTOWY SCORE */}
                  <div
                    className={`flex flex-col items-center justify-center size-16 rounded-2xl border-2 ${getScoreColor(
                      analysis.score
                    )} shadow-sm shrink-0`}
                  >
                    <span className="text-xl font-black leading-none">{analysis.score}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 mt-0.5">
                      Score
                    </span>
                  </div>
                </div>

                {/* PASEK POMOCNICZY: CZAS W DRODZE I CO₂ (INFORMACJE DRUGORZĘDNE) */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-3 shrink-0" />
                    <span className="font-semibold text-foreground/80">
                      {analysis.totalHoursPerWeek} h
                    </span>
                    w drodze
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <LeafIcon className="size-3 shrink-0" />
                    <span className="font-semibold text-foreground/80">
                      {analysis.totalWeeklyCo2Kg} kg
                    </span>
                    CO₂
                  </span>
                </div>

                {/* PRZYCISK OTWARCIA MODALU ZE SZCZEGÓŁAMI */}
                <button
                  type="button"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className="w-full pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground font-medium transition-colors group cursor-pointer"
                >
                  <span className="group-hover:text-primary transition-colors">
                    {analysis.comparisonToHome && analysis.comparisonToHome.hasReference
                      ? 'Porównanie analityki i ekologii z mieszkaniem'
                      : 'Szczegóły analityki i ekologii'}
                  </span>
                  <ExternalLinkIcon className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>

              {/* 2. MIEJSCE ZAMIESZKANIA I ODNIESIENIA W TRYBIE ANALIZY */}
              {(effectiveHomeName || effectiveRefName) && (
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  {effectiveHomeName && (
                    <div
                      onClick={() => onSelectFocusPoint?.('home')}
                      title="Kliknij, aby wycentrować widok 3D i pokazać dojazdy dla miejsca zamieszkania"
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        activeFocusPoint === 'home'
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/10 shadow-xs'
                          : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1.5">
                        <HomeIcon className="size-3.5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                              Miejsce zamieszkania
                            </span>
                            {activeFocusPoint === 'home' && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-bold leading-none">
                                Aktywny widok
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                            {effectiveHomeName}
                          </span>
                        </div>
                      </div>
                      {(onToggleSelectHome || onClearSelection) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            (onToggleSelectHome || onClearSelection)?.();
                          }}
                          className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground shrink-0"
                        >
                          Zmień
                        </Button>
                      )}
                    </div>
                  )}

                  {effectiveRefName && (
                    <div
                      onClick={() => onSelectFocusPoint?.('reference')}
                      title="Kliknij, aby wycentrować widok 3D i pokazać dojazdy dla miejsca odniesienia"
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        activeFocusPoint === 'reference'
                          ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/10 shadow-xs'
                          : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 hover:bg-blue-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1.5">
                        <Building2Icon className="size-3.5 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                              Miejsce odniesienia
                            </span>
                            {activeFocusPoint === 'reference' && (
                              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-[8px] font-bold leading-none">
                                Aktywny widok
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                            {effectiveRefName}
                          </span>
                        </div>
                      </div>
                      {onToggleSelectReference && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectReference();
                          }}
                          className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground shrink-0"
                        >
                          Zmień
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LISTA PUNKTÓW DOCELOWYCH */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
                  <span>Cele ({analysis.routes.length}):</span>
                  {selectedBuildingName && (
                    <span className="font-normal truncate max-w-[130px] text-foreground">
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
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {route.destinationName}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{route.distanceKm} km</span>
                              <span>•</span>
                              <span>{dest?.frequencyPerWeek || 3}x/tydz.</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const modes: TravelMode[] = ['transit', 'driving', 'bicycling', 'walking'];
                                  const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
                                  onUpdateDestinationMode?.(route.destinationId, nextMode);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 hover:bg-muted text-foreground border border-border/50 text-[10px] transition-colors"
                                title={`Środek transportu: ${getTransportLabel(currentMode)} (kliknij, aby zmienić)`}
                              >
                                {getTransportIcon(currentMode)}
                                <span className="font-mono text-[9px] uppercase text-muted-foreground">
                                  {getTransportLabel(currentMode)}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onEditDestination && dest && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDestination(dest);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                              title="Edytuj cel"
                            >
                              <PencilIcon className="size-3" />
                            </button>
                          )}

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

                          <div className="text-right min-w-[42px]">
                            <div className="text-xs font-bold text-foreground">
                              {route.durationMinutes} min
                            </div>
                          </div>

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

      {/* MODAL ZE SZCZEGÓŁAMI ANALITYKI I EKOLOGII */}
      {analysis && (
        <AnalyticsDetailsDialog
          open={isAnalyticsModalOpen}
          onOpenChange={setIsAnalyticsModalOpen}
          analysis={analysis}
          homeBuildingName={effectiveHomeName}
          referenceBuildingName={effectiveRefName}
        />
      )}
    </div>
  );
}
