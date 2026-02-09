import { cn } from '../lib/utils';

interface LiveIndicatorProps {
  status: 'live' | 'scheduled' | 'finished';
  className?: string;
}

export function LiveIndicator({ status, className }: LiveIndicatorProps) {
  if (status === 'live') {
    return (
      <div className={cn("flex items-center gap-2 text-[10px] font-black tracking-widest text-red-500 uppercase", className)}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
        </span>
        Live
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className={cn("text-[10px] font-black tracking-widest text-zinc-600 uppercase", className)}>
        Finished
      </div>
    );
  }

  return (
    <div className={cn("text-[10px] font-black tracking-widest text-primary uppercase", className)}>
      Scheduled
    </div>
  );
}
