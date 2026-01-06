interface LoadingSkeletonProps {
  type?: 'list' | 'board' | 'calendar' | 'charts' | 'card';
  count?: number;
}

export function LoadingSkeleton({ type = 'list', count = 10 }: LoadingSkeletonProps) {
  if (type === 'calendar') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'board') {
    return (
      <div className="grid grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-10 bg-slate-800 rounded-xl"></div>
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-24 bg-slate-800/50 rounded-lg"></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'charts') {
    return (
      <div className="grid grid-cols-2 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-800 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded w-full"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Default list skeleton
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-16 bg-slate-800 rounded-xl"></div>
      ))}
    </div>
  );
}
