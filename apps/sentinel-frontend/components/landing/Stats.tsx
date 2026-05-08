export default function Stats() {
  const stats = [
    { num: '2', label: 'Detection Rules Live' },
    { num: '< 3s', label: 'Median Response Window' },
    { num: '5', label: 'Attack Scenarios Simulated' },
    { num: '100%', label: 'Emergency Pause Success' },
  ];

  return (
    <section className="relative border-y border-border-default/70 bg-[linear-gradient(180deg,rgba(246,248,255,0.84),rgba(230,237,252,0.98))] py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/8 blur-3xl" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 gap-8 rounded-[32px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.52))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_28px_64px_rgba(15,23,42,0.08)] backdrop-blur-md md:grid-cols-4 md:gap-0">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center justify-center rounded-[26px] px-4 py-7 transition-all duration-200 hover:bg-white/34 md:px-6"
            >
              {i !== 0 && (
                <span className="absolute left-0 top-1/2 hidden h-12 w-px -translate-y-1/2 bg-[linear-gradient(180deg,transparent,rgba(176,188,216,0.9),transparent)] md:block" />
              )}
              <span className="inline-block bg-[linear-gradient(180deg,#0f172a_0%,#274690_100%)] bg-clip-text pr-[0.04em] font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-transparent sm:text-[42px]">
                {stat.num}
              </span>
              <span className="mt-2 max-w-[12rem] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary/90">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
