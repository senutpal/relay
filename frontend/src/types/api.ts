
export interface Match {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  endTime?: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
}

export interface Commentary {
  id: string;
  matchId: string;
  minute?: number;
  sequence: number;
  period?: string;
  eventType: string;
  actor?: string;
  team?: string;
  message: string;
  metadata?: Record<string, any>;
  tags?: string[];
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  message: string;
  details?: any;
}


export interface WebSocketMessage {
  type: 'welcome' | 'match_created' | 'commentary' | 'subscribe' | 'unsubscribed' | 'error';
  match?: Match;
  data?: Commentary | Match;
  matchId?: string;
  message?: string;
}

export interface SubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  matchId: string;
}