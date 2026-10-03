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
  numPoints = 24
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
  mode: TravelMode
): CommuteAnalysis {
  let totalWeeklyMinutes = 0;

  const routes: CommuteRouteResult[] = destinations.map((dest) => {
    const rawDistance = calculateHaversineKm(origin, dest.coordinates);
    const roadDistanceKm = Number((rawDistance * 1.28).toFixed(1));
    const durationMinutes = Math.max(3, estimateTravelTimeMinutes(rawDistance, mode));
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
      travelMode: mode,
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
