import { Game, Player, GameStatus, BingoMode, GameStats } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'redis';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 120000; // 2 minutes
const MAX_PLAYERS_DEFAULT = 500;

export class GameEngine {
  private games = new Map<string, Game>();
  private playerToGame = new Map<string, string>(); // playerId -> gameId
  private redis: Redis.RedisClient | null = null;
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private gameMetrics = new Map<string, { messageCount: number; lastUpdate: Date }>();

  constructor(redisClient?: Redis.RedisClient) {
    this.redis = redisClient || null;
  }

  // Create a new game
  createGame(
    hostId: string,
    name: string,
    mode: BingoMode = 'classic',
    maxPlayers: number = MAX_PLAYERS_DEFAULT
  ): Game {
    const gameId = uuidv4();
    const game: Game = {
      id: gameId,
      name,
      mode,
      status: 'pending',
      hostId,
      players: new Map(),
      calledNumbers: new Set(),
      winners: [],
      createdAt: new Date(),
      maxPlayers,
    };

    this.games.set(gameId, game);
    this.gameMetrics.set(gameId, { messageCount: 0, lastUpdate: new Date() });

    // Cache in Redis if available
    if (this.redis) {
      this.redis.setex(`game:${gameId}`, 86400, JSON.stringify({
        id: gameId,
        name,
        mode,
        status: 'pending',
      }));
    }

    return game;
  }

  // Get game by ID
  getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  // Add player to game
  addPlayer(gameId: string, player: Omit<Player, 'markedNumbers' | 'winningPatterns'>): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status === 'ended' || game.players.size >= game.maxPlayers) {
      return false;
    }

    const newPlayer: Player = {
      ...player,
      markedNumbers: new Set(),
      winningPatterns: [],
    };

    game.players.set(player.id, newPlayer);
    this.playerToGame.set(player.id, gameId);

    // Cache player in Redis
    if (this.redis) {
      this.redis.setex(
        `player:${player.id}`,
        3600,
        JSON.stringify({ gameId, name: player.name, joinedAt: player.joinedAt })
      );
    }

    return true;
  }

  // Remove player from game
  removePlayer(gameId: string, playerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const removed = game.players.delete(playerId);
    if (removed) {
      this.playerToGame.delete(playerId);
    }

    // Remove from Redis
    if (this.redis) {
      this.redis.del(`player:${playerId}`);
    }

    // Auto-end game if no players left
    if (game.players.size === 0 && game.status === 'active') {
      this.endGame(gameId);
    }

    return removed;
  }

  // Get player
  getPlayer(gameId: string, playerId: string): Player | null {
    const game = this.games.get(gameId);
    return game?.players.get(playerId) || null;
  }

  // Start game
  startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'pending' || game.players.size === 0) {
      return false;
    }

    game.status = 'active';
    game.startedAt = new Date();

    // Set up heartbeat
    this.setupHeartbeat(gameId);

    return true;
  }

  // Call a number
  callNumber(gameId: string, number: number): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') {
      return false;
    }

    if (game.calledNumbers.has(number)) {
      return false; // Already called
    }

    game.calledNumbers.add(number);

    // Update metrics
    const metrics = this.gameMetrics.get(gameId);
    if (metrics) {
      metrics.messageCount++;
      metrics.lastUpdate = new Date();
    }

    // Cache called numbers in Redis
    if (this.redis) {
      this.redis.sadd(`game:${gameId}:calledNumbers`, number.toString());
    }

    return true;
  }

  // Mark square for player
  markSquare(gameId: string, playerId: string, number: number): boolean {
    const game = this.games.get(gameId);
    const player = game?.players.get(playerId);

    if (!game || !player) {
      return false;
    }

    player.markedNumbers.add(number);
    return true;
  }

  // Record winning pattern for player
  recordWin(gameId: string, playerId: string, pattern: string): boolean {
    const game = this.games.get(gameId);
    const player = game?.players.get(playerId);

    if (!game || !player) {
      return false;
    }

    if (!player.winningPatterns.includes(pattern)) {
      player.winningPatterns.push(pattern);
      game.winners.push(playerId);

      // Cache win in Redis
      if (this.redis) {
        this.redis.sadd(`game:${gameId}:winners`, playerId);
      }

      return true;
    }

    return false;
  }

  // Pause game
  pauseGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') {
      return false;
    }

    game.status = 'paused';
    this.clearHeartbeat(gameId);

    return true;
  }

  // Resume game
  resumeGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'paused') {
      return false;
    }

    game.status = 'active';
    this.setupHeartbeat(gameId);

    return true;
  }

  // End game
  endGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    game.status = 'ended';
    game.endedAt = new Date();
    this.clearHeartbeat(gameId);

    // Clean up old game data after 24 hours
    setTimeout(() => {
      this.games.delete(gameId);
      this.gameMetrics.delete(gameId);
    }, 86400000);

    return true;
  }

  // Get game stats
  getGameStats(gameId: string): GameStats | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const activePlayers = Array.from(game.players.values()).filter(p => p.isActive).length;
    const uptime = game.startedAt ? Date.now() - game.startedAt.getTime() : 0;

    return {
      gameId,
      totalPlayers: game.players.size,
      activePlayers,
      numbersCalled: game.calledNumbers.size,
      winners: game.winners.length,
      averageTimePerNumber: uptime > 0 ? uptime / game.calledNumbers.size : 0,
      uptime: Math.floor(uptime / 1000),
    };
  }

  // Get all games
  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  // Get active games
  getActiveGames(): Game[] {
    return Array.from(this.games.values()).filter(g => g.status === 'active');
  }

  // Get players in game
  getPlayersInGame(gameId: string): Player[] {
    const game = this.games.get(gameId);
    return game ? Array.from(game.players.values()) : [];
  }

  // Get active players in game
  getActivePlayersInGame(gameId: string): Player[] {
    const game = this.games.get(gameId);
    if (!game) return [];
    return Array.from(game.players.values()).filter(p => p.isActive);
  }

  // Update player connection status
  updatePlayerConnection(gameId: string, playerId: string, isActive: boolean): boolean {
    const player = this.getPlayer(gameId, playerId);
    if (!player) return false;

    player.isActive = isActive;
    return true;
  }

  // Private methods
  private setupHeartbeat(gameId: string): void {
    if (this.heartbeatIntervals.has(gameId)) {
      return; // Already set up
    }

    const interval = setInterval(() => {
      const game = this.games.get(gameId);
      if (!game || game.status !== 'active') {
        this.clearHeartbeat(gameId);
        return;
      }

      // Check for inactive players
      const now = Date.now();
      for (const player of game.players.values()) {
        if (player.isActive) {
          // Could add heartbeat check here
        }
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(gameId, interval);
  }

  private clearHeartbeat(gameId: string): void {
    const interval = this.heartbeatIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(gameId);
    }
  }

  // Cleanup
  destroy(): void {
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
  }
}
