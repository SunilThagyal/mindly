
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <>
      {/* Desktop Loader */}
      <div className="hidden md:block container mx-auto px-4 py-8 animate-fade-in w-full">
        {/* Page Title Skeleton */}
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-10" />

        <div className="space-y-8">
          {/* Content block skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Content block skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Content block skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
      
      {/* Mobile Loader */}
      <div className="md:hidden flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </>
  );
}
