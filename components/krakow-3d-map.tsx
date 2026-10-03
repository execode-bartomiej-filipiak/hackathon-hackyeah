'use client';

import { useEffect, useRef, useState } from 'react';
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
import { toast } from 'sonner';

interface SelectedBuildingInfo {
  name: string;
  type: string;
  height: number;
  levels: number;
  district: string;
  coordinates: [number, number];
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

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [pitch, setPitch] = useState(62);
  const [bearing, setBearing] = useState(-20);
  const [isRotating, setIsRotating] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const [engineType, setEngineType] = useState<'openfreemap' | 'mapbox'>('openfreemap');

  // Sprawdzamy zapisany token Mapbox
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedToken =
      localStorage.getItem('krakow_mapbox_token') || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (savedToken) {
      setTokenInput(savedToken);
      setEngineType('mapbox');
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
    const styleUrl =
      engineType === 'mapbox' && tokenInput
        ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${tokenInput}`
        : 'https://tiles.openfreemap.org/styles/liberty';

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

    mapInstance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapInstance.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: '3D Kraków PoC' }),
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

      // Dodanie warstwy 3D dla stylu Mapbox jeśli brak natywnego fill-extrusion
      const layers: LayerSpecification[] = mapInstance.getStyle().layers || [];
      const has3D = layers.some(
        (l: LayerSpecification) => l.type === 'fill-extrusion' && l.id !== 'selected-building-highlight'
      );

      if (!has3D && mapInstance.getSource('composite')) {
        const labelLayer = layers.find((l: LayerSpecification) => l.type === 'symbol');
        mapInstance.addLayer(
          {
            id: '3d-buildings-extrusion',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#cbd5e1',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8,
            },
          },
          labelLayer?.id
        );
      }

      // Kursor pointer nad budynkami 3D
      const buildingLayerIds = [
        'building-3d',
        '3d-buildings-extrusion',
        'building',
      ].filter((id) => mapInstance.getLayer(id));

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
          const type = (props.building as string | undefined) || (props.type as string | undefined) || 'Zabudowa miejska';
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

          // Bezpieczna aktualizacja podświetlenia
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

          toast.info(`Zaznaczono obiekt: ${name}`, {
            description: `Wysokość: ${Math.round(height)}m, Dzielnica: ${district}`,
          });
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
  }, [engineType, tokenInput]);

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
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    if (mapRef.current) {
      const source = mapRef.current.getSource('selected-building-source');
      if (source && source.type === 'geojson') {
        const geoSource = source as GeoJSONSource;
        geoSource.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
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

      {/* PŁYWAJĄCY PASEK KONTROLI KAMERY 3D */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-background/90 backdrop-blur-md p-2 rounded-lg border border-border shadow-md">
        <Button
          variant={isRotating ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsRotating(!isRotating)}
          className="text-xs h-7 px-2 gap-1.5"
        >
          <RotateCwIcon className={`size-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          {isRotating ? 'Zatrzymaj obrót' : 'Obrót 360°'}
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
          className="text-xs h-7 px-2"
        >
          Reset
        </Button>
      </div>

      {/* PŁYWAJĄCA KARTA WYBRANEGO BUDYNKU 3D */}
      {selectedBuilding && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full bg-background/95 backdrop-blur-md p-4 rounded-xl border border-primary/40 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                <Building2Icon className="size-3.5" />
                <span>Zaznaczony Budynek 3D</span>
              </div>
              <h4 className="font-bold text-sm text-foreground line-clamp-1">
                {selectedBuilding.name}
              </h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border bg-muted/30 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RulerIcon className="size-3" /> Wysokość bryły
              </span>
              <div className="font-bold text-sm text-foreground">
                {selectedBuilding.height} m
              </div>
              <span className="text-[10px] text-muted-foreground">
                ~{selectedBuilding.levels} kondygnacji
              </span>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPinIcon className="size-3" /> Dzielnica
              </span>
              <div className="font-bold text-xs text-foreground">
                {selectedBuilding.district}
              </div>
              <span className="text-[10px] text-muted-foreground">
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
              className="text-xs h-7 gap-1"
            >
              <Maximize2Icon className="size-3" />
              Przybliż
            </Button>
          </div>
        </div>
      )}

      {/* INSTRUKCJA DLA UŻYTKOWNIKA */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 bg-background/85 backdrop-blur-xs px-2.5 py-1 rounded-md border border-border text-[11px] text-muted-foreground shadow-sm">
        <InfoIcon className="size-3.5 text-primary" />
        <span>Kliknij dowolny budynek w 3D, aby go zaznaczyć i wyświetlić parametry.</span>
      </div>
    </div>
  );
}
