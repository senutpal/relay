import { useEffect, useRef } from 'react';
import { useCommentary } from '../hooks/useApiData';
import { Skeleton } from './ui/skeleton';
import type { Commentary } from '../types/api';
import { cn } from '../lib/utils';

interface CommentaryFeedProps {
  matchId: string;
}

export function CommentaryFeed({ matchId }: CommentaryFeedProps) {
  const { data: commentaryData, isLoading, error } = useCommentary(matchId);
  const feedRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);


  useEffect(() => {
    if (shouldAutoScroll.current && feedRef.current) {
      const scrollContainer = feedRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [commentaryData]);

  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-l-2 border-muted">
            <div className="flex-shrink-0 text-right">
              <Skeleton className="h-4 w-8 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex-grow">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load commentary</p>
      </div>
    );
  }

  const commentary = commentaryData?.data || [];
  const sortedCommentary = [...commentary].sort((a, b) => a.sequence - b.sequence);

  if (sortedCommentary.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No commentary available</p>
      </div>
    );
  }

  const formatTime = (minute?: number) => {
    if (minute === undefined) return '';
    return `${minute}'`;
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'goal':
        return 'border-green-500';
      case 'yellow_card':
        return 'border-yellow-500';
      case 'red_card':
        return 'border-red-500';
      case 'substitution':
        return 'border-blue-500';
      default:
        return 'border-muted-foreground';
    }
  };

  return (
    <div
      ref={feedRef}
      onScroll={handleScroll}
      className="h-[500px] overflow-y-auto space-y-px no-scrollbar bg-black/20 border border-white/5"
    >
      {sortedCommentary.map((item: Commentary, index: number) => (
        <div
          key={item.id}
          className={cn(
            "flex gap-6 p-6 transition-all duration-700 border-b border-white/5",
            index === sortedCommentary.length - 1 ? "bg-primary/5 animate-in fade-in slide-in-from-left-4" : "bg-transparent"
          )}
        >
          <div className="flex-shrink-0 text-right w-12 border-r border-white/5 pr-4 flex flex-col justify-center">
            <div className="font-black text-xs tracking-tighter tabular-nums text-white">
              {formatTime(item.minute)}
            </div>
            {item.period && (
              <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                {item.period.split(' ')[0]}
              </div>
            )}
          </div>

          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm",
                item.eventType === 'goal' ? "bg-primary text-black" : "bg-white/10 text-muted-foreground"
              )}>
                {item.eventType.replace('_', ' ')}
              </span>
              {item.team && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                  {item.team}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-relaxed tracking-tight text-white/90">
              {item.message}
            </p>
          </div>

          <div className="flex-shrink-0 text-[10px] font-bold text-muted-foreground/30 tabular-nums self-center">
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
