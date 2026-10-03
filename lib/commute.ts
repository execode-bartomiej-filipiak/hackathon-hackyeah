import type {
  CommuteDestination,
  CommuteRouteResult,
  CommuteAnalysis,
  TravelMode,
} from '@/types/commute';

/**
 * Oblicza odległość w linii prostej (Haversine) w kilometrach
 */
export function calculateHaversineKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Promień Ziemi w km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generuje łukowatą trajektorię 3D (krzywa Béziera) łączącą punkt początkowy z docelowym
 */
export function generateTrajectoryCoordinates(
  origin: [number, number],
  dest: [number, number],
  numPoints = 40
): Array<[number, number]> {
  const [lng1, lat1] = origin;
  const [lng2, lat2] = dest;

  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  // Wektor prostopadły do linii prostej (nadający łuk)
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const curvature = 0.12;

  const perpLng = -dLat * curvature;
  const perpLat = dLng * curvature;

  const ctrlLng = midLng + perpLng;
  const ctrlLat = midLat + perpLat;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    points.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }
  return points;
}

/**
 * Szacuje czas dojazdu w krakowskich warunkach szczytowych
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  mode: TravelMode
): number {
  // Współczynnik krętości siatki ulic Krakowa
  const roadDistanceKm = distanceKm * 1.28;

  switch (mode) {
    case 'transit': {
      // Średnia prędkość MPK (tramwaje/autobusy) ~19 km/h + 4.5 min stałego oczekiwania na przystanku
      const speedKmH = 19;
      const travelTime = (roadDistanceKm / speedKmH) * 60;
      return Math.round(travelTime + 4.5);
    }
    case 'driving': {
      // W centrum i na krótkich dystansach średnia to ~21 km/h + 3.5 min parkowania.
      // Na dłuższych trasach (np. obwodnice) prędkość rośnie do ~32 km/h.
      const speedKmH = roadDistanceKm < 4 ? 21 : 32;
      const travelTime = (roadDistanceKm / speedKmH) * 60;
      return Math.round(travelTime + 3.5);
    }
    case 'bicycling': {
      // Ścieżki rowerowe w Krakowie (wzdłuż Wisły, Błonia) ~16.5 km/h
      const speedKmH = 16.5;
      return Math.round((roadDistanceKm / speedKmH) * 60);
    }
    case 'walking': {
      // Prędkość pieszego ~4.8 km/h
      const speedKmH = 4.8;
      return Math.round((roadDistanceKm / speedKmH) * 60);
    }
  }
}

/**
 * Wyznacza status oceny czasu podróży
 */
export function getRouteStatus(durationMinutes: number): 'optimal' | 'moderate' | 'heavy' {
  if (durationMinutes <= 15) return 'optimal'; // <15 min: idea 15-minutowego miasta
  if (durationMinutes <= 28) return 'moderate'; // 15-28 min: akceptowalny czas
  return 'heavy'; // >28 min: uciążliwy
}

/**
 * Główna funkcja analityczna obliczająca CommuteScore oraz trasy
 */
export function calculateCommuteAnalysis(
  origin: [number, number],
  destinations: CommuteDestination[],
  fallbackMode: TravelMode = 'transit'
): CommuteAnalysis {
  let totalWeeklyMinutes = 0;

  const routes: CommuteRouteResult[] = destinations.map((dest) => {
    const rawDistance = calculateHaversineKm(origin, dest.coordinates);
    const roadDistanceKm = Number((rawDistance * 1.28).toFixed(1));
    const effectiveMode = dest.travelMode || fallbackMode;
    const durationMinutes = Math.max(3, estimateTravelTimeMinutes(rawDistance, effectiveMode));
    const status = getRouteStatus(durationMinutes);
    const trajectoryCoordinates = generateTrajectoryCoordinates(origin, dest.coordinates);

    // Podróż w obie strony pomnożona przez częstotliwość w tygodniu
    const roundTripMinutes = durationMinutes * 2;
    totalWeeklyMinutes += roundTripMinutes * dest.frequencyPerWeek;

    return {
      destinationId: dest.id,
      destinationName: dest.name,
      destinationIcon: dest.icon,
      coordinates: dest.coordinates,
      durationMinutes,
      distanceKm: roadDistanceKm,
      travelMode: effectiveMode,
      status,
      trajectoryCoordinates,
    };
  });

  const totalHoursPerWeek = Number((totalWeeklyMinutes / 60).toFixed(1));

  // Benchmark: przeciętny mieszkaniec Krakowa spędza w podróżach miejskich ok. 7.2h tygodniowo
  const KRAKOW_BENCHMARK_HOURS = 7.2;
  const weeklySavingsHours = Number((KRAKOW_BENCHMARK_HOURS - totalHoursPerWeek).toFixed(1));

  // Algorytm CommuteScore (0 - 100):
  // 1-3h tygodniowo -> 90-98 pkt
  // 4-6h tygodniowo -> 75-88 pkt
  // 7-10h tygodniowo -> 50-70 pkt
  // >12h tygodniowo -> <40 pkt
  const rawScore = 100 - (totalHoursPerWeek / 12) * 60;
  const score = Math.max(12, Math.min(98, Math.round(rawScore)));

  return {
    score,
    totalHoursPerWeek,
    weeklySavingsHours,
    routes,
  };
}

// Podręczny cache tras OSRM w pamięci klienta (unikamy powtarzających się zapytań)
const routeCache = new Map<
  string,
  { coordinates: Array<[number, number]>; durationMinutes: number; distanceKm: number }
>();

function getCacheKey(origin: [number, number], dest: [number, number], mode: TravelMode): string {
  return `${origin[0].toFixed(4)},${origin[1].toFixed(4)}-${dest[0].toFixed(4)},${dest[1].toFixed(4)}-${mode}`;
}

/**
 * Pobiera rzeczywistą trasę po ulicach Krakowa z API OSRM (Open Source Routing Machine)
 * W razie błędu sieci lub timeoutu zwraca null (wyzwalając bezpieczny fallback na łuk).
 */
export async function fetchOsmStreetRoute(
  origin: [number, number],
  dest: [number, number],
  mode: TravelMode,
  signal?: AbortSignal
): Promise<{ coordinates: Array<[number, number]>; durationMinutes: number; distanceKm: number } | null> {
  const cacheKey = getCacheKey(origin, dest, mode);
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  // Profil OSRM
  const profile = mode === 'bicycling' ? 'bike' : mode === 'walking' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2400);

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      code: string;
      routes?: Array<{
        distance: number; // w metrach
        duration: number; // w sekundach
        geometry?: {
          type: 'LineString';
          coordinates: Array<[number, number]>;
        };
      }>;
    };

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const coords = route.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const distanceKm = Number((route.distance / 1000).toFixed(1));
    let durationMinutes = 0;

    switch (mode) {
      case 'driving':
        // Czas jazdy OSRM + 3.5 min stałego czasu na parkowanie/dojście
        durationMinutes = Math.max(3, Math.round(route.duration / 60 + 3.5));
        break;
      case 'transit':
        // Trasa poprowadzona głównymi korytarzami drogowymi + parametry MPK Kraków (19 km/h + 4.5 min przystanki)
        durationMinutes = Math.max(4, Math.round((distanceKm / 19) * 60 + 4.5));
        break;
      case 'bicycling':
      case 'walking':
        durationMinutes = Math.max(2, Math.round(route.duration / 60));
        break;
    }

    const result = {
      coordinates: coords,
      durationMinutes,
      distanceKm,
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch {
    // Cichy fallback przy braku sieci / timeoutcie
    return null;
  }
}

/**
 * Asynchroniczna analiza wzbogacona o realne trasy uliczne (OSRM)
 * Równolegle pobiera trasy uliczne z gwarantowanym fallbackiem na model estymacyjny.
 */
export async function fetchEnhancedCommuteAnalysis(
  origin: [number, number],
  destinations: CommuteDestination[],
  fallbackMode: TravelMode = 'transit',
  signal?: AbortSignal
): Promise<CommuteAnalysis> {
  // Najpierw baza z obliczeń wstępnych
  const baseAnalysis = calculateCommuteAnalysis(origin, destinations, fallbackMode);

  // Pobieramy trasy drogowe równolegle
  const routePromises = baseAnalysis.routes.map(async (baseRoute) => {
    const dest = destinations.find((d) => d.id === baseRoute.destinationId);
    if (!dest) return baseRoute;

    const effectiveMode = dest.travelMode || fallbackMode;
    const realRoute = await fetchOsmStreetRoute(origin, dest.coordinates, effectiveMode, signal);

    if (realRoute && realRoute.coordinates.length >= 2) {
      return {
        ...baseRoute,
        distanceKm: realRoute.distanceKm,
        durationMinutes: realRoute.durationMinutes,
        status: getRouteStatus(realRoute.durationMinutes),
        trajectoryCoordinates: realRoute.coordinates,
        isRealRoute: true,
      };
    }

    return baseRoute;
  });

  const updatedRoutes = await Promise.all(routePromises);

  // Przeliczenie bilansu tygodniowego na bazie realnych czasów
  let totalWeeklyMinutes = 0;
  updatedRoutes.forEach((route) => {
    const dest = destinations.find((d) => d.id === route.destinationId);
    const freq = dest ? dest.frequencyPerWeek : 2;
    totalWeeklyMinutes += route.durationMinutes * 2 * freq;
  });

  const totalHoursPerWeek = Number((totalWeeklyMinutes / 60).toFixed(1));
  const KRAKOW_BENCHMARK_HOURS = 7.2;
  const weeklySavingsHours = Number((KRAKOW_BENCHMARK_HOURS - totalHoursPerWeek).toFixed(1));

  const rawScore = 100 - (totalHoursPerWeek / 12) * 60;
  const score = Math.max(12, Math.min(98, Math.round(rawScore)));

  return {
    score,
    totalHoursPerWeek,
    weeklySavingsHours,
    routes: updatedRoutes,
  };
}

