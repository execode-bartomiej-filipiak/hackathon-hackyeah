'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type {
  Map,
  GeoJSONSource,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  LayerSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';
import {
  RotateCwIcon,
  InfoIcon,
  CrosshairIcon,
  LocateFixedIcon,
  HomeIcon,
  Building2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { COMMUTE_PROFILES } from '@/mock/commute-presets';
import {
  calculateCommuteAnalysis,
  calculateRelationalComparison,
} from '@/lib/commute';
import { CommuteHud } from '@/components/commute-hud';
import { AddDestinationDialog } from '@/components/add-destination-dialog';
import { AddressSearch, type SearchResultItem } from '@/components/address-search';
import type {
  CommutePresetOption,
  CommuteProfile,
  TravelMode,
  CommuteAnalysis,
  CommuteRouteResult,
  CommuteDestination,
} from '@/types/commute';

interface SelectedBuildingInfo {
  name: string;
  type?: string;
  height?: number;
  levels?: number;
  district: string;
  coordinates: [number, number];
}

interface PendingNewDestination {
  coordinates: [number, number];
  initialAddress: string;
  district: string;
}

// Trzy gotowe scenariusze dla jury — każdy pokazuje inny typ decyzji mieszkaniowej
const DEMO_PRESET_SCENARIOS: Record<
  string,
  { label: string; home: SelectedBuildingInfo; reference: SelectedBuildingInfo }
> = {
  it_specialist: {
    label: 'Nowa Huta ↔ Zabłocie',
    home: {
      name: 'Os. Kolorowe 12, Nowa Huta',
      type: 'Budynek wielorodzinny',
      height: 28,
      levels: 8,
      district: 'Nowa Huta',
      coordinates: [20.038, 50.071],
    },
    reference: {
      name: 'Mieszkanie, Zabłocie',
      type: 'Budynek wielorodzinny',
      height: 26,
      levels: 8,
      district: 'Zabłocie',
      coordinates: [19.955, 50.047],
    },
  },
  student: {
    label: 'Podgórze ↔ Krowodrza',
    home: {
      name: 'Wynajem, Podgórze',
      type: 'Kamienica',
      height: 20,
      levels: 4,
      district: 'Podgórze',
      coordinates: [19.949, 50.04],
    },
    reference: {
      name: 'Mieszkanie, Krowodrza (AGH)',
      type: 'Budynek wielorodzinny',
      height: 24,
      levels: 8,
      district: 'Krowodrza',
      coordinates: [19.915, 50.073],
    },
  },
  family: {
    label: 'Bieżanów ↔ Prądnik Biały',
    home: {
      name: 'Dom, Bieżanów',
      type: 'Zabudowa jednorodzinna',
      height: 12,
      levels: 3,
      district: 'Bieżanów',
      coordinates: [19.965, 50.011],
    },
    reference: {
      name: 'Mieszkanie, Prądnik Biały',
      type: 'Budynek wielorodzinny',
      height: 30,
      levels: 10,
      district: 'Prądnik Biały',
      coordinates: [19.94, 50.089],
    },
  },
};

// Spójny językiem wizualnym z panelami HUD: ciemne szkło + akcent kolorystyczny statusu
const DESTINATION_PIN_STYLES: Record<
  'optimal' | 'moderate' | 'heavy' | 'none',
  {
    border: string;
    glow: string;
    iconBg: string;
    chip: string;
    pointer: string;
    stem: string;
    ping: string;
    core: string;
  }
> = {
  optimal: {
    border: 'border-emerald-400/45',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.28)]',
    iconBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25',
    chip: 'bg-emerald-500/15 text-emerald-300',
    pointer: 'border-t-emerald-400/80',
    stem: 'bg-gradient-to-b from-emerald-400 to-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.7)]',
    ping: 'border-emerald-400 bg-emerald-400/25',
    core: 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]',
  },
  moderate: {
    border: 'border-amber-400/45',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.28)]',
    iconBg: 'bg-amber-500/15 text-amber-300 border border-amber-400/25',
    chip: 'bg-amber-500/15 text-amber-300',
    pointer: 'border-t-amber-400/80',
    stem: 'bg-gradient-to-b from-amber-400 to-amber-500/20 shadow-[0_0_6px_rgba(245,158,11,0.7)]',
    ping: 'border-amber-400 bg-amber-400/25',
    core: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]',
  },
  heavy: {
    border: 'border-rose-400/45',
    glow: 'shadow-[0_0_18px_rgba(244,63,94,0.28)]',
    iconBg: 'bg-rose-500/15 text-rose-300 border border-rose-400/25',
    chip: 'bg-rose-500/15 text-rose-300',
    pointer: 'border-t-rose-400/80',
    stem: 'bg-gradient-to-b from-rose-400 to-rose-500/20 shadow-[0_0_6px_rgba(244,63,94,0.7)]',
    ping: 'border-rose-400 bg-rose-400/25',
    core: 'bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.9)]',
  },
  none: {
    border: 'border-slate-400/40',
    glow: 'shadow-[0_0_18px_rgba(148,163,184,0.25)]',
    iconBg: 'bg-slate-500/15 text-slate-300 border border-slate-400/25',
    chip: 'bg-slate-500/15 text-slate-300',
    pointer: 'border-t-slate-400/80',
    stem: 'bg-gradient-to-b from-slate-400 to-slate-500/20 shadow-[0_0_6px_rgba(148,163,184,0.7)]',
    ping: 'border-slate-400 bg-slate-400/25',
    core: 'bg-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.9)]',
  },
};

function getDistrict(lng: number, lat: number): string {
  const distRynek = Math.hypot(lng - 19.9373, lat - 50.0617);
  const distWawel = Math.hypot(lng - 19.9354, lat - 50.0540);
  const distKazimierz = Math.hypot(lng - 19.9450, lat - 50.0520);
  const distUnity = Math.hypot(lng - 19.9575, lat - 50.0680);
  const distTauron = Math.hypot(lng - 19.9922, lat - 50.0681);

  if (distWawel < 0.004) return 'Wzgórze Wawelskie';
  if (distRynek < 0.007) return 'Stare Miasto';
  if (distKazimierz < 0.006) return 'Kazimierz';
  if (distUnity < 0.008) return 'Grzegórzki / Rondo Mogilskie';
  if (distTauron < 0.01) return 'Czyżyny / Park Lotników';
  return 'Kraków Centralny';
}

async function reverseGeocodeKrakow(
  lng: number,
  lat: number
): Promise<{ address: string; district: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as {
        features?: Array<{
          properties?: {
            street?: string;
            name?: string;
            housenumber?: string;
            district?: string;
            locality?: string;
          };
        }>;
      };

      const p = data.features?.[0]?.properties;
      if (p) {
        const street = p.street || p.name;
        const number = p.housenumber ? ` ${p.housenumber}` : '';
        const district = p.district || p.locality || getDistrict(lng, lat);

        if (street) {
          const formatted =
            street.startsWith('ul.') ||
            street.startsWith('Plac') ||
            street.startsWith('Rynek') ||
            street.startsWith('Aleja')
              ? `${street}${number}`
              : `ul. ${street}${number}`;

          return { address: formatted, district };
        }
      }
    }
  } catch {
    // Cichy fallback przy braku sieci
  }

  return {
    address: `Kraków, ${getDistrict(lng, lat)}`,
    district: getDistrict(lng, lat),
  };
}

// Izoluje pojedynczy obrys budynku z potencjalnego MultiPolygonu kafli wektorowych
function extractClickedPolygon(
  geometry: GeoJSON.Geometry,
  clickPoint: [number, number]
): GeoJSON.Geometry {
  if (geometry.type !== 'MultiPolygon') {
    return geometry;
  }

  const multiCoords = geometry.coordinates as Array<Array<Array<[number, number]>>>;
  if (!multiCoords || multiCoords.length === 0) return geometry;

  // 1. Sprawdzamy algorytmem ray-casting, który wielokąt obejmuje kliknięty punkt
  const matched = multiCoords.find((poly) => {
    const outerRing = poly[0];
    if (!outerRing || outerRing.length < 3) return false;
    const [x, y] = clickPoint;
    let inside = false;
    for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
      const xi = outerRing[i][0];
      const yi = outerRing[i][1];
      const xj = outerRing[j][0];
      const yj = outerRing[j][1];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  });

  if (matched) {
    return {
      type: 'Polygon',
      coordinates: matched,
    };
  }

  // 2. Jeśli punkt kliknięcia leżał na dachu/krawędzi (z powodu perspektywy kamery 3D),
  // wybieramy wielokąt, którego środek (centroid) jest najbliższy punktowi kliknięcia
  let nearestPoly = multiCoords[0];
  let minDistance = Infinity;

  for (const poly of multiCoords) {
    const outerRing = poly[0];
    if (!outerRing || outerRing.length === 0) continue;
    let sumX = 0;
    let sumY = 0;
    for (const pt of outerRing) {
      sumX += pt[0];
      sumY += pt[1];
    }
    const cX = sumX / outerRing.length;
    const cY = sumY / outerRing.length;
    const dist = Math.hypot(cX - clickPoint[0], cY - clickPoint[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoly = poly;
    }
  }

  return {
    type: 'Polygon',
    coordinates: nearestPoly,
  };
}

export function Krakow3DMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isSwitchingBuildingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const destinationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routesRef = useRef<CommuteRouteResult[]>([]);
  const animProgressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const arcsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [homeBuilding, setHomeBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [referenceBuilding, setReferenceBuilding] = useState<SelectedBuildingInfo | null>(null);
  const homeBuildingRef = useRef<SelectedBuildingInfo | null>(null);
  const referenceBuildingRef = useRef<SelectedBuildingInfo | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Stan profili i celów podróży
  const [profiles, setProfiles] = useState<CommuteProfile[]>(COMMUTE_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(COMMUTE_PROFILES[0].id);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const [hasPresetLoaded, setHasPresetLoaded] = useState(false);
  const [customDestinations, setCustomDestinations] = useState<CommuteDestination[]>([]);

  const currentDestinations = [
    ...customDestinations,
    ...(hasPresetLoaded ? activeProfile.destinations : []),
  ];

  const currentProfile = {
    ...activeProfile,
    destinations: currentDestinations,
  };

  const presetOptions: CommutePresetOption[] = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    icon: profile.icon,
    description: profile.description,
    scenario: DEMO_PRESET_SCENARIOS[profile.id]?.label ?? '',
    destinationsCount: profile.destinations.length,
    weeklyVisits: profile.destinations.reduce((sum, d) => sum + d.frequencyPerWeek, 0),
  }));

  const [activeFocusPoint, setActiveFocusPoint] = useState<'home' | 'reference'>('reference');
  const activeFocusPointRef = useRef<'home' | 'reference'>('reference');
  const cachedAnalysisRef = useRef<{
    home?: CommuteAnalysis;
    reference?: CommuteAnalysis;
  }>({});

  const activeOriginBuilding =
    activeFocusPoint === 'home'
      ? (homeBuilding || referenceBuilding || selectedBuilding)
      : (referenceBuilding || homeBuilding || selectedBuilding);

  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const isAddingTargetRef = useRef(false);
  const [isSelectingHome, setIsSelectingHome] = useState(false);
  const isSelectingHomeRef = useRef(false);
  const [isSelectingReference, setIsSelectingReference] = useState(false);
  const isSelectingReferenceRef = useRef(false);
  const activeProfileIdRef = useRef(activeProfileId);

  useEffect(() => {
    activeFocusPointRef.current = activeFocusPoint;
  }, [activeFocusPoint]);

  useEffect(() => {
    isAddingTargetRef.current = isAddingTarget;
  }, [isAddingTarget]);

  useEffect(() => {
    isSelectingHomeRef.current = isSelectingHome;
  }, [isSelectingHome]);

  useEffect(() => {
    isSelectingReferenceRef.current = isSelectingReference;
  }, [isSelectingReference]);

  useEffect(() => {
    homeBuildingRef.current = homeBuilding;
  }, [homeBuilding]);

  useEffect(() => {
    referenceBuildingRef.current = referenceBuilding;
  }, [referenceBuilding]);

  useEffect(() => {
    activeProfileIdRef.current = activeProfileId;
  }, [activeProfileId]);

  // Aktualizacja kursora canvasa mapy przy zmianie trybu
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor =
        isAddingTarget || isSelectingHome || isSelectingReference ? 'crosshair' : '';
    }
  }, [isAddingTarget, isSelectingHome, isSelectingReference]);

  // Klawisz Escape do anulowania celownika lub wyboru
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddingTarget) setIsAddingTarget(false);
        if (isSelectingHome) setIsSelectingHome(false);
        if (isSelectingReference) setIsSelectingReference(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingTarget, isSelectingHome, isSelectingReference]);

  const handleUpdateDestinationMode = (destinationId: string, mode: TravelMode) => {
    cachedAnalysisRef.current = {};
    setCustomDestinations((prev) =>
      prev.map((d) => (d.id === destinationId ? { ...d, travelMode: mode } : d))
    );
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfile.id
          ? {
              ...p,
              destinations: p.destinations.map((d) =>
                d.id === destinationId ? { ...d, travelMode: mode } : d
              ),
            }
          : p
      )
    );
  };


  const [pendingDestination, setPendingDestination] = useState<PendingNewDestination | null>(null);
  const [editingDestination, setEditingDestination] = useState<CommuteDestination | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [commuteAnalysis, setCommuteAnalysis] = useState<CommuteAnalysis | null>(null);
  // Aktualizacja markerów celów na mapie 3D
  const updateDestinationMarkers = useCallback(
    (map: Map, destinations: CommuteDestination[], routes: CommuteRouteResult[]) => {
      // Usuwamy poprzednie markery
      destinationMarkersRef.current.forEach((m) => m.remove());
      destinationMarkersRef.current = [];

      destinations.forEach((dest) => {
        const route = routes.find((r) => r.destinationId === dest.id);
        const pin = DESTINATION_PIN_STYLES[route?.status ?? 'none'];
        const el = document.createElement('div');
        el.className = 'commute-destination-marker cursor-pointer select-none group';
        el.title = `${dest.name}${route ? ` (${route.durationMinutes} min)` : ''}`;
        el.innerHTML = `
          <div class="flex flex-col items-center">
            <div class="relative flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-2xl bg-slate-950/90 backdrop-blur-xl border ${pin.border} ${pin.glow} transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 whitespace-nowrap">
              <span class="size-6 rounded-lg flex items-center justify-center text-sm shrink-0 ${pin.iconBg}">
                ${dest.icon}
              </span>
              <span class="text-[11px] font-bold text-white truncate max-w-[140px] sm:max-w-[190px]">
                ${dest.name}
              </span>
              ${
                route
                  ? `<span class="text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded-full ${pin.chip} shrink-0">${route.durationMinutes}m</span>`
                  : ''
              }
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${pin.pointer}"></div>
            <div class="w-0.5 h-3 ${pin.stem}"></div>
            <div class="relative flex items-center justify-center size-4 -mt-2">
              <div class="absolute size-4 rounded-full border ${pin.ping} animate-ping"></div>
              <div class="size-2 rounded-full ${pin.core}"></div>
            </div>
          </div>
        `;

        el.onclick = (event) => {
          event.stopPropagation();
          map.flyTo({
            center: dest.coordinates,
            zoom: 16.5,
            pitch: 62,
            duration: 1600,
            essential: true,
          });
        };

        el.style.zIndex = '6';

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(dest.coordinates)
          .addTo(map);

        destinationMarkersRef.current.push(marker);
      });
    },
    []
  );

  // Inicjalizacja Mapy
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    setMapLoaded(false);

    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    const styleUrl = 'https://tiles.openfreemap.org/styles/liberty';

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [19.9373, 50.0617], // Kraków Rynek Główny
      zoom: 16.3,
      pitch: 62,
      bearing: -20,
      maxPitch: 75,
      attributionControl: false,
    });

    mapInstance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    mapInstance.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: '3D Kraków NearBy Score PoC' }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      setMapLoaded(true);

      // Źródło i warstwa podświetlenia zaznaczonego budynku
      if (!mapInstance.getSource('selected-building-source')) {
        mapInstance.addSource('selected-building-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        mapInstance.addLayer({
          id: 'selected-building-highlight',
          type: 'fill-extrusion',
          source: 'selected-building-source',
          paint: {
            'fill-extrusion-color': ['coalesce', ['get', 'color'], '#f59e0b'],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 18],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.95,
          },
        });
      }

      // Kursor pointer nad budynkami 3D
      const buildingLayerIds = ['building-3d', 'building'].filter((id) => mapInstance.getLayer(id));

      mapInstance.on('mousemove', (e: MapLayerMouseEvent) => {
        if (
          isAddingTargetRef.current ||
          isSelectingHomeRef.current ||
          isSelectingReferenceRef.current
        ) {
          mapInstance.getCanvas().style.cursor = 'crosshair';
          return;
        }

        const features = mapInstance.queryRenderedFeatures(e.point);
        const hasBuilding = features.some(
          (f: MapGeoJSONFeature) =>
            f.layer.id !== 'selected-building-highlight' &&
            (f.layer.type === 'fill-extrusion' ||
              f.sourceLayer === 'building' ||
              f.layer.id.includes('building'))
        );
        mapInstance.getCanvas().style.cursor = hasBuilding ? 'pointer' : '';
      });

      // Kliknięcie w mapę
      mapInstance.on('click', (e: MapLayerMouseEvent) => {
        // Tryb celownika: dodanie nowego celu podróży
        if (isAddingTargetRef.current) {
          const currentLng = e.lngLat.lng;
          const currentLat = e.lngLat.lat;
          const initialDistrict = getDistrict(currentLng, currentLat);
          setIsAddingTarget(false);
          isAddingTargetRef.current = false;

          setPendingDestination({
            coordinates: [currentLng, currentLat],
            initialAddress: `Kraków, ${initialDistrict}`,
            district: initialDistrict,
          });
          setIsAddDialogOpen(true);

          reverseGeocodeKrakow(currentLng, currentLat).then((resolved) => {
            setPendingDestination((prev) => {
              if (!prev) return null;
              if (prev.coordinates[0] === currentLng && prev.coordinates[1] === currentLat) {
                return {
                  ...prev,
                  initialAddress: resolved.address,
                  district: resolved.district,
                };
              }
              return prev;
            });
          });

          return;
        }

        // Tryb wyboru budynku / obecnego miejsca zamieszkania / nowego miejsca zamieszkania
        const isHomeMode = isSelectingHomeRef.current;
        const isRefMode = isSelectingReferenceRef.current;

        // Resetujemy tryby wyboru
        setIsSelectingHome(false);
        setIsSelectingReference(false);
        isSelectingHomeRef.current = false;
        isSelectingReferenceRef.current = false;

        // Szukamy budynku w punkcie kliknięcia, a jeśli brak, to w buforze 12px
        const features = mapInstance.queryRenderedFeatures(e.point);
        let buildingFeature = features.find(
          (f: MapGeoJSONFeature) =>
            f.layer.id !== 'selected-building-highlight' &&
            (f.layer.type === 'fill-extrusion' ||
              f.sourceLayer === 'building' ||
              f.layer.id.includes('building'))
        );

        if (!buildingFeature) {
          const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
            [e.point.x - 12, e.point.y - 12],
            [e.point.x + 12, e.point.y + 12],
          ];
          const bboxFeatures = mapInstance.queryRenderedFeatures(bbox);
          buildingFeature = bboxFeatures.find(
            (f: MapGeoJSONFeature) =>
              f.layer.id !== 'selected-building-highlight' &&
              (f.layer.type === 'fill-extrusion' ||
                f.sourceLayer === 'building' ||
                f.layer.id.includes('building'))
          );
        }

        const props = buildingFeature?.properties || {};
        const height =
          Number(props.render_height) ||
          Number(props.height) ||
          (props.levels ? Number(props.levels) * 3.5 : 18);
        const levels =
          Number(props.levels) ||
          Number(props.building_levels) ||
          Math.max(1, Math.round(height / 3.5));
        const initialDistrict = getDistrict(e.lngLat.lng, e.lngLat.lat);
        const initialTitle = 'Wyszukiwanie adresu...';
        const type =
          (props.building as string | undefined) ||
          (props.type as string | undefined) ||
          (buildingFeature ? 'Zabudowa miejska' : 'Wskazana lokalizacja');

        const buildingInfo: SelectedBuildingInfo = {
          name: initialTitle,
          type,
          height: Math.round(height),
          levels,
          district: initialDistrict,
          coordinates: [e.lngLat.lng, e.lngLat.lat],
        };

        cachedAnalysisRef.current = {};

        if (isRefMode) {
          setReferenceBuilding(buildingInfo);
          referenceBuildingRef.current = buildingInfo;
          setActiveFocusPoint('reference');
          activeFocusPointRef.current = 'reference';
        } else if (isHomeMode) {
          setHomeBuilding(buildingInfo);
          homeBuildingRef.current = buildingInfo;
          setActiveFocusPoint('home');
          activeFocusPointRef.current = 'home';
        } else {
          if (!homeBuildingRef.current) {
            setHomeBuilding(buildingInfo);
            homeBuildingRef.current = buildingInfo;
            setActiveFocusPoint('home');
            activeFocusPointRef.current = 'home';
          } else {
            setReferenceBuilding(buildingInfo);
            referenceBuildingRef.current = buildingInfo;
            setActiveFocusPoint('reference');
            activeFocusPointRef.current = 'reference';
          }
        }
        setSelectedBuilding(buildingInfo);

        const currentPointType: 'home' | 'reference' =
          isHomeMode || (!isRefMode && !homeBuildingRef.current) ? 'home' : 'reference';

        // Wyświetlenie efektownego wskaźnika przestrzennego 3D oraz podświetlenia bryły
        showBuildingHighlightAndIndicator(mapInstance, buildingInfo, currentPointType);

        // Wyszukiwanie rzeczywistej nazwy ulicy i numeru budynku przez reverse-geocoding
        const currentLng = e.lngLat.lng;
        const currentLat = e.lngLat.lat;

        reverseGeocodeKrakow(currentLng, currentLat).then((resolved) => {
          if (selectedMarkerRef.current) {
            const el = selectedMarkerRef.current.getElement();
            const titleEl = el.querySelector('.indicator-address-title');
            const districtEl = el.querySelector('.indicator-district-text');
            if (titleEl) titleEl.textContent = resolved.address;
            if (districtEl) districtEl.textContent = resolved.district;
          }

          const updateResolved = (prev: SelectedBuildingInfo | null) => {
            if (!prev) return null;
            if (prev.coordinates[0] === currentLng && prev.coordinates[1] === currentLat) {
              return {
                ...prev,
                name: resolved.address,
                district: resolved.district,
              };
            }
            return prev;
          };

          setSelectedBuilding(updateResolved);
          setHomeBuilding(updateResolved);
          setReferenceBuilding(updateResolved);
        });

      });
    });

    mapRef.current = mapInstance;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Przeliczanie analizy dojazdów i aktualizacja warstw na mapie
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (activeOriginBuilding && currentDestinations.length > 0) {
      // 0. Sprawdzamy czy mamy już obliczone i zcache'owane dane dla obu punktów
      if (
        referenceBuilding &&
        homeBuilding &&
        cachedAnalysisRef.current.home &&
        cachedAnalysisRef.current.reference
      ) {
        const target =
          activeFocusPointRef.current === 'home'
            ? cachedAnalysisRef.current.home
            : cachedAnalysisRef.current.reference;
        setCommuteAnalysis(target);
        routesRef.current = target.routes;
        updateDestinationMarkers(map, currentDestinations, target.routes);
        return;
      }

      // 1. Natychmiastowe wstępne wyniki w panelu HUD i markery celów
      let baseAnalysis: CommuteAnalysis;

      if (referenceBuilding && homeBuilding) {
        const homeBase = calculateCommuteAnalysis(homeBuilding.coordinates, currentDestinations);
        const refBase = calculateCommuteAnalysis(referenceBuilding.coordinates, currentDestinations);
        refBase.comparisonToHome = calculateRelationalComparison(refBase, homeBase);

        cachedAnalysisRef.current.home = homeBase;
        cachedAnalysisRef.current.reference = refBase;

        baseAnalysis = activeFocusPointRef.current === 'home' ? homeBase : refBase;
      } else {
        baseAnalysis = calculateCommuteAnalysis(activeOriginBuilding.coordinates, currentDestinations);
        cachedAnalysisRef.current.home = baseAnalysis;
      }

      setCommuteAnalysis(baseAnalysis);
      routesRef.current = baseAnalysis.routes;
      updateDestinationMarkers(map, currentDestinations, baseAnalysis.routes);
    } else {
      setCommuteAnalysis(null);
      routesRef.current = [];
      updateDestinationMarkers(map, currentDestinations, []);
    }
  }, [
    activeOriginBuilding,
    homeBuilding,
    referenceBuilding,
    activeProfile,
    mapLoaded,
    hasPresetLoaded,
    customDestinations,
    updateDestinationMarkers,
  ]);

  // Nakładka canvas: łuki 3D wznoszące się nad miastem + synchroniczne wiązki światła
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const canvas = arcsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STATUS_COLOR: Record<string, string> = {
      optimal: '#10b981',
      moderate: '#f59e0b',
      heavy: '#f43f5e',
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const w = Math.round(width * dpr);
      const h = Math.round(height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Gładka krzywa przechodząca przez punkty ekranowe (zaokrąglenie punktami środkowymi)
    const strokeCurve = (pts: Array<{ x: number; y: number }>) => {
      ctx.beginPath();
      if (pts.length < 2) return;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const prev = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    };

    const render = () => {
      resize();
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const routes = routesRef.current;
      if (routes.length > 0) {
        animProgressRef.current = (animProgressRef.current + 0.0055) % 1;
        const progress = animProgressRef.current;

        // 1. Cień rzucany na miasto — podkreśla wysokość łuku
        routes.forEach((route) => {
          const ground = route.trajectoryCoordinates.map((c) => map.project(c));
          if (ground.length < 2) return;
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.shadowColor = 'rgba(15, 23, 42, 0.55)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 12;
          strokeCurve(ground);
          ctx.stroke();
          ctx.restore();
        });

        // 2. Łuki 3D wznoszące się nad miastem
        const liftedPerRoute: Array<Array<{ x: number; y: number }>> = [];
        routes.forEach((route) => {
          const ground = route.trajectoryCoordinates.map((c) => map.project(c));
          if (ground.length < 2) {
            liftedPerRoute.push([]);
            return;
          }

          const chord = Math.hypot(
            ground[ground.length - 1].x - ground[0].x,
            ground[ground.length - 1].y - ground[0].y
          );
          const lift = Math.min(Math.max(chord * 0.34, 46), 240);
          const lifted = ground.map((p, i) => {
            const t = i / (ground.length - 1);
            return { x: p.x, y: p.y - lift * 4 * t * (1 - t) };
          });
          liftedPerRoute.push(lifted);

          const color = STATUS_COLOR[route.status] ?? '#6366f1';

          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Poświata łuku
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = color;
          ctx.lineWidth = 9;
          ctx.shadowColor = color;
          ctx.shadowBlur = 16;
          strokeCurve(lifted);
          ctx.stroke();

          // Neonowy obrys łuku
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3.4;
          strokeCurve(lifted);
          ctx.stroke();

          // Jasny rdzeń łuku
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          strokeCurve(lifted);
          ctx.stroke();

          ctx.restore();
        });

        // 3. Synchroniczne wiązki światła biegnące po łukach (identyczny czas dla wszystkich)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        const TRAIL_LENGTH = 0.26;

        routes.forEach((route, routeIndex) => {
          const lifted = liftedPerRoute[routeIndex];
          if (!lifted || lifted.length < 2) return;

          const lastIndex = lifted.length - 1;
          const sampleAt = (p: number) => {
            const exact = Math.min(Math.max(p, 0), 1) * lastIndex;
            const i = Math.min(lastIndex - 1, Math.max(0, Math.floor(exact)));
            const f = exact - i;
            return {
              x: lifted[i].x + (lifted[i + 1].x - lifted[i].x) * f,
              y: lifted[i].y + (lifted[i + 1].y - lifted[i].y) * f,
            };
          };

          const head = progress;
          const tail = Math.max(0, progress - TRAIL_LENGTH);
          const iStart = Math.floor(tail * lastIndex);
          const iEnd = Math.ceil(head * lastIndex);
          if (iEnd <= iStart + 1) return;

          const segment: Array<{ x: number; y: number }> = [sampleAt(tail)];
          for (let i = iStart + 1; i < iEnd; i++) segment.push(lifted[i]);
          segment.push(sampleAt(head));

          const color = STATUS_COLOR[route.status] ?? '#6366f1';
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = color;
          ctx.lineWidth = 7;
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
          strokeCurve(segment);
          ctx.stroke();

          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.6;
          ctx.shadowBlur = 8;
          strokeCurve(segment);
          ctx.stroke();
        });
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mapLoaded]);
  // Rotacja animowana 360°
  useEffect(() => {
    isRotatingRef.current = isRotating;
    if (!isRotating || !mapRef.current) return;

    let animId: number;
    const rotateStep = () => {
      if (!isRotatingRef.current || !mapRef.current) return;
      const currentBearing = mapRef.current.getBearing();
      mapRef.current.setBearing((currentBearing + 0.35) % 360);
      animId = requestAnimationFrame(rotateStep);
    };

    animId = requestAnimationFrame(rotateStep);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRotating]);

  // Reset zaznaczenia
  const handleClearSelection = () => {
    if (isSwitchingBuildingRef.current) return;
    isSwitchingBuildingRef.current = true;
    setSelectedBuilding(null);
    setHomeBuilding(null);
    setReferenceBuilding(null);
    homeBuildingRef.current = null;
    referenceBuildingRef.current = null;
    setCommuteAnalysis(null);
    setActiveFocusPoint('reference');
    activeFocusPointRef.current = 'reference';
    cachedAnalysisRef.current = {};
    routesRef.current = [];
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
    if (mapRef.current) {
      destinationMarkersRef.current.forEach((m) => m.remove());
      destinationMarkersRef.current = [];
      const selSrc = mapRef.current.getSource('selected-building-source');
      if (selSrc && selSrc.type === 'geojson') {
        (selSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }
    }
    isSwitchingBuildingRef.current = false;
  };

  // Całkowity reset danych analizy, celów, presetów i widoku kamery 3D
  const handleResetData = () => {
    if (isSwitchingBuildingRef.current) return;
    isSwitchingBuildingRef.current = true;

    // 1. Reset zaznaczonych budynków i analiz
    setSelectedBuilding(null);
    setHomeBuilding(null);
    setReferenceBuilding(null);
    homeBuildingRef.current = null;
    referenceBuildingRef.current = null;
    setCommuteAnalysis(null);
    setActiveFocusPoint('reference');
    activeFocusPointRef.current = 'reference';
    cachedAnalysisRef.current = {};
    routesRef.current = [];

    // 2. Reset celów, profili i presetów
    setHasPresetLoaded(false);
    setCustomDestinations([]);
    setProfiles(COMMUTE_PROFILES);
    setActiveProfileId(COMMUTE_PROFILES[0].id);

    // 3. Reset trybów interakcji
    setIsSelectingHome(false);
    setIsSelectingReference(false);
    setIsAddingTarget(false);
    isSelectingHomeRef.current = false;
    isSelectingReferenceRef.current = false;
    isAddingTargetRef.current = false;

    // 4. Reset obrotu i popupów
    setIsRotating(false);
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    // 5. Wyczyszczenie warstw graficznych na mapie 3D
    if (mapRef.current) {
      destinationMarkersRef.current.forEach((m) => m.remove());
      destinationMarkersRef.current = [];
      const selSrc = mapRef.current.getSource('selected-building-source');
      if (selSrc && selSrc.type === 'geojson') {
        (selSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }

      // 6. Płynny powrót kamery do panoramy Krakowa
      mapRef.current.easeTo({
        center: [19.9373, 50.0617],
        zoom: 15.5,
        pitch: 62,
        bearing: -20,
        essential: true,
        duration: 1200,
      });
    }

    isSwitchingBuildingRef.current = false;
    toast.info('Zresetowano dane analizy dojazdów');
  };


  // Wyświetlenie podświetlenia budynku 3D oraz dymka informacyjnego
  // Wyświetlenie podświetlenia budynku 3D oraz efektownego wskaźnika przestrzennego (3D Spatial Beacon)
  const showBuildingHighlightAndIndicator = (
    map: Map,
    building: SelectedBuildingInfo,
    pointType: 'home' | 'reference'
  ) => {
    // 1. Bezpieczne usunięcie poprzedniego wskaźnika
    if (selectedMarkerRef.current) {
      isSwitchingBuildingRef.current = true;
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
      isSwitchingBuildingRef.current = false;
    }

    // 2. Efektowny wskaźnik przestrzenny 3D — spójny z językiem wizualnym paneli HUD
    const isHome = pointType === 'home';
    const highlightColor = isHome ? '#f59e0b' : '#3b82f6';
    const accent = isHome
      ? {
          border: 'border-amber-400/45',
          glow: 'shadow-[0_0_18px_rgba(245,158,11,0.28)]',
          iconBg: 'bg-amber-500/15 text-amber-300 border border-amber-400/25',
          dotBg: 'bg-amber-400',
          subColor: 'text-amber-300',
          pointer: 'border-t-amber-400/80',
          stem: 'bg-gradient-to-b from-amber-400 to-amber-500/20 shadow-[0_0_6px_rgba(245,158,11,0.7)]',
          ping: 'border-amber-400 bg-amber-400/25',
          core: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]',
        }
      : {
          border: 'border-blue-400/45',
          glow: 'shadow-[0_0_18px_rgba(59,130,246,0.28)]',
          iconBg: 'bg-blue-500/15 text-blue-300 border border-blue-400/25',
          dotBg: 'bg-blue-400',
          subColor: 'text-blue-300',
          pointer: 'border-t-blue-400/80',
          stem: 'bg-gradient-to-b from-blue-400 to-blue-500/20 shadow-[0_0_6px_rgba(59,130,246,0.7)]',
          ping: 'border-blue-400 bg-blue-400/25',
          core: 'bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.9)]',
        };
    const typeLabel = isHome ? 'Obecne miejsce zamieszkania' : 'Nowe miejsce zamieszkania';
    const typeEmoji = isHome ? '🏠' : '🏢';

    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'krakow-3d-spatial-indicator group select-none pointer-events-auto cursor-pointer flex flex-col items-center';
    indicatorEl.style.zIndex = '7';
    indicatorEl.innerHTML = `
      <div class="relative flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-2xl bg-slate-950/90 backdrop-blur-xl ${accent.border} ${accent.glow} border transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1">
        <div class="size-7 sm:size-8 rounded-lg flex items-center justify-center shrink-0 ${accent.iconBg} text-base">
          ${typeEmoji}
        </div>
        <div class="min-w-0 flex-1 pr-1">
          <div class="flex items-center gap-1.5">
            <span class="size-1.5 rounded-full ${accent.dotBg} animate-pulse"></span>
            <span class="text-[9px] uppercase font-bold tracking-wider ${accent.subColor}">
              ${typeLabel}
            </span>
          </div>
          <div class="text-[11px] sm:text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[220px] indicator-address-title leading-tight mt-0.5">
            ${building.name}
          </div>
          <div class="text-[10px] text-slate-400 truncate indicator-district-text">
            ${building.district}
          </div>
        </div>
        <button type="button" class="indicator-close-btn p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Wyczyść zaznaczenie">
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] ${accent.pointer} -mt-[1px]"></div>
      <div class="w-0.5 h-6 ${accent.stem}"></div>
      <div class="relative flex items-center justify-center size-5 -mt-2.5">
        <div class="absolute size-5 rounded-full border-2 ${accent.ping} animate-ping"></div>
        <div class="size-2.5 rounded-full ${accent.core}"></div>
      </div>
    `;

    const closeBtn = indicatorEl.querySelector('.indicator-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleClearSelection();
      });
    }

    indicatorEl.onclick = (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.indicator-close-btn')) return;
      map.flyTo({
        center: building.coordinates,
        zoom: 16.5,
        pitch: 62,
        duration: 1200,
        essential: true,
      });
    };

    const marker = new maplibregl.Marker({
      element: indicatorEl,
      anchor: 'bottom',
    })
      .setLngLat(building.coordinates)
      .addTo(map);

    selectedMarkerRef.current = marker;
    // 3. Podświetlenie bryły budynku 3D z odpowiednim kolorem
    const updateGeometry = () => {
      if (!mapRef.current) return;
      const screenPoint = mapRef.current.project(building.coordinates);
      const features = mapRef.current.queryRenderedFeatures(screenPoint);
      let buildingFeature = features.find(
        (f: MapGeoJSONFeature) =>
          f.layer.id !== 'selected-building-highlight' &&
          (f.layer.type === 'fill-extrusion' ||
            f.sourceLayer === 'building' ||
            f.layer.id.includes('building'))
      );

      if (!buildingFeature) {
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [screenPoint.x - 14, screenPoint.y - 14],
          [screenPoint.x + 14, screenPoint.y + 14],
        ];
        const bboxFeatures = mapRef.current.queryRenderedFeatures(bbox);
        buildingFeature = bboxFeatures.find(
          (f: MapGeoJSONFeature) =>
            f.layer.id !== 'selected-building-highlight' &&
            (f.layer.type === 'fill-extrusion' ||
              f.sourceLayer === 'building' ||
              f.layer.id.includes('building'))
        );
      }

      const source = mapRef.current.getSource('selected-building-source') as GeoJSONSource | undefined;
      if (source && source.type === 'geojson') {
        const height = building.height || 22;
        if (buildingFeature && buildingFeature.geometry) {
          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  render_height: height + 0.5,
                  height: height + 0.5,
                  render_min_height: 0,
                  min_height: 0,
                  color: highlightColor,
                },
                geometry: extractClickedPolygon(buildingFeature.geometry, building.coordinates),
              },
            ],
          });
        } else {
          const d = 0.00018;
          const [lng, lat] = building.coordinates;
          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  render_height: height + 0.5,
                  height: height + 0.5,
                  render_min_height: 0,
                  min_height: 0,
                  color: highlightColor,
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [lng - d, lat - d],
                      [lng + d, lat - d],
                      [lng + d, lat + d],
                      [lng - d, lat + d],
                      [lng - d, lat - d],
                    ],
                  ],
                },
              },
            ],
          });
        }
      }
    };

    updateGeometry();
    map.once('moveend', updateGeometry);
  };

  // Przełączanie aktywnego punktu analizy i widoku (obecne miejsce zamieszkania vs nowe miejsce zamieszkania)
  const handleSelectFocusPoint = (point: 'home' | 'reference') => {
    setActiveFocusPoint(point);
    activeFocusPointRef.current = point;

    const target = point === 'home' ? homeBuilding : referenceBuilding;
    if (!target) return;

    setSelectedBuilding(target);

    // 1. Podświetlenie budynku i pokazanie dymka / tooltipa
    if (mapRef.current) {
      showBuildingHighlightAndIndicator(mapRef.current, target, point);

      // 2. Płynne wycentrowanie widoku 3D na wybranym miejscu
      mapRef.current.flyTo({
        center: target.coordinates,
        zoom: 16.3,
        pitch: 62,
        duration: 1400,
        essential: true,
      });

      // 3. Natychmiastowa aktywacja zcache'owanych tras i KPI dla wybranego punktu (bez opóźnień)
      const cached =
        point === 'home'
          ? cachedAnalysisRef.current.home
          : cachedAnalysisRef.current.reference;

      if (cached) {
        setCommuteAnalysis(cached);
        routesRef.current = cached.routes;
        updateDestinationMarkers(mapRef.current, currentDestinations, cached.routes);
      }
    }
  };

  // Fokus na trasie do wybranego celu z panelu HUD — kamera obejmuje cały łuk (budynek + cel)
  const handleFocusDestination = (route: CommuteRouteResult) => {
    const map = mapRef.current;
    if (!map || !activeOriginBuilding) return;

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(activeOriginBuilding.coordinates);
    bounds.extend(route.coordinates);

    const targetPitch = 55;
    // Rezerwa miejsca: panel HUD po prawej, unoszący się łuk u góry, pigułka celu u dołu
    const padding = {
      top: 260,
      bottom: 130,
      left: 110,
      right: window.innerWidth >= 640 ? 420 : 340,
    };

    const camera = map.cameraForBounds(bounds, { bearing: map.getBearing(), padding });

    // Zapas zoomu, bo cameraForBounds liczy dopasowanie bez pochylenia kamery;
    // limit 16 chroni przed absurdalnym przybliżeniem dla celów w tym samym punkcie
    const fittedZoom = (camera?.zoom ?? map.getZoom()) - 0.5;

    map.flyTo({
      center: camera?.center ?? bounds.getCenter(),
      zoom: Math.min(fittedZoom, 16),
      bearing: camera?.bearing ?? map.getBearing(),
      pitch: targetPitch,
      duration: 1400,
      essential: true,
    });
  };

  // Centrowanie widoku mapy na wybranym aktualnie budynku (punkcie)
  const handleCenterOnSelectedBuilding = () => {
    if (!mapRef.current || !activeOriginBuilding) return;
    mapRef.current.flyTo({
      center: activeOriginBuilding.coordinates,
      zoom: 16.5,
      pitch: 62,
      duration: 1200,
      essential: true,
    });
  };

  // Wczytanie gotowego scenariusza demonstracyjnego (para: obecne miejsce zamieszkania + lokalizacja oceniana)
  const handleSelectPreset = (profileId: string) => {
    const map = mapRef.current;
    const scenario = DEMO_PRESET_SCENARIOS[profileId];
    if (!map || !scenario) return;

    if (selectedMarkerRef.current) {
      isSwitchingBuildingRef.current = true;
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
      isSwitchingBuildingRef.current = false;
    }

    setActiveProfileId(profileId);
    setHasPresetLoaded(true);
    setCustomDestinations([]);
    setHomeBuilding(scenario.home);
    setReferenceBuilding(scenario.reference);
    homeBuildingRef.current = scenario.home;
    referenceBuildingRef.current = scenario.reference;
    setSelectedBuilding(scenario.reference);
    setActiveFocusPoint('reference');
    activeFocusPointRef.current = 'reference';
    cachedAnalysisRef.current = {};

    showBuildingHighlightAndIndicator(map, scenario.reference, 'reference');

    map.flyTo({
      center: scenario.reference.coordinates,
      zoom: 16.3,
      pitch: 62,
      bearing: -20,
      essential: true,
      duration: 1600,
    });

    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      toast.success(`Scenariusz: ${profile.name}`, {
        description: `${scenario.label} • ${profile.destinations.length} cele do przeanalizowania`,
      });
    }
  };
  // Usuwanie zdefiniowanego celu
  const handleRemoveDestination = (destinationId: string) => {
    cachedAnalysisRef.current = {};
    setCustomDestinations((prev) => prev.filter((d) => d.id !== destinationId));
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfile.id
          ? {
              ...p,
              destinations: p.destinations.filter((d) => d.id !== destinationId),
            }
          : p
      )
    );
  };

  // Otwarcie edycji celu
  const handleOpenEditDestination = (dest: CommuteDestination) => {
    setEditingDestination(dest);
    setIsAddDialogOpen(true);
  };

  // Zatwierdzenie nowego lub edytowanego celu z modala
  const handleConfirmAddDestination = (data: {
    id?: string;
    name: string;
    category: CommuteDestination['category'];
    icon: string;
    frequencyPerWeek: number;
    travelMode: TravelMode;
    coordinates: [number, number];
  }) => {
    cachedAnalysisRef.current = {};

    if (data.id) {
      // Aktualizacja istniejącego celu
      setCustomDestinations((prev) =>
        prev.map((d) =>
          d.id === data.id
            ? {
                ...d,
                name: data.name,
                category: data.category,
                icon: data.icon,
                frequencyPerWeek: data.frequencyPerWeek,
                travelMode: data.travelMode,
              }
            : d
        )
      );
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === activeProfile.id
            ? {
                ...p,
                destinations: p.destinations.map((d) =>
                  d.id === data.id
                    ? {
                        ...d,
                        name: data.name,
                        category: data.category,
                        icon: data.icon,
                        frequencyPerWeek: data.frequencyPerWeek,
                        travelMode: data.travelMode,
                      }
                    : d
                ),
              }
            : p
        )
      );
    } else {
      // Dodanie nowego celu
      const newDest: CommuteDestination = {
        id: 'dest_custom_' + Date.now(),
        name: data.name,
        category: data.category,
        icon: data.icon,
        coordinates: data.coordinates,
        frequencyPerWeek: data.frequencyPerWeek,
        travelMode: data.travelMode,
      };

      setCustomDestinations((prev) => [...prev, newDest]);
    }

    setIsAddDialogOpen(false);
  };


  // Przekierowanie mapy i wskazanie punktu z wyszukiwarki adresów
  const handleSelectSearchResult = (item: SearchResultItem) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: item.coordinates,
      zoom: 16.6,
      pitch: 62,
      bearing: -20,
      essential: true,
      duration: 1800,
    });

    const pointType = isSelectingHome ? 'home' : 'reference';
    const buildingInfo: SelectedBuildingInfo = {
      name: item.name || item.address,
      type: 'Adres z wyszukiwarki',
      height: 22,
      levels: 5,
      district: item.district,
      coordinates: item.coordinates,
    };

    if (isSelectingHome) {
      setHomeBuilding(buildingInfo);
      homeBuildingRef.current = buildingInfo;
      setActiveFocusPoint('home');
      activeFocusPointRef.current = 'home';
      setIsSelectingHome(false);
      isSelectingHomeRef.current = false;
    } else {
      setReferenceBuilding(buildingInfo);
      referenceBuildingRef.current = buildingInfo;
      setActiveFocusPoint('reference');
      activeFocusPointRef.current = 'reference';
      setIsSelectingReference(false);
      isSelectingReferenceRef.current = false;
    }

    setSelectedBuilding(buildingInfo);

    showBuildingHighlightAndIndicator(mapRef.current, buildingInfo, pointType);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* KONTENER MAPY WEBGL - 100% EKRANU */}
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-slate-950"
        style={{
          cursor: isAddingTarget || isSelectingHome || isSelectingReference ? 'crosshair' : 'grab',
        }}
      />

      {/* NAKŁADKA CANVAS: ŁUKI 3D WZNOSZĄCE SIĘ NAD MIASTEM */}
      <canvas
        ref={arcsCanvasRef}
        className="absolute inset-0 z-[5] w-full h-full pointer-events-none"
      />

      {/* PŁYWAJĄCY BANER CELOWNIKA */}
      {isAddingTarget && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-3">
          <CrosshairIcon className="size-4 animate-spin" />
          <span className="text-xs font-semibold">
            Tryb wyboru celu: Kliknij dowolny punkt lub budynek na mapie
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsAddingTarget(false)}
            className="h-6 px-2 text-[11px] bg-white text-rose-700 hover:bg-white/90 font-medium"
          >
            Anuluj (Esc)
          </Button>
        </div>
      )}

      {/* PŁYWAJĄCY BANER WYBORU OBECNEGO MIEJSCA ZAMIESZKANIA */}
      {isSelectingHome && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-amber-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-3">
          <HomeIcon className="size-4 animate-bounce" />
          <span className="text-xs font-semibold">
            Tryb wyboru obecnego miejsca zamieszkania: Kliknij dowolny budynek 3D na mapie
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsSelectingHome(false)}
            className="h-6 px-2 text-[11px] bg-white text-amber-900 hover:bg-white/90 font-medium"
          >
            Anuluj (Esc)
          </Button>
        </div>
      )}

      {/* PŁYWAJĄCY BANER WYBORU NOWEGO MIEJSCA ZAMIESZKANIA */}
      {isSelectingReference && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-3">
          <Building2Icon className="size-4 animate-bounce" />
          <span className="text-xs font-semibold">
            Tryb wyboru nowego miejsca zamieszkania: Kliknij budynek 3D na mapie
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsSelectingReference(false)}
            className="h-6 px-2 text-[11px] bg-white text-blue-900 hover:bg-white/90 font-medium"
          >
            Anuluj (Esc)
          </Button>
        </div>
      )}

      {/* STAN ŁADOWANIA */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs z-30">
          <div className="text-center space-y-2">
            <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-medium text-foreground">Inicjalizacja 3D Kraków WebGL...</div>
            <div className="text-[11px] text-muted-foreground">Ładowanie brył budynków i siatki terenu</div>
          </div>
        </div>
      )}

      {/* PŁYWAJĄCY PASEK KONTROLI KAMERY 3D ORAZ WYSZUKIWARKA ADRESÓW (LEWY GÓRNY RÓG) */}
      <div className="absolute top-4 left-14 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-lg">
        <Button
          variant={isRotating ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsRotating(!isRotating)}
          className="text-xs h-7 px-2.5 gap-1.5 font-medium"
        >
          <RotateCwIcon className={`size-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          {isRotating ? 'Zatrzymaj' : 'Obrót 360°'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCenterOnSelectedBuilding}
          disabled={!activeOriginBuilding}
          className="size-7 p-0 disabled:opacity-50"
          title={activeOriginBuilding ? `Wycentruj na: ${activeOriginBuilding.name}` : 'Wskaż obecne miejsce zamieszkania lub budynek na mapie'}
          aria-label="Centruj na wybranym punkcie"
        >
          <LocateFixedIcon className="size-3.5 text-primary" />
        </Button>

        <AddressSearch onSelectLocation={handleSelectSearchResult} />
      </div>
      {/* PŁYWAJĄCY PANEL COMMUTE HUD (PRAWY GÓRNY RÓG) */}
      <CommuteHud
        activeProfile={currentProfile}
        analysis={commuteAnalysis}
        homeBuildingName={homeBuilding?.name}
        referenceBuildingName={referenceBuilding?.name}
        selectedBuildingName={activeOriginBuilding?.name}
        activeFocusPoint={activeFocusPoint}
        onSelectFocusPoint={handleSelectFocusPoint}
        onFocusDestination={handleFocusDestination}
        presets={presetOptions}
        activePresetId={hasPresetLoaded ? activeProfileId : undefined}
        onSelectPreset={handleSelectPreset}
        isAddingTarget={isAddingTarget}
        onToggleAddTarget={() => {
          if (!isAddingTarget) {
            setIsSelectingHome(false);
            setIsSelectingReference(false);
          }
          setIsAddingTarget(!isAddingTarget);
        }}
        isSelectingHome={isSelectingHome}
        onToggleSelectHome={() => {
          if (!isSelectingHome) {
            setIsAddingTarget(false);
            setIsSelectingReference(false);
          }
          setIsSelectingHome(!isSelectingHome);
        }}
        isSelectingReference={isSelectingReference}
        onToggleSelectReference={() => {
          if (!isSelectingReference) {
            setIsAddingTarget(false);
            setIsSelectingHome(false);
          }
          setIsSelectingReference(!isSelectingReference);
        }}
        onClearSelection={handleClearSelection}
        onRemoveDestination={handleRemoveDestination}
        onUpdateDestinationMode={handleUpdateDestinationMode}
        onEditDestination={handleOpenEditDestination}
        onResetData={handleResetData}
      />


      {/* INSTRUKCJA DLA UŻYTKOWNIKA */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 bg-background/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground shadow-sm">
        <InfoIcon className="size-3.5 text-primary" />
        <span>Kliknij dowolny budynek w 3D, aby wyliczyć czas dojazdów do punktów życia.</span>
      </div>

      {/* MODAL DEFINIOWANIA LUB EDYCJI CELU */}
      <AddDestinationDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setPendingDestination(null);
            setEditingDestination(null);
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
            }
          }
        }}
        coordinates={
          editingDestination
            ? editingDestination.coordinates
            : (pendingDestination?.coordinates || null)
        }
        initialAddress={
          editingDestination
            ? editingDestination.name
            : (pendingDestination?.initialAddress || '')
        }
        district={
          editingDestination
            ? getDistrict(editingDestination.coordinates[0], editingDestination.coordinates[1])
            : (pendingDestination?.district || '')
        }
        initialDestination={editingDestination}
        onConfirm={handleConfirmAddDestination}
      />
    </div>
  );
}
