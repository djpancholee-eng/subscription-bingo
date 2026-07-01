export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'open' | 'full' | 'closed';

export interface Room {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  maxPlayers: number;
  currentPlayers: number;
  gameMode?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  members: Set<string>; // playerIds
  games: string[]; // gameIds
  settings: RoomSettings;
  statistics: RoomStatistics;
}

export interface RoomSettings {
  allowChat: boolean;
  allowSpectators: boolean;
  autoStartGames: boolean;
  timeLimit?: number;
  passwordProtected: boolean;
  password?: string;
}

export interface RoomStatistics {
  totalGamesPlayed: number;
  totalPlayersJoined: number;
  averagePlayersPerGame: number;
  createdGames: number;
  completedGames: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system';
}

export interface RoomFilter {
  visibility?: RoomVisibility;
  status?: RoomStatus;
  gameMode?: string;
  tags?: string[];
  hasSpace?: boolean;
  searchText?: string;
}
