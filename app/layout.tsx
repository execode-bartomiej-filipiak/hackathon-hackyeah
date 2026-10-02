import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hackathon Demo — QuickResolve AI',
  description: 'Panel demonstracyjny przygotowany na hackathon (24h) zintegrowany z Supabase i Next.js App Router.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <TooltipProvider delayDuration={150}>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster richColors position="top-right" theme="light" closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
