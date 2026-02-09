import { Card, CardContent } from './ui/card';
import { LiveIndicator } from './LiveIndicator';
import type { Match } from '../types/api';
import { cn } from '../lib/utils';
import { Trophy, Clock } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  className?: string;
}

export function MatchCard({ match, onClick, className }: MatchCardProps) {
  const isLive = match.status === 'live';

  const formatTime = () => {
    const date = new Date(match.startTime);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[1fr_auto_1fr] items-center p-8 bg-transparent border-b border-white/[0.05] transition-all duration-200 hover:bg-white/[0.02] cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {}
      <div className="flex flex-col items-start space-y-1">
        <h3 className="font-black tracking-tight text-xl uppercase text-white leading-none">
          {match.homeTeam}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          {capitalize(match.sport)}
        </span>
      </div>

      {}
      <div className="flex flex-col items-center px-12 space-y-2">
        <div className="flex items-center gap-6">
          <span className={cn(
            "text-4xl font-black tracking-tighter tabular-nums",
            isLive ? "text-primary" : "text-white/20"
          )}>
            {match.status === 'scheduled' ? '0' : match.homeScore}
          </span>
          <span className="text-white/5 font-light text-2xl">-</span>
          <span className={cn(
            "text-4xl font-black tracking-tighter tabular-nums",
            isLive ? "text-primary" : "text-white/20"
          )}>
            {match.status === 'scheduled' ? '0' : match.awayScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LiveIndicator status={match.status} />
          <span className="text-[9px] font-bold text-muted-foreground/30 tabular-nums">
            {formatTime()}
          </span>
        </div>
      </div>

      {}
      <div className="flex flex-col items-end space-y-1">
        <h3 className="font-black tracking-tight text-xl uppercase text-white leading-none text-right">
          {match.awayTeam}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 text-right">
          {capitalize(match.sport)}
        </span>
      </div>

      {}
      <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
    </div>
  );
}
