import { PageShell } from "@/components/PageShell";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function ScreenSkeleton({
  withNav = true,
  hero = false,
  rows = 4,
}: {
  withNav?: boolean;
  hero?: boolean;
  rows?: number;
}) {
  return (
    <PageShell withNav={withNav}>
      <div className="mb-7 space-y-3">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-4 w-32" />
      </div>

      {hero ? <SkeletonBlock className="mb-7 h-32 w-full rounded-2xl" /> : null}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="card p-4" key={index}>
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/3" />
              </div>
              <SkeletonBlock className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
