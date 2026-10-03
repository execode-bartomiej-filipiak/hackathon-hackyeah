'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type {
  Map,
  Popup,
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
} from 'lucide-react';
import { COMMUTE_PROFILES } from '@/mock/commute-presets';
import { calculateCommuteAnalysis, fetchEnhancedCommuteAnalysis } from '@/lib/commute';
import { CommuteHud } from '@/components/commute-hud';
import { AddDestinationDialog } from '@/components/add-destination-dialog';
import type {
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

interface PulseLineFeature {
  type: 'Feature';
  properties: { status: 'optimal' | 'moderate' | 'heavy' };
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

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
  const popupRef = useRef<Popup | null>(null);
  const isSwitchingBuildingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const destinationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routesRef = useRef<CommuteRouteResult[]>([]);
  const animProgressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Stan profili i celów podróży
  const [profiles, setProfiles] = useState<CommuteProfile[]>(COMMUTE_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(COMMUTE_PROFILES[0].id);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const isAddingTargetRef = useRef(false);
  const activeProfileIdRef = useRef(activeProfileId);

  useEffect(() => {
    isAddingTargetRef.current = isAddingTarget;
  }, [isAddingTarget]);

  useEffect(() => {
    activeProfileIdRef.current = activeProfileId;
  }, [activeProfileId]);

  // Klawisz Escape do anulowania celownika
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddingTarget) {
        setIsAddingTarget(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingTarget]);

  const handleUpdateDestinationMode = (destinationId: string, mode: TravelMode) => {
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
        const el = document.createElement('div');
        el.className = 'commute-destination-marker cursor-pointer select-none group';

        const statusBg =
          route?.status === 'optimal'
            ? 'bg-emerald-600 text-white'
            : route?.status === 'moderate'
            ? 'bg-amber-600 text-white'
            : route?.status === 'heavy'
            ? 'bg-rose-600 text-white'
            : 'bg-primary text-primary-foreground';

        el.innerHTML = `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border border-white/40 backdrop-blur-md ${statusBg} text-xs font-semibold transition-transform group-hover:scale-105">
            <span class="text-sm">${dest.icon}</span>
            <span class="truncate max-w-[110px] hidden sm:inline">${dest.name.split(' ')[0]}</span>
            ${
              route
                ? `<span class="bg-black/35 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight">${route.durationMinutes}m</span>`
                : ''
            }
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

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(dest.coordinates)
          .addTo(map);

        destinationMarkersRef.current.push(marker);
      });
    },
    []
  );

  // Aktualizacja trajektorii GeoJSON na mapie
  const updateTrajectoriesLayer = useCallback((map: Map, routes: CommuteRouteResult[]) => {
    const source = map.getSource('commute-trajectories-source');
    if (source && source.type === 'geojson') {
      const geoSource = source as GeoJSONSource;
      geoSource.setData({
        type: 'FeatureCollection',
        features: routes.map((route) => ({
          type: 'Feature',
          properties: {
            status: route.status,
            duration: route.durationMinutes,
          },
          geometry: {
            type: 'LineString',
            coordinates: route.trajectoryCoordinates,
          },
        })),
      });
    }
  }, []);

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
      new maplibregl.AttributionControl({ compact: true, customAttribution: '3D Kraków CommuteScore PoC' }),
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
            'fill-extrusion-color': '#f59e0b',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 18],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.95,
          },
        });
      }

      // Źródło i warstwy trajektorii dojazdów (Commute Lines)
      if (!mapInstance.getSource('commute-trajectories-source')) {
        mapInstance.addSource('commute-trajectories-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // Efekt poświaty linii
        mapInstance.addLayer({
          id: 'commute-trajectories-glow',
          type: 'line',
          source: 'commute-trajectories-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-width': 8,
            'line-opacity': 0.4,
            'line-color': [
              'match',
              ['get', 'status'],
              'optimal',
              '#10b981',
              'moderate',
              '#f59e0b',
              'heavy',
              '#ef4444',
              '#6366f1',
            ],
            'line-blur': 3,
          },
        });

        // Główna linia trajektorii
        mapInstance.addLayer({
          id: 'commute-trajectories-line',
          type: 'line',
          source: 'commute-trajectories-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-width': 4,
            'line-opacity': 0.95,
            'line-color': [
              'match',
              ['get', 'status'],
              'optimal',
              '#10b981',
              'moderate',
              '#f59e0b',
              'heavy',
              '#ef4444',
              '#6366f1',
            ],
          },
        });
      }

      // Źródło i warstwy dla animowanych wiązek światła wzdłuż linii (tylko linie, bez orbów)
      if (!mapInstance.getSource('commute-pulses-source')) {
        mapInstance.addSource('commute-pulses-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Poświata pędzącej wiązki światła (dopasowana do koloru statusu linii)
        mapInstance.addLayer({
          id: 'commute-pulses-glow',
          type: 'line',
          source: 'commute-pulses-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-width': 8,
            'line-color': [
              'match',
              ['get', 'status'],
              'optimal',
              '#10b981',
              'moderate',
              '#f59e0b',
              'heavy',
              '#ef4444',
              '#6366f1',
            ],
            'line-blur': 2.5,
            'line-opacity': 0.7,
          },
        });

        // Jasny rdzeń pędzącej wiązki linii
        mapInstance.addLayer({
          id: 'commute-pulses-core',
          type: 'line',
          source: 'commute-pulses-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-width': 3.5,
            'line-color': '#ffffff',
            'line-blur': 0.5,
            'line-opacity': 0.95,
          },
        });
      }

      // Kursor pointer nad budynkami 3D
      const buildingLayerIds = ['building-3d', 'building'].filter((id) => mapInstance.getLayer(id));

      mapInstance.on('mousemove', (e: MapLayerMouseEvent) => {
        if (isAddingTargetRef.current) {
          mapInstance.getCanvas().style.cursor = 'crosshair';
          return;
        }

        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: buildingLayerIds.length ? buildingLayerIds : undefined,
        });
        const hasBuilding = features.some(
          (f: MapGeoJSONFeature) =>
            f.layer.type === 'fill-extrusion' ||
            f.sourceLayer === 'building' ||
            f.layer.id.includes('building')
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

        // Tryb standardowy: wybór budynku startowego
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: buildingLayerIds.length ? buildingLayerIds : undefined,
        });

        const buildingFeature: MapGeoJSONFeature | undefined = features.find(
          (f: MapGeoJSONFeature) =>
            f.layer.id !== 'selected-building-highlight' &&
            (f.layer.type === 'fill-extrusion' ||
              f.sourceLayer === 'building' ||
              f.layer.id.includes('building'))
        );

        if (buildingFeature) {
          const props = buildingFeature.properties || {};
          const height =
            Number(props.render_height) ||
            Number(props.height) ||
            (props.levels ? Number(props.levels) * 3.5 : 16);
          const levels =
            Number(props.levels) ||
            Number(props.building_levels) ||
            Math.max(1, Math.round(height / 3.5));
          const initialDistrict = getDistrict(e.lngLat.lng, e.lngLat.lat);
          const initialTitle = 'Wyszukiwanie adresu...';
          const type = (props.building as string | undefined) || (props.type as string | undefined) || 'Zabudowa miejska';

          const buildingInfo: SelectedBuildingInfo = {
            name: initialTitle,
            type,
            height: Math.round(height),
            levels,
            district: initialDistrict,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
          };

          setSelectedBuilding(buildingInfo);

          // Podświetlenie geometrii budynku
          const source = mapInstance.getSource('selected-building-source');
          if (source && source.type === 'geojson') {
            const geoSource = source as GeoJSONSource;
            geoSource.setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {
                    render_height: height + 0.5,
                    height: height + 0.5,
                    render_min_height: 0,
                    min_height: 0,
                  },
                  geometry: extractClickedPolygon(buildingFeature.geometry, [
                    e.lngLat.lng,
                    e.lngLat.lat,
                  ]),
                },
              ],
            });
          }

          // Tooltip 3D na mapie - bezpieczne usunięcie poprzedniego dymka bez resetu stanu
          if (popupRef.current) {
            isSwitchingBuildingRef.current = true;
            popupRef.current.remove();
            popupRef.current = null;
            isSwitchingBuildingRef.current = false;
          }

          const popupElement = document.createElement('div');
          popupElement.className = 'p-1 text-slate-900 font-sans';
          popupElement.innerHTML = `
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
              <span>📍</span> <span class="building-address-title">${initialTitle}</span>
            </div>
            <div style="font-size: 11px; color: #475569;">
              Dzielnica: <strong style="color: #0f172a;" class="building-district-text">${initialDistrict}</strong>
            </div>
          `;

          const newPopup = new maplibregl.Popup({
            offset: [0, -12],
            closeButton: true,
            closeOnClick: false,
            className: 'krakow-map-popup',
          })
            .setLngLat(e.lngLat)
            .setDOMContent(popupElement)
            .addTo(mapInstance);

          newPopup.on('close', () => {
            if (isSwitchingBuildingRef.current) return;
            handleClearSelection();
          });

          popupRef.current = newPopup;

          // Wyszukiwanie rzeczywistej nazwy ulicy i numeru budynku
          const currentLng = e.lngLat.lng;
          const currentLat = e.lngLat.lat;

          reverseGeocodeKrakow(currentLng, currentLat).then((resolved) => {
            if (popupRef.current) {
              const titleEl = popupElement.querySelector('.building-address-title');
              const districtEl = popupElement.querySelector('.building-district-text');
              if (titleEl) titleEl.textContent = resolved.address;
              if (districtEl) districtEl.textContent = resolved.district;
            }

            setSelectedBuilding((prev) => {
              if (!prev) return null;
              if (prev.coordinates[0] === currentLng && prev.coordinates[1] === currentLat) {
                return {
                  ...prev,
                  name: resolved.address,
                  district: resolved.district,
                };
              }
              return prev;
            });
          });

        }
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

    if (selectedBuilding) {
      // 1. Natychmiastowe wstępne wyniki w panelu HUD i markery celów
      const baseAnalysis = calculateCommuteAnalysis(
        selectedBuilding.coordinates,
        activeProfile.destinations
      );
      setCommuteAnalysis(baseAnalysis);
      updateDestinationMarkers(map, activeProfile.destinations, baseAnalysis.routes);

      // Czyścimy poprzednie trajektorie, by uniknąć przeskakiwania
      updateTrajectoriesLayer(map, []);
      const pulseSrc = map.getSource('commute-pulses-source');
      if (pulseSrc && pulseSrc.type === 'geojson') {
        (pulseSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }

      // 2. Zaplanowanie awaryjnego fallbacku na łuki dopiero po dłuższym czasie (6.5s)
      const controller = new AbortController();
      let isCancelled = false;

      const fallbackTimer = setTimeout(() => {
        if (isCancelled || !mapRef.current) return;
        // Aktywujemy bezpieczny fallback na łuki dopiero, gdy OSRM rzeczywiście nie odpowiedział
        routesRef.current = baseAnalysis.routes;
        updateTrajectoriesLayer(mapRef.current, baseAnalysis.routes);
      }, 6500);

      // 3. Asynchroniczne pobranie prawdziwych tras po ulicach Krakowa (OSRM)
      fetchEnhancedCommuteAnalysis(
        selectedBuilding.coordinates,
        activeProfile.destinations,
        'transit',
        controller.signal
      )
        .then((realAnalysis) => {
          clearTimeout(fallbackTimer);
          if (isCancelled || !mapRef.current) return;
          setCommuteAnalysis(realAnalysis);
          routesRef.current = realAnalysis.routes;
          updateTrajectoriesLayer(mapRef.current, realAnalysis.routes);
          updateDestinationMarkers(mapRef.current, activeProfile.destinations, realAnalysis.routes);
        })
        .catch(() => {
          clearTimeout(fallbackTimer);
          if (isCancelled || !mapRef.current) return;
          routesRef.current = baseAnalysis.routes;
          updateTrajectoriesLayer(mapRef.current, baseAnalysis.routes);
        });

      return () => {
        isCancelled = true;
        clearTimeout(fallbackTimer);
        controller.abort();
      };
    } else {
      setCommuteAnalysis(null);
      routesRef.current = [];
      updateTrajectoriesLayer(map, []);
      updateDestinationMarkers(map, activeProfile.destinations, []);
      const pulseSrc = map.getSource('commute-pulses-source');
      if (pulseSrc && pulseSrc.type === 'geojson') {
        (pulseSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [
    selectedBuilding,
    activeProfile,
    mapLoaded,
    updateTrajectoriesLayer,
    updateDestinationMarkers,
  ]);

  // Ciągła pętla animacji pulsujących wiązek światła wzdłuż linii (tylko linie, bez orbów)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const animate = () => {
      const routes = routesRef.current;

      if (routes.length > 0) {
        animProgressRef.current = (animProgressRef.current + 0.0075) % 1;
        const cycle = animProgressRef.current; // [0, 1)

        const pulseLines: PulseLineFeature[] = [];

        // Faza aktywnego pulsu trwa 76% cyklu, a pozostałe 24% to pauza (oddech pulsu)
        const ACTIVE_RATIO = 0.76;

        if (cycle < ACTIVE_RATIO) {
          const norm = cycle / ACTIVE_RATIO; // [0, 1]
          const pHead = Math.min(1, norm * 1.16);
          const pTail = Math.max(0, (norm - 0.14) * 1.16);

          if (pTail < 1) {
            routes.forEach((r) => {
              const coords = r.trajectoryCoordinates;
              const total = coords.length;
              if (total < 2) return;

              // Precyzyjna ciągła interpolacja pozycji czoła wiązki
              const exactHead = pHead * (total - 1);
              const iHead = Math.min(total - 2, Math.floor(exactHead));
              const fHead = exactHead - iHead;
              const headPt: [number, number] = [
                coords[iHead][0] + (coords[iHead + 1][0] - coords[iHead][0]) * fHead,
                coords[iHead][1] + (coords[iHead + 1][1] - coords[iHead][1]) * fHead,
              ];

              // Precyzyjna interpolacja pozycji ogona wiązki
              const exactTail = pTail * (total - 1);
              const iTail = Math.min(total - 2, Math.floor(exactTail));
              const fTail = exactTail - iTail;
              const tailPt: [number, number] = [
                coords[iTail][0] + (coords[iTail + 1][0] - coords[iTail][0]) * fTail,
                coords[iTail][1] + (coords[iTail + 1][1] - coords[iTail][1]) * fTail,
              ];

              // Składanie geometrii wiązki linii
              const beamCoords: Array<[number, number]> = [tailPt];
              for (let i = iTail + 1; i <= iHead; i++) {
                beamCoords.push(coords[i]);
              }
              beamCoords.push(headPt);

              if (beamCoords.length >= 2) {
                pulseLines.push({
                  type: 'Feature',
                  properties: { status: r.status },
                  geometry: {
                    type: 'LineString',
                    coordinates: beamCoords,
                  },
                });
              }
            });
          }
        }

        const pulseSource = map.getSource('commute-pulses-source');
        if (pulseSource && pulseSource.type === 'geojson') {
          (pulseSource as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: pulseLines,
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

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
    routesRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    if (mapRef.current) {
      updateTrajectoriesLayer(mapRef.current, []);
      updateDestinationMarkers(mapRef.current, activeProfile.destinations, []);
      const selSrc = mapRef.current.getSource('selected-building-source');
      if (selSrc && selSrc.type === 'geojson') {
        (selSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }
      const pulseSrc = mapRef.current.getSource('commute-pulses-source');
      if (pulseSrc && pulseSrc.type === 'geojson') {
        (pulseSrc as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }
    }
    isSwitchingBuildingRef.current = false;
  };

  // Fokus na trasie do wybranego celu z panelu HUD
  const handleFocusDestination = (route: CommuteRouteResult) => {
    if (!mapRef.current || !selectedBuilding) return;

    // Wyznaczamy środek trasy do płynnego objęcia wzrokiem
    const midLng = (selectedBuilding.coordinates[0] + route.coordinates[0]) / 2;
    const midLat = (selectedBuilding.coordinates[1] + route.coordinates[1]) / 2;

    mapRef.current.flyTo({
      center: [midLng, midLat],
      zoom: 15.2,
      pitch: 58,
      duration: 1600,
      essential: true,
    });
  };

  // Centrowanie widoku mapy na wybranym aktualnie budynku (punkcie)
  const handleCenterOnSelectedBuilding = () => {
    if (!mapRef.current || !selectedBuilding) return;
    mapRef.current.flyTo({
      center: selectedBuilding.coordinates,
      zoom: 16.5,
      pitch: 62,
      duration: 1200,
      essential: true,
    });
  };

  // Prezentacyjny przycisk wyboru budynku na scenie
  const handleSelectDemoOrigin = () => {
    if (!mapRef.current) return;

    if (popupRef.current) {
      isSwitchingBuildingRef.current = true;
      popupRef.current.remove();
      popupRef.current = null;
      isSwitchingBuildingRef.current = false;
    }

    const demoCoords: [number, number] = [19.9373, 50.0617];
    const demoBuilding: SelectedBuildingInfo = {
      name: 'Sukiennice & Rynek Główny',
      type: 'Zabytkowa / Handlowa',
      height: 24,
      levels: 3,
      district: 'Stare Miasto',
      coordinates: demoCoords,
    };

    setSelectedBuilding(demoBuilding);

    // Podświetlenie w 3D
    const source = mapRef.current.getSource('selected-building-source');
    if (source && source.type === 'geojson') {
      const geoSource = source as GeoJSONSource;
      geoSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              render_height: 25,
              render_min_height: 0,
            },
            geometry: {
              type: 'Point',
              coordinates: demoCoords,
            },
          },
        ],
      });
    }

    mapRef.current.flyTo({
      center: [19.9450, 50.0550], // perspektywa obejmująca Kazimierz i Zabłocie
      zoom: 15.2,
      pitch: 60,
      bearing: -15,
      essential: true,
      duration: 1800,
    });

  };
  // Usuwanie zdefiniowanego celu
  const handleRemoveDestination = (destinationId: string) => {
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
    if (data.id) {
      // Aktualizacja istniejącego celu
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

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === activeProfile.id
            ? { ...p, destinations: [...p.destinations, newDest] }
            : p
        )
      );
    }

    setIsAddDialogOpen(false);
    setPendingDestination(null);
    setEditingDestination(null);
  };


  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* KONTENER MAPY WEBGL - 100% EKRANU */}
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-slate-950"
        style={{ cursor: isAddingTarget ? 'crosshair' : 'grab' }}
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

      {/* PŁYWAJĄCY PASEK KONTROLI KAMERY 3D (LEWY GÓRNY RÓG) */}
      <div className="absolute top-4 left-14 z-20 flex flex-wrap items-center gap-2 bg-background/90 backdrop-blur-md p-2 rounded-xl border border-border/80 shadow-lg">
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
          disabled={!selectedBuilding}
          className="text-xs h-7 px-2.5 gap-1.5 font-medium disabled:opacity-50"
          title={selectedBuilding ? `Wycentruj na: ${selectedBuilding.name}` : 'Wybierz budynek na mapie, aby wycentrować'}
        >
          <LocateFixedIcon className="size-3.5 text-primary" />
          <span>Centruj punkt</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.easeTo({ pitch: 62, bearing: -20 });
            }
          }}
          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          Reset
        </Button>
      </div>

      {/* PŁYWAJĄCY PANEL COMMUTE HUD (PRAWY GÓRNY RÓG) */}
      <CommuteHud
        activeProfile={activeProfile}
        analysis={commuteAnalysis}
        selectedBuildingName={selectedBuilding?.name}
        onFocusDestination={handleFocusDestination}
        onSelectDemoOrigin={handleSelectDemoOrigin}
        isAddingTarget={isAddingTarget}
        onToggleAddTarget={() => setIsAddingTarget(!isAddingTarget)}
        onRemoveDestination={handleRemoveDestination}
        onUpdateDestinationMode={handleUpdateDestinationMode}
        onEditDestination={handleOpenEditDestination}
      />


      {/* INSTRUKCJA DLA UŻYTKOWNIKA */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 bg-background/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground shadow-sm">
        <InfoIcon className="size-3.5 text-primary" />
        <span>Kliknij dowolny budynek w 3D, aby wyliczyć czas dojazdów do punktów życia.</span>
      </div>

      {/* MODAL DEFINIOWANIA LUB EDYCJI CELU */}
      {(pendingDestination || editingDestination) && (
        <AddDestinationDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setPendingDestination(null);
              setEditingDestination(null);
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
      )}
    </div>
  );
}
