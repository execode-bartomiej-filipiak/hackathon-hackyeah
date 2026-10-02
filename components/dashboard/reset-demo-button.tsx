'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcwIcon, Loader2Icon } from 'lucide-react';
import { resetDemo } from '@/app/actions/items';
import { toast } from 'sonner';

interface ResetDemoButtonProps {
  onReset: () => void;
}

export function ResetDemoButton({ onReset }: ResetDemoButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(async () => {
      try {
        const result = await resetDemo();
        if (result.ok) {
          onReset();
          toast.success(result.message || 'Przywrócono stan początkowy danych demo.');
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error('Wystąpił błąd podczas resetowania danych.');
        console.error(err);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {isPending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <RotateCcwIcon className="size-3.5" />
      )}
      Resetuj dane demo
    </Button>
  );
}
