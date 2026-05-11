"use client";

import { useState, useRef } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({
  lang,
  filename,
  children,
}: {
  lang: string;
  filename: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = () => {
    if (codeRef.current) {
      const textToCopy = codeRef.current.innerText || codeRef.current.textContent || '';
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="overflow-hidden rounded-[12px] bg-[#0F172A] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#93C5FD]">
          {filename}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12px] text-[#64748B] transition hover:text-[#E2E8F0]"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? <span className="text-green-400">Copied!</span> : <span>Copy</span>}
        </button>
      </div>
      <div className="px-6 py-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          {lang}
        </div>
        <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
          <code ref={codeRef}>{children}</code>
        </pre>
      </div>
    </div>
  );
}
