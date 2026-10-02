import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* NAGŁÓWEK SKELETON */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* KPI KAFELKI SKELETON */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-48" />
          </CardContent>
        </Card>
        <Card className="border-border sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* FORMULARZ SKELETON */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Skeleton className="h-9 sm:col-span-2" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* TABELA SKELETON */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
