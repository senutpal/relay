import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchList } from './components/MatchList';
import { CommentaryFeed } from './components/CommentaryFeed';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { useWebSocket } from './hooks/useWebSocket';
import { useCommentaryUpdater } from './hooks/useApiData';
import type { Match } from './types/api';
import { Trophy, ChevronLeft, Zap } from 'lucide-react';
import { LiveIndicator } from './components/LiveIndicator';
import { cn } from './lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message: any) => {
      if (message.type === 'match_created' && message.data) {
        updater.updateMatch(message.data as Match);
      } else if (message.type === 'commentary' && message.data) {
        updater.addCommentary(message.matchId!, message.data as any);
      }
    },
  });

  const updater = useCommentaryUpdater();

  const handleMatchSelect = (match: Match) => {
    setSelectedMatch(match);
    subscribe(match.id);
  };

  const handleBackToList = () => {
    if (selectedMatch) {
      unsubscribe(selectedMatch.id);
      setSelectedMatch(null);
    }
  };

  return (
    <div className="min-h-screen sports-grid">
      {}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tighter uppercase">
                RELAY
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white/5 border border-white/10">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  System {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {selectedMatch ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {}
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Return
            </button>

            {}
            <div className="relative py-20 border-y border-white/[0.05] overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                <span className="text-[20vw] font-black leading-none tracking-tighter uppercase whitespace-nowrap">
                  {selectedMatch.homeTeam} VS {selectedMatch.awayTeam}
                </span>
              </div>

              <div className="relative grid grid-cols-3 items-center">
                <div className="text-center">
                  <h3 className="text-4xl font-black tracking-tighter uppercase text-white leading-none">
                    {selectedMatch.homeTeam}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] mt-4 font-bold">Home</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-12">
                    <span className="text-9xl font-black tracking-tighter tabular-nums text-white">
                      {selectedMatch.homeScore}
                    </span>
                    <span className="text-4xl font-light text-white/5">-</span>
                    <span className="text-9xl font-black tracking-tighter tabular-nums text-white">
                      {selectedMatch.awayScore}
                    </span>
                  </div>
                  <div className="mt-8">
                    <LiveIndicator status={selectedMatch.status} />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-4xl font-black tracking-tighter uppercase text-white leading-none">
                    {selectedMatch.awayTeam}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] mt-4 font-bold">Away</p>
                </div>
              </div>
            </div>

            {}
            <div className="grid grid-cols-[auto_1fr] gap-12">
              <div className="w-32 pt-6 border-r border-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary rotate-180 [writing-mode:vertical-lr] h-fit sticky top-24">
                  Timeline Live
                </h2>
              </div>
              <CommentaryFeed matchId={selectedMatch.id} />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            <div className="mb-20">
              <h2 className="text-7xl font-black tracking-tighter uppercase leading-none">
                Live<br/><span className="text-primary">Events</span>
              </h2>
              <div className="h-1 w-20 bg-primary mt-6" />
            </div>
            <MatchList onMatchSelect={handleMatchSelect} />
          </div>
        )}
      </main>

      {}
      <footer className="container mx-auto px-4 py-12 border-t border-white/5 mt-20">
        <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-[0.3em]">
          &copy; 2026 Relay Sports Network. Built by Utpal Sen.
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
