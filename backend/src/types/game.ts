export type GameStatus = 'pending' | 'active' | 'paused' | 'ended';
export type BingoMode = 'classic' | 'speed' | 'subscription' | 'pattern' | 'jackpot';

export interface Player {
  id: string;
  name: string;
  email: string;
  socketId: string;
  joinedAt: Date;
  isActive: boolean;
  markedNumbers: Set<number>;
  winningPatterns: string[];
}

export interface Game {
  id: string;
  name: string;
  mode: BingoMode;
  status: GameStatus;
  hostId: string;
  players: Map<string, Player>;
  calledNumbers: Set<number>;
  winners: string[];
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  maxPlayers: number;
  timeLimit?: number; // in seconds
}

export interface GameStats {
  gameId: string;
  totalPlayers: number;
  activePlayers: number;
  numbersCalled: number;
  winners: number;
  averageTimePerNumber: number;
  uptime: number; // in seconds
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messageQueueSize: number;
  averageLatency: number;
  connectionErrors: number;
}
