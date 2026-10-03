export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Krakow3DMap } from '@/components/krakow-3d-map';

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <Krakow3DMap />
    </main>
  );
}
