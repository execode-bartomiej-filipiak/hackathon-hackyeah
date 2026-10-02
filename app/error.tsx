'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react';

export default function ErrorBoundary({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary caught error]:', error);
  }, [error]);

  const handleRecover = () => {
    if (typeof retry === 'function') {
      retry();
    } else if (typeof reset === 'function') {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="max-w-md border-destructive/20 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
            <AlertCircleIcon className="size-6" />
          </div>
          <CardTitle className="text-lg">Wystąpił problem z ładowaniem danych</CardTitle>
          <CardDescription className="text-xs">
            Nie martw się — dane demonstracyjne są zabezpieczone, a aplikacja może kontynuować pracę.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {error?.message && (
            <p className="rounded-md bg-muted p-2 font-mono text-xs text-muted-foreground break-all">
              {error.message}
            </p>
          )}
          <Button onClick={handleRecover} className="gap-2">
            <RotateCcwIcon className="size-4" />
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
