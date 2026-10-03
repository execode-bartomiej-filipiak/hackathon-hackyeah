import type {
  CommuteDestination,
  CommuteRouteResult,
  CommuteAnalysis,
  CommuteComparisonToHome,
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
 * Emisja CO2 w kg na 1 km w zależności od środka transportu
 * - Samochód: 0.145 kg CO2/km (średnia flota miejska benzyna/diesel)
 * - MPK Kraków (tramwaje z OZE / autobusy niskoemisyjne): 0.035 kg CO2/pkm
 * - Rower: 0 kg CO2/km
 * - Pieszo: 0 kg CO2/km
 */
export function getCo2FactorKgPerKm(mode: TravelMode): number {
  switch (mode) {
    case 'driving':
      return 0.145;
    case 'transit':
      return 0.035;
    case 'bicycling':
    case 'walking':
      return 0;
  }
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
  let totalWeeklyCo2KgRaw = 0;
  let totalCarBaselineCo2KgRaw = 0;

  const routes: CommuteRouteResult[] = destinations.map((dest) => {
    const rawDistance = calculateHaversineKm(origin, dest.coordinates);
    const roadDistanceKm = Number((rawDistance * 1.28).toFixed(1));
    const effectiveMode = dest.travelMode || fallbackMode;
    const durationMinutes = Math.max(3, estimateTravelTimeMinutes(rawDistance, effectiveMode));
    const status = getRouteStatus(durationMinutes);
    const trajectoryCoordinates = generateTrajectoryCoordinates(origin, dest.coordinates);
    const co2EmissionKg = Number((roadDistanceKm * getCo2FactorKgPerKm(effectiveMode)).toFixed(2));

    // Podróż w obie strony pomnożona przez częstotliwość w tygodniu
    const roundTripsPerWeek = dest.frequencyPerWeek * 2;
    totalWeeklyMinutes += durationMinutes * roundTripsPerWeek;
    totalWeeklyCo2KgRaw += co2EmissionKg * roundTripsPerWeek;
    totalCarBaselineCo2KgRaw += (roadDistanceKm * getCo2FactorKgPerKm('driving')) * roundTripsPerWeek;

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
      co2EmissionKg,
    };
  });

  const totalHoursPerWeek = Number((totalWeeklyMinutes / 60).toFixed(1));

  // Benchmark: przeciętny mieszkaniec Krakowa spędza w podróżach miejskich ok. 7.2h tygodniowo
  const KRAKOW_BENCHMARK_HOURS = 7.2;
  const weeklySavingsHours = Number((KRAKOW_BENCHMARK_HOURS - totalHoursPerWeek).toFixed(1));

  // Ekologia: bilans CO2 tygodniowo
  const totalWeeklyCo2Kg = Number(totalWeeklyCo2KgRaw.toFixed(1));
  const weeklyCo2SavingsKg = Number(
    Math.max(0, totalCarBaselineCo2KgRaw - totalWeeklyCo2KgRaw).toFixed(1)
  );
  // Jedno dojrzałe drzewo pochłania ok. 0.42 kg CO2 tygodniowo (~22 kg rocznie)
  const treesEquivalentWeekly = Math.max(1, Math.round(weeklyCo2SavingsKg / 0.42));

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
    totalWeeklyCo2Kg,
    weeklyCo2SavingsKg,
    treesEquivalentWeekly,
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

  const executeFetch = async (timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    try {
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

      return {
        coordinates: coords,
        durationMinutes,
        distanceKm,
      };
    } catch {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
      return null;
    }
  };

  // Pierwsza próba z solidnym timeoutem 6.5s (zapobiega przedwczesnym fallbackom)
  let result = await executeFetch(6500);

  // Jeśli chwilowy błąd sieci, ponawiamy jeszcze raz próbę
  if (!result && (!signal || !signal.aborted)) {
    result = await executeFetch(4000);
  }

  if (result) {
    routeCache.set(cacheKey, result);
  }
  return result;
}

/**
 * Analiza dojazdów do punktów życia (Trajektorie 3D)
 * Zwraca bezpośrednie trajektorie łukowe oraz estymację czasów, jak w początkowych wersjach projektu.
 */
export async function fetchEnhancedCommuteAnalysis(
  origin: [number, number],
  destinations: CommuteDestination[],
  fallbackMode: TravelMode = 'transit',
  _signal?: AbortSignal
): Promise<CommuteAnalysis> {
  return calculateCommuteAnalysis(origin, destinations, fallbackMode);
}

/**
 * Oblicza relacyjne porównanie KPI Miejsca odniesienia (nowego punktu)
 * bezpośrednio względem Miejsca zamieszkania (punktu bazowego)
 */
export function calculateRelationalComparison(
  targetAnalysis: CommuteAnalysis,
  homeAnalysis: CommuteAnalysis
): CommuteComparisonToHome {
  const savedHoursPerWeek = Number(
    (homeAnalysis.totalHoursPerWeek - targetAnalysis.totalHoursPerWeek).toFixed(1)
  );
  const savedCo2Kg = Number(
    (homeAnalysis.totalWeeklyCo2Kg - targetAnalysis.totalWeeklyCo2Kg).toFixed(1)
  );
  const scoreDelta = targetAnalysis.score - homeAnalysis.score;

  return {
    homeHoursPerWeek: homeAnalysis.totalHoursPerWeek,
    homeCo2Kg: homeAnalysis.totalWeeklyCo2Kg,
    homeScore: homeAnalysis.score,
    savedHoursPerWeek,
    savedCo2Kg,
    scoreDelta,
    hasReference: true,
  };
}

