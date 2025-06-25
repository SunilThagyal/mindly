
import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoadingSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4 animate-fade-in">
      {/* Main content area */}
      <main className="flex-1 w-full lg:max-w-3xl xl:max-w-4xl">
        <article>
          {/* Cover Image Skeleton */}
          <Skeleton className="w-full h-72 sm:h-96 rounded-lg mb-8" />

          <header className="mb-8">
            {/* Title Skeleton */}
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-8 w-3/4 mb-6" />

            {/* Meta Info Skeleton */}
            <div className="flex flex-wrap items-center text-muted-foreground text-sm gap-x-4 gap-y-2">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full mr-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </header>

          {/* Action Buttons Skeleton */}
          <div className="my-6 flex items-center gap-4">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>

          {/* Article Body Skeleton */}
          <div className="space-y-4 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <br />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <br />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </article>
      </main>

      {/* Sidebar Skeleton */}
      <aside className="w-full lg:w-1/4 lg:max-w-xs xl:max-w-sm hidden lg:block space-y-6">
        <div className="sticky top-20 space-y-6">
          {/* Author Card Skeleton */}
          <div className="p-4 bg-card rounded-lg shadow space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          
          {/* Ad Placeholder Skeleton */}
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </aside>
    </div>
  );
}
