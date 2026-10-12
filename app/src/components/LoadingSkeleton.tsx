import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';

interface LoadingSkeletonProps {
  type?: 'list' | 'board' | 'calendar' | 'charts' | 'card';
  count?: number;
}

/**
 * Shimmering placeholders that mirror the real layouts (list rows, board columns, calendar, charts, card).
 * The blocks are decorative (aria-hidden); give the surrounding region aria-busy while loading.
 */
export function LoadingSkeleton({ type = 'list', count = 10 }: LoadingSkeletonProps) {
  if (type === 'calendar') {
    return (
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg sm:h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'board') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-surface p-3">
            <Skeleton className="h-6 w-1/2" />
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'charts') {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5">
            <Skeleton className="mb-4 h-5 w-1/3" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5" aria-hidden>
        <Skeleton className="mb-4 h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // Default list skeleton
  return (
    <div className="space-y-2" aria-hidden>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <SkeletonAvatar size={24} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
