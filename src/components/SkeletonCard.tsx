interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-3 animate-pulse"></div>
                <div className="h-4 bg-base-300 rounded w-full mb-2 animate-pulse"></div>
                <div className="h-4 bg-base-300 rounded w-2/3 mb-3 animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-base-300 rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-base-300 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
