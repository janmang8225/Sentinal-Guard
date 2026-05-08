import { clsx } from 'clsx';

export default function StatusIndicator({ status, showText = false }: { status: 'PAUSED' | 'ACTIVE' | 'WATCHING', showText?: boolean }) {
  const isPaused = status === 'PAUSED';
  const isActive = status === 'ACTIVE';
  
  return (
    <div className="flex items-center gap-2">
      <div className={clsx(
        "w-2 h-2 rounded-full",
        isPaused ? 'bg-status-paused animate-pulse' : 
        isActive ? 'bg-status-active' : 'bg-status-watching'
      )} />
      {showText && (
        <span className={clsx(
          "text-[12px] font-semibold tracking-wide",
          isPaused ? 'text-status-paused' : 
          isActive ? 'text-status-active' : 'text-status-watching'
        )}>
          {status}
        </span>
      )}
    </div>
  );
}
