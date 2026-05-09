function StatCardSkeleton() {
  return (
    <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-sm animate-pulse">
      <div className="h-4 w-28 rounded bg-border-default/50 mb-3" />
      <div className="h-8 w-16 rounded bg-border-default/50 mb-2" />
      <div className="h-3 w-24 rounded bg-border-default/40" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex justify-end">
        <div className="h-10 w-[180px] rounded-xl bg-border-default/40 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />
        <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />
      </div>
    </div>
  );
}
