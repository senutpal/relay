import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { Match, Commentary } from '../types/api';

export function useMatches(limit?: number) {
  return useQuery({
    queryKey: ['matches', limit],
    queryFn: () => apiClient.getMatches(limit),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => apiClient.getMatch(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCommentary(matchId: string, limit?: number) {
  return useQuery({
    queryKey: ['commentary', matchId, limit],
    queryFn: () => apiClient.getCommentary(matchId, limit),
    enabled: !!matchId,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}


export function useCommentaryUpdater() {
  const queryClient = useQueryClient();

  const addCommentary = (matchId: string, commentary: Commentary) => {

    queryClient.setQueriesData(
      { queryKey: ['commentary', matchId] },
      (oldData: { data: Commentary[] } | undefined) => {
        if (!oldData) return { data: [commentary] };


        const exists = oldData.data.some(c => c.id === commentary.id);
        if (exists) return oldData;

        return {
          data: [commentary, ...oldData.data],
        };
      }
    );
  };

  const updateMatch = (match: Match) => {
    queryClient.setQueryData(['match', match.id], { data: match });
    queryClient.setQueryData(
      ['matches'],
      (oldData: { data: Match[] } | undefined) => {
        if (!oldData) return { data: [match] };
        const existing = oldData.data.find(m => m.id === match.id);
        if (existing) {
          return {
            data: oldData.data.map(m => m.id === match.id ? match : m),
          };
        }
        return {
          data: [match, ...oldData.data],
        };
      }
    );
  };

  return { addCommentary, updateMatch };
}