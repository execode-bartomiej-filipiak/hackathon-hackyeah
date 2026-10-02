import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_COOKIE } from '@/lib/demo';

export function proxy(request: NextRequest) {
  const demoParam = request.nextUrl.searchParams.get('demo');

  // Gdy w URL pojawia się parametr ?demo=true lub ?demo=false:
  // ustawiamy lub czyścimy cookie i przekierowujemy na czysty URL bez parametru.
  if (demoParam !== null) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('demo');

    const response = NextResponse.redirect(cleanUrl);

    if (demoParam === 'true' || demoParam === '1') {
      response.cookies.set(DEMO_COOKIE, '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 dni
        sameSite: 'lax',
      });
    } else {
      response.cookies.delete(DEMO_COOKIE);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Dopasuj wszystkie ścieżki poza zasobami statycznymi, API i plikami z rozszerzeniami
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
