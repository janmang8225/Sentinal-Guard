import { ExternalLink } from 'lucide-react';
import { truncateAddress, explorerUrl } from '@/lib/utils';

export default function ExplorerLink({ signature, label, type = 'tx' }: { signature: string; label?: string; type?: 'tx' | 'address' }) {
  return (
    <a
      href={explorerUrl(signature, type)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[13px] text-brand-primary hover:text-brand-dark transition-colors"
    >
      {label || truncateAddress(signature)}
      <ExternalLink size={12} />
    </a>
  );
}
