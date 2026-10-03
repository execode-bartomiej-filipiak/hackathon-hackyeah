export type TravelMode = 'transit' | 'driving' | 'bicycling' | 'walking';

export interface CommuteDestination {
  id: string;
  name: string;
  category: 'work' | 'family' | 'hobby' | 'education' | 'shopping' | 'other';
  icon: string;
  coordinates: [number, number]; // [lng, lat]
  frequencyPerWeek: number; // np. 5 dla pracy, 2 dla siłowni
  travelMode: TravelMode; // środek transportu dla tego konkretnego celu
}

export interface CommuteRouteResult {
  destinationId: string;
  destinationName: string;
  destinationIcon: string;
  coordinates: [number, number];
  durationMinutes: number;
  distanceKm: number;
  travelMode: TravelMode;
  status: 'optimal' | 'moderate' | 'heavy'; // <15m optymalny, 15-30m umiarkowany, >30m uciążliwy
  trajectoryCoordinates: Array<[number, number]>;
  isRealRoute?: boolean;
  co2EmissionKg?: number; // kg CO2 na 1 przejazd
}

export interface CommuteAnalysis {
  score: number; // 0 - 100
  totalHoursPerWeek: number;
  weeklySavingsHours: number; // względem średniej krakowskiej (7.5h)
  totalWeeklyCo2Kg: number; // łączna emisja CO2 w kg / tydzień
  weeklyCo2SavingsKg: number; // oszczędność CO2 względem podróży samochodem (kg / tydzień)
  treesEquivalentWeekly: number; // ekwiwalent drzew absorbujących CO2
  routes: CommuteRouteResult[];
}

export interface CommuteProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  destinations: CommuteDestination[];
}
