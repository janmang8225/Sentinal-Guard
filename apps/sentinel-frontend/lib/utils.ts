import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatUSD = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

export const truncateAddress = (addr: string, chars = 8): string => {
  if (!addr || addr.length < chars + 4) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-4)}`;
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const getRuleTitle = (rule: string): string => ({
  FLASH_LOAN_DRAIN: 'Flash Loan + Drain Detected',
  TVL_VELOCITY: 'TVL Velocity Drop Detected',
  BRIDGE_OUTFLOW_SPIKE: 'Bridge Outflow Spike Detected',
}[rule] ?? rule);

export const getRuleDescription = (rule: string, severity: number): string => {
  if (rule === 'FLASH_LOAN_DRAIN')
    return `Flash loan detected (confidence: 80%) followed by TVL drop within 5-slot window. Severity: ${severity}/99.`;
  if (rule === 'TVL_VELOCITY')
    return `TVL dropped rapidly within a 10-slot rolling window. Score scaled to ${severity}/99 based on drop magnitude.`;
  return `Bridge outflow spike detected. Severity: ${severity}/99.`;
};

export const explorerUrl = (sig: string, type: 'tx' | 'address' = 'tx'): string => {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_CLUSTER ?? 'custom';
  const customUrl = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_CUSTOM_URL ?? 'http://127.0.0.1:8899';
  return `https://explorer.solana.com/${type}/${sig}?cluster=${cluster}&customUrl=${encodeURIComponent(customUrl)}`;
};
