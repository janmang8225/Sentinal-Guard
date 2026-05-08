'use client';
import { useState } from 'react';
import { truncateAddress } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

export default function AddressBadge({ address, chars = 6, showCopy = true }: { address: string; chars?: number; showCopy?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 bg-transparent w-fit group relative">
      <span className="font-mono text-[13px] text-primary">{truncateAddress(address, chars)}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-tertiary hover:text-primary transition-colors focus:outline-none relative"
          title="Copy address"
        >
          {copied ? <Check size={14} className="text-[#22c55e]" /> : <Copy size={14} />}
          
          {copied && (
            <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-primary text-surface text-[11px] font-medium px-2 py-1 rounded-[4px] whitespace-nowrap z-50">
              ✓ Copied
            </div>
          )}
        </button>
      )}
    </div>
  );
}
