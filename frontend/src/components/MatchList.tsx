import { useMatches } from '../hooks/useApiData';
import { MatchCard } from './MatchCard';
import { Skeleton } from './ui/skeleton';
import type { Match } from '../types/api';

interface MatchListProps {
  onMatchSelect?: (match: Match) => void;
}

export function MatchList({ onMatchSelect }: MatchListProps) {
  const { data: matchesData, isLoading, error } = useMatches();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-right">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="px-6">
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="text-left">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load matches</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const matches = matchesData?.data || [];

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No matches available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          onClick={() => onMatchSelect?.(match)}
        />
      ))}
    </div>
  );
}