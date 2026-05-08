import { RULE_LABELS } from '@/lib/constants';

export default function RuleBadge({ rule }: { rule: string }) {
  let bg = 'bg-brand-light';
  let text = 'text-brand-primary';
  let border = 'border-brand-light';

  if (rule === 'FLASH_LOAN_DRAIN') {
    bg = 'bg-[var(--severity-medium-bg)]';
    text = 'text-[var(--severity-medium-text)]';
    border = 'border-[var(--severity-medium-border)]';
  } else if (rule === 'TVL_VELOCITY') {
    bg = 'bg-[var(--severity-critical-bg)]';
    text = 'text-[var(--severity-critical-text)]';
    border = 'border-[var(--severity-critical-border)]';
  } else if (rule === 'BRIDGE_OUTFLOW') {
    bg = 'bg-[var(--severity-high-bg)]';
    text = 'text-[var(--severity-high-text)]';
    border = 'border-[var(--severity-high-border)]';
  }

  return (
    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${bg} ${text} ${border}`}>
      {RULE_LABELS[rule] || rule}
    </span>
  );
}
