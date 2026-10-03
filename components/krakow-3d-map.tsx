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
  CompassIcon,
  Maximize2Icon,
  RotateCwIcon,
  Building2Icon,
  MapPinIcon,
  RulerIcon,
  InfoIcon,
  XIcon,
} from 'lucide-react';
import { COMMUTE_PROFILES } from '@/mock/commute-presets';
import { calculateCommuteAnalysis } from '@/lib/commute';
import { CommuteHud } from '@/components/commute-hud';
import type {
  CommuteProfile,
  TravelMode,
  CommuteAnalysis,
  CommuteRouteResult,
  CommuteDestination,
} from '@/types/commute';

interface SelectedBuildingInfo {
  name: string;
  type: string;
  height: number;
  levels: number;
  district: string;
  coordinates: [number, number];
}

interface PulseLineFeature {
  type: 'Feature';
  properties: { status: 'optimal' | 'moderate' | 'heavy' };
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

interface PulseHeadFeature {
  type: 'Feature';
  properties: { status: 'optimal' | 'moderate' | 'heavy' };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
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

export function Krakow3DMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const isRotatingRef = useRef(false);
  const destinationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routesRef = useRef<CommuteRouteResult[]>([]);
  const unfurlProgressRef = useRef(0);
  const animProgressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [pitch, setPitch] = useState(62);
  const [bearing, setBearing] = useState(-20);
  const [isRotating, setIsRotating] = useState(false);

  // Stan profilu dojazdów i transportu
  const [activeProfile, setActiveProfile] = useState<CommuteProfile>(COMMUTE_PROFILES[0]);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
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

      // Źródło i warstwy dla animowanych pędzących wiązek światła (Neon Pulses)
      if (!mapInstance.getSource('commute-pulses-source')) {
        mapInstance.addSource('commute-pulses-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        mapInstance.addLayer({
          id: 'commute-pulses-beam',
          type: 'line',
          source: 'commute-pulses-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-width': 5.5,
            'line-color': '#ffffff',
            'line-blur': 1,
            'line-opacity': 0.95,
          },
        });
      }

      // Źródło i warstwy dla głowy impulsu (świecący orb na czele komety)
      if (!mapInstance.getSource('commute-pulse-heads-source')) {
        mapInstance.addSource('commute-pulse-heads-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        mapInstance.addLayer({
          id: 'commute-pulse-heads-glow',
          type: 'circle',
          source: 'commute-pulse-heads-source',
          paint: {
            'circle-radius': 10,
            'circle-color': [
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
            'circle-blur': 0.7,
            'circle-opacity': 0.8,
          },
        });

        mapInstance.addLayer({
          id: 'commute-pulse-heads-core',
          type: 'circle',
          source: 'commute-pulse-heads-source',
          paint: {
            'circle-radius': 4.5,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': [
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

      // Kursor pointer nad budynkami 3D
      const buildingLayerIds = ['building-3d', 'building'].filter((id) => mapInstance.getLayer(id));

      mapInstance.on('mousemove', (e: MapLayerMouseEvent) => {
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

      // Kliknięcie w budynek 3D
      mapInstance.on('click', (e: MapLayerMouseEvent) => {
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: buildingLayerIds.length ? buildingLayerIds : undefined,
        });

        const buildingFeature: MapGeoJSONFeature | undefined = features.find(
          (f: MapGeoJSONFeature) =>
            f.layer.type === 'fill-extrusion' ||
            f.sourceLayer === 'building' ||
            f.layer.id.includes('building')
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
          const name =
            (props.name as string | undefined) ||
            (props['name:pl'] as string | undefined) ||
            (props['name:en'] as string | undefined) ||
            `Budynek 3D #${String(buildingFeature.id || Math.floor(Math.random() * 9000 + 1000))}`;
          const type =
            (props.building as string | undefined) ||
            (props.type as string | undefined) ||
            'Zabudowa miejska';
          const district = getDistrict(e.lngLat.lng, e.lngLat.lat);

          const buildingInfo: SelectedBuildingInfo = {
            name,
            type,
            height: Math.round(height),
            levels,
            district,
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
                  geometry: buildingFeature.geometry,
                },
              ],
            });
          }

          // Tooltip 3D na mapie
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const popupElement = document.createElement('div');
          popupElement.className = 'p-1 text-slate-900 font-sans';
          popupElement.innerHTML = `
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>🏢</span> <span>${name}</span>
            </div>
            <div style="font-size: 11px; color: #475569; line-height: 1.5;">
              <div>Wysokość: <strong style="color: #0f172a;">${Math.round(height)} m</strong> (~${levels} pięter)</div>
              <div>Lokalizacja: <strong style="color: #0f172a;">${district}</strong></div>
              <div>Typ: <span style="background: #e2e8f0; padding: 1px 5px; border-radius: 4px; font-size: 10px;">${type}</span></div>
              <div style="font-family: monospace; font-size: 10px; color: #94a3b8; margin-top: 4px;">
                ${e.lngLat.lat.toFixed(5)}°N, ${e.lngLat.lng.toFixed(5)}°E
              </div>
            </div>
          `;

          popupRef.current = new maplibregl.Popup({
            offset: [0, -12],
            closeButton: true,
            closeOnClick: false,
            className: 'krakow-map-popup',
          })
            .setLngLat(e.lngLat)
            .setDOMContent(popupElement)
            .addTo(mapInstance);

        }
      });

      mapInstance.on('rotate', () => setBearing(Math.round(mapInstance.getBearing())));
      mapInstance.on('pitch', () => setPitch(Math.round(mapInstance.getPitch())));
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
      const analysis = calculateCommuteAnalysis(
        selectedBuilding.coordinates,
        activeProfile.destinations,
        travelMode
      );
      setCommuteAnalysis(analysis);
      routesRef.current = analysis.routes;
      unfurlProgressRef.current = 0; // Wyzwala efekt wystrzelenia linii
      animProgressRef.current = 0;
      updateDestinationMarkers(map, activeProfile.destinations, analysis.routes);
    } else {
      setCommuteAnalysis(null);
      routesRef.current = [];
      updateTrajectoriesLayer(map, []);
      updateDestinationMarkers(map, activeProfile.destinations, []);

      const clearSrc = (id: string) => {
        const s = map.getSource(id);
        if (s && s.type === 'geojson') {
          (s as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
        }
      };
      clearSrc('commute-pulses-source');
      clearSrc('commute-pulse-heads-source');
    }
  }, [
    selectedBuilding,
    activeProfile,
    travelMode,
    mapLoaded,
    updateTrajectoriesLayer,
    updateDestinationMarkers,
  ]);

  // Ciągła pętla animacji 60 FPS dla pędzących wiązek światła i rozwijania linii
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const animate = () => {
      const routes = routesRef.current;

      if (routes.length > 0) {
        // 1. Płynne rozwijanie trajektorii z budynku w pierwszych klatkach
        if (unfurlProgressRef.current < 1) {
          unfurlProgressRef.current = Math.min(1, unfurlProgressRef.current + 0.04);
          const p = unfurlProgressRef.current;
          const trajSource = map.getSource('commute-trajectories-source');
          if (trajSource && trajSource.type === 'geojson') {
            (trajSource as GeoJSONSource).setData({
              type: 'FeatureCollection',
              features: routes.map((r) => {
                const total = r.trajectoryCoordinates.length;
                const count = Math.max(2, Math.ceil(p * total));
                return {
                  type: 'Feature',
                  properties: { status: r.status, duration: r.durationMinutes },
                  geometry: {
                    type: 'LineString',
                    coordinates: r.trajectoryCoordinates.slice(0, count),
                  },
                };
              }),
            });
          }
        }

        // 2. Pędzące neonowe komety wzdłuż trajektorii (efekt WOW)
        animProgressRef.current = (animProgressRef.current + 0.007) % 1;
        const t = animProgressRef.current;

        const pulseLines: PulseLineFeature[] = [];
        const pulseHeads: PulseHeadFeature[] = [];

        routes.forEach((r) => {
          const coords = r.trajectoryCoordinates;
          const total = coords.length;
          if (total < 4) return;

          const headIdx = Math.min(total - 1, Math.floor(t * (total - 1)));
          const tailIdx = Math.max(0, headIdx - 8);

          if (headIdx > tailIdx) {
            pulseLines.push({
              type: 'Feature',
              properties: { status: r.status },
              geometry: {
                type: 'LineString',
                coordinates: coords.slice(tailIdx, headIdx + 1),
              },
            });

            pulseHeads.push({
              type: 'Feature',
              properties: { status: r.status },
              geometry: {
                type: 'Point',
                coordinates: coords[headIdx],
              },
            });
          }
        });

        const pulseSource = map.getSource('commute-pulses-source');
        if (pulseSource && pulseSource.type === 'geojson') {
          (pulseSource as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: pulseLines,
          });
        }

        const headsSource = map.getSource('commute-pulse-heads-source');
        if (headsSource && headsSource.type === 'geojson') {
          (headsSource as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: pulseHeads,
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
      setBearing(Math.round(mapRef.current.getBearing()));
      animId = requestAnimationFrame(rotateStep);
    };

    animId = requestAnimationFrame(rotateStep);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRotating]);

  // Reset zaznaczenia
  const handleClearSelection = () => {
    setSelectedBuilding(null);
    routesRef.current = [];
    unfurlProgressRef.current = 0;
    animProgressRef.current = 0;
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    if (mapRef.current) {
      const clearSrc = (id: string) => {
        const s = mapRef.current?.getSource(id);
        if (s && s.type === 'geojson') {
          (s as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
        }
      };
      clearSrc('selected-building-source');
      clearSrc('commute-trajectories-source');
      clearSrc('commute-pulses-source');
      clearSrc('commute-pulse-heads-source');
    }
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

  // Prezentacyjny przycisk wyboru budynku na scenie
  const handleSelectDemoOrigin = () => {
    if (!mapRef.current) return;

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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* KONTENER MAPY WEBGL - 100% EKRANU */}
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-slate-950"
        style={{ cursor: 'grab' }}
      />

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

        <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono text-muted-foreground border-l border-border">
          <CompassIcon className="size-3.5 text-primary" />
          <span>Kąt: {pitch}°</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono text-muted-foreground border-l border-border">
          <span>Azymut: {bearing}°</span>
        </div>

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
        profiles={COMMUTE_PROFILES}
        activeProfile={activeProfile}
        onSelectProfile={(p) => setActiveProfile(p)}
        travelMode={travelMode}
        onSelectTravelMode={(m) => setTravelMode(m)}
        analysis={commuteAnalysis}
        selectedBuildingName={selectedBuilding?.name}
        onFocusDestination={handleFocusDestination}
        onSelectDemoOrigin={handleSelectDemoOrigin}
      />

      {/* PŁYWAJĄCA KARTA WYBRANEGO BUDYNKU 3D (LEWY DOLNY RÓG) */}
      {selectedBuilding && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full bg-background/95 backdrop-blur-md p-4 rounded-2xl border border-primary/40 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                <Building2Icon className="size-3.5" />
                <span>Wybrany Budynek</span>
              </div>
              <h4 className="font-bold text-sm text-foreground truncate">
                {selectedBuilding.name}
              </h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                <RulerIcon className="size-3" /> Wysokość
              </span>
              <div className="font-bold text-sm text-foreground">
                {selectedBuilding.height} m
              </div>
              <span className="text-[10px] text-muted-foreground">
                ~{selectedBuilding.levels} kondygnacji
              </span>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                <MapPinIcon className="size-3" /> Dzielnica
              </span>
              <div className="font-bold text-xs text-foreground truncate">
                {selectedBuilding.district}
              </div>
              <span className="text-[10px] text-muted-foreground truncate block">
                {selectedBuilding.type}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[10px] text-muted-foreground">
              {selectedBuilding.coordinates[1].toFixed(5)}°N, {selectedBuilding.coordinates[0].toFixed(5)}°E
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: selectedBuilding.coordinates,
                    zoom: 17.5,
                    pitch: 70,
                    essential: true,
                  });
                }
              }}
              className="text-xs h-7 gap-1 font-medium"
            >
              <Maximize2Icon className="size-3" />
              Skup kamerę
            </Button>
          </div>
        </div>
      )}

      {/* INSTRUKCJA DLA UŻYTKOWNIKA */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 bg-background/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground shadow-sm">
        <InfoIcon className="size-3.5 text-primary" />
        <span>Kliknij dowolny budynek w 3D, aby wyliczyć czas dojazdów do punktów życia.</span>
      </div>
    </div>
  );
}
