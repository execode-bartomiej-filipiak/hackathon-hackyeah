import { cookies } from 'next/headers';

export const DEMO_COOKIE = 'demo';

export async function isDemoMode(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return true;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_COOKIE)?.value === '1';
  } catch {
    // cookies() rzuca błąd, gdy jest wywołane poza kontekstem żądania (np. podczas testów jednostkowych)
    return false;
  }
}
