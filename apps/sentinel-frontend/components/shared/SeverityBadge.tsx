import { motion } from 'framer-motion';

export default function SeverityBadge({ severity }: { severity: number }) {
  let level = 'LOW';
  if (severity >= 90) level = 'CRITICAL';
  else if (severity >= 75) level = 'HIGH';
  else if (severity >= 60) level = 'MEDIUM';

  const styles = {
    CRITICAL: 'bg-[var(--severity-critical-bg)] text-[var(--severity-critical-text)] border-[var(--severity-critical-border)]',
    HIGH: 'bg-[var(--severity-high-bg)] text-[var(--severity-high-text)] border-[var(--severity-high-border)]',
    MEDIUM: 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)] border-[var(--severity-medium-border)]',
    LOW: 'bg-[var(--severity-safe-bg)] text-[var(--severity-safe-text)] border-[var(--severity-safe-border)]',
  }[level];

  const dotColors = {
    CRITICAL: 'var(--severity-critical-dot)',
    HIGH: 'var(--severity-high-dot)',
    MEDIUM: 'var(--severity-medium-dot)',
    LOW: 'var(--severity-safe-dot)',
  }[level];

  return (
    <span className={`flex items-center gap-2 text-[11px] font-mono font-semibold px-2.5 py-[3px] rounded-full border ${styles} w-fit shadow-sm`}>
      <div className="flex items-center gap-1.5">
        <span className="tracking-widest">{level}</span>
        <div className="w-[40px] h-1.5 bg-black/10 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${severity}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: dotColors }}
          />
        </div>
        <span>{severity}</span>
      </div>
    </span>
  );
}
