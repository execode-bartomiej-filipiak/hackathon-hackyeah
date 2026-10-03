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
 * Generuje próbkowaną trajektorię łączącą punkt początkowy z docelowym.
 * Punkty służą jako podstawa łuku 3D, który jest unoszony pionowo nad mapą
 * podczas renderowania (patrz nakładka canvas w components/krakow-3d-map.tsx).
 */
export function generateTrajectoryCoordinates(
  origin: [number, number],
  dest: [number, number],
  numPoints = 48
): Array<[number, number]> {
  const [lng1, lat1] = origin;
  const [lng2, lat2] = dest;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lng = lng1 + (lng2 - lng1) * t;
    const lat = lat1 + (lat2 - lat1) * t;
    points.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }
  return points;
}

/**
 * Założenia kosztu paliwa w mieście: 8,00 zł/l przy średnim spalaniu 8,5 l/100 km
 */
export const FUEL_PRICE_PLN_PER_LITER = 8;
export const CAR_FUEL_CONSUMPTION_L_PER_100KM = 8.5;

/**
 * Składowe algorytmu CommuteScore (0-100).
 * Wzór: score = clamp(100 − (godziny w drodze / 12) × 60, 12, 98)
 */
export const COMMUTE_SCORE_FULL_HOURS = 12; // liczba godzin, przy której wynik spada o pełne 60 pkt
export const COMMUTE_SCORE_FALL_PER_HOUR = 60;
export const COMMUTE_SCORE_BASE = 100;
export const COMMUTE_SCORE_MIN = 12;
export const COMMUTE_SCORE_MAX = 98;

/**
 * Benchmark: przeciętny mieszkaniec Krakowa spędza w podróżach miejskich ok. 7,2 h tygodniowo
 */
export const KRAKOW_BENCHMARK_HOURS = 7.2;

/**
 * Wyznacza CommuteScore (0-100) na podstawie tygodniowego czasu w drodze
 */
export function getCommuteScore(totalHoursPerWeek: number): number {
  const raw =
    COMMUTE_SCORE_BASE -
    (totalHoursPerWeek / COMMUTE_SCORE_FULL_HOURS) * COMMUTE_SCORE_FALL_PER_HOUR;
  return Math.max(COMMUTE_SCORE_MIN, Math.min(COMMUTE_SCORE_MAX, Math.round(raw)));
}

/**
 * Koszt paliwa na kilometr: 8,5 l/100 km × 8,00 zł/l = 0,68 zł/km
 */
export const CAR_COST_PER_KM_PLN = Number(
  ((CAR_FUEL_CONSUMPTION_L_PER_100KM / 100) * FUEL_PRICE_PLN_PER_LITER).toFixed(2)
);

/**
 * Taryfa biletów czasowych MPK Kraków (Strefa I+II+III, normalne)
 */
export const MPK_TICKETS = [
  { maxMinutes: 15, pricePln: 4, label: 'Bilet 15-minutowy' },
  { maxMinutes: 30, pricePln: 6, label: 'Bilet 30-minutowy' },
  { maxMinutes: 60, pricePln: 8, label: 'Bilet 60-minutowy' },
  { maxMinutes: Infinity, pricePln: 9, label: 'Bilet 90-minutowy' },
] as const;

/**
 * Dobiera bilet czasowy MPK do czasu jednego przejazdu
 */
export function getTransitTicket(durationMinutes: number): { pricePln: number; label: string } {
  const ticket = MPK_TICKETS.find((t) => durationMinutes <= t.maxMinutes) ?? MPK_TICKETS[MPK_TICKETS.length - 1];
  return { pricePln: ticket.pricePln, label: ticket.label };
}

/**
 * Koszt jednego przejazdu (w jedną stronę) w zł dla wybranego środka transportu
 */
export function getTripCostPln(
  distanceKm: number,
  durationMinutes: number,
  mode: TravelMode
): { costPlnPerTrip: number; ticketType?: string } {
  switch (mode) {
    case 'transit': {
      const ticket = getTransitTicket(durationMinutes);
      return { costPlnPerTrip: ticket.pricePln, ticketType: ticket.label };
    }
    case 'driving':
      return {
        costPlnPerTrip: Number((distanceKm * CAR_COST_PER_KM_PLN).toFixed(2)),
        ticketType: `Paliwo ${CAR_COST_PER_KM_PLN.toFixed(2).replace('.', ',')} zł/km (${CAR_FUEL_CONSUMPTION_L_PER_100KM.toFixed(1).replace('.', ',')} l/100 km × ${FUEL_PRICE_PLN_PER_LITER.toFixed(2).replace('.', ',')} zł/l)`,
      };
    case 'bicycling':
    case 'walking':
      return { costPlnPerTrip: 0, ticketType: 'Transport zeroemisyjny' };
  }
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
  let totalWeeklyCostPlnRaw = 0;
  let totalCarBaselineCostPlnRaw = 0;
  let totalWeeklyCo2KgRaw = 0;
  let totalCarBaselineCo2KgRaw = 0;

  const routes: CommuteRouteResult[] = destinations.map((dest) => {
    const rawDistance = calculateHaversineKm(origin, dest.coordinates);
    const roadDistanceKm = Number((rawDistance * 1.28).toFixed(1));
    const effectiveMode = dest.travelMode || fallbackMode;
    const durationMinutes = Math.max(3, estimateTravelTimeMinutes(rawDistance, effectiveMode));
    const status = getRouteStatus(durationMinutes);
    const trajectoryCoordinates = generateTrajectoryCoordinates(origin, dest.coordinates, 48);
    const co2EmissionKg = Number((roadDistanceKm * getCo2FactorKgPerKm(effectiveMode)).toFixed(2));
    const { costPlnPerTrip, ticketType } = getTripCostPln(roadDistanceKm, durationMinutes, effectiveMode);

    // Podróż w obie strony pomnożona przez częstotliwość w tygodniu
    const roundTripsPerWeek = dest.frequencyPerWeek * 2;
    totalWeeklyMinutes += durationMinutes * roundTripsPerWeek;
    totalWeeklyCo2KgRaw += co2EmissionKg * roundTripsPerWeek;
    totalCarBaselineCo2KgRaw += (roadDistanceKm * getCo2FactorKgPerKm('driving')) * roundTripsPerWeek;
    totalWeeklyCostPlnRaw += costPlnPerTrip * roundTripsPerWeek;
    totalCarBaselineCostPlnRaw += roadDistanceKm * CAR_COST_PER_KM_PLN * roundTripsPerWeek;

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
      costPlnPerTrip,
      ticketType,
    };
  });

  const totalHoursPerWeek = Number((totalWeeklyMinutes / 60).toFixed(1));

  // Benchmark: przeciętny mieszkaniec Krakowa spędza w podróżach miejskich ok. 7,2 h tygodniowo
  const weeklySavingsHours = Number((KRAKOW_BENCHMARK_HOURS - totalHoursPerWeek).toFixed(1));

  // Ekologia: bilans CO2 tygodniowo
  const totalWeeklyCo2Kg = Number(totalWeeklyCo2KgRaw.toFixed(1));
  const weeklyCo2SavingsKg = Number(
    Math.max(0, totalCarBaselineCo2KgRaw - totalWeeklyCo2KgRaw).toFixed(1)
  );
  // Jedno dojrzałe drzewo pochłania ok. 0.42 kg CO2 tygodniowo (~22 kg rocznie)
  const treesEquivalentWeekly = Math.max(1, Math.round(weeklyCo2SavingsKg / 0.42));

  // Budżet: koszt tygodniowy dojazdów oraz oszczędność względem wariantu czysto samochodowego
  const totalWeeklyCostPln = Number(totalWeeklyCostPlnRaw.toFixed(2));
  const weeklyCostSavingsVsCarPln = Number(
    Math.max(0, totalCarBaselineCostPlnRaw - totalWeeklyCostPlnRaw).toFixed(2)
  );

  // Algorytm CommuteScore (0 - 100):
  // 1-3h tygodniowo -> 90-98 pkt
  // 4-6h tygodniowo -> 75-88 pkt
  // 7-10h tygodniowo -> 50-70 pkt
  // >12h tygodniowo -> <40 pkt
  const score = getCommuteScore(totalHoursPerWeek);

  return {
    score,
    totalHoursPerWeek,
    weeklySavingsHours,
    totalWeeklyCo2Kg,
    weeklyCo2SavingsKg,
    treesEquivalentWeekly,
    totalWeeklyCostPln,
    weeklyCostSavingsVsCarPln,
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
  const savedCostWeeklyPln = Number(
    (homeAnalysis.totalWeeklyCostPln - targetAnalysis.totalWeeklyCostPln).toFixed(2)
  );

  return {
    homeHoursPerWeek: homeAnalysis.totalHoursPerWeek,
    homeCo2Kg: homeAnalysis.totalWeeklyCo2Kg,
    homeScore: homeAnalysis.score,
    savedHoursPerWeek,
    savedCo2Kg,
    scoreDelta,
    hasReference: true,
    homeWeeklyCostPln: homeAnalysis.totalWeeklyCostPln,
    savedCostWeeklyPln,
  };
}

