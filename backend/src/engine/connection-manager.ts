import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameEngine } from './game-engine';

const CONNECTION_TIMEOUT = 120000; // 2 minutes
const BATCH_SIZE = 1000; // Batch size for large player counts
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX_EVENTS = 100; // Max events per second per socket

interface SocketMetadata {
  playerId?: string;
  gameId?: string;
  lastActivity: Date;
  messageCount: number;
  messageCountWindow: number[];
}

export class ConnectionManager {
  private io: SocketIOServer;
  private gameEngine: GameEngine;
  private socketMetadata = new Map<string, SocketMetadata>();
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(io: SocketIOServer, gameEngine: GameEngine) {
    this.io = io;
    this.gameEngine = gameEngine;
  }

  // Handle new connection
  handleConnection(socket: Socket): void {
    this.socketMetadata.set(socket.id, {
      lastActivity: new Date(),
      messageCount: 0,
      messageCountWindow: [],
    });

    // Set up heartbeat
    this.setupConnectionTimeout(socket.id);
  }

  // Handle disconnection
  handleDisconnection(socket: Socket): void {
    const metadata = this.socketMetadata.get(socket.id);
    if (metadata?.gameId && metadata?.playerId) {
      this.gameEngine.removePlayer(metadata.gameId, metadata.playerId);
      this.broadcastPlayerLeft(metadata.gameId, metadata.playerId);
    }

    this.socketMetadata.delete(socket.id);
    this.clearConnectionTimeout(socket.id);
  }

  // Register player connection
  registerPlayer(socketId: string, gameId: string, playerId: string): void {
    const metadata = this.socketMetadata.get(socketId);
    if (metadata) {
      metadata.gameId = gameId;
      metadata.playerId = playerId;
    }
  }

  // Broadcast to game room
  broadcastToGame(gameId: string, event: string, data: any): void {
    const game = this.gameEngine.getGame(gameId);
    if (!game) return;

    // For large player counts, batch messages
    if (game.players.size > BATCH_SIZE) {
      this.broadcastBatched(gameId, event, data);
    } else {
      this.io.to(`game:${gameId}`).emit(event, data);
    }
  }

  // Broadcast to specific player
  broadcastToPlayer(gameId: string, playerId: string, event: string, data: any): void {
    const game = this.gameEngine.getGame(gameId);
    if (!game) return;

    const player = game.players.get(playerId);
    if (player) {
      this.io.to(player.socketId).emit(event, data);
    }
  }

  // Broadcast player joined
  broadcastPlayerJoined(gameId: string, playerId: string, playerName: string): void {
    const game = this.gameEngine.getGame(gameId);
    if (!game) return;

    this.broadcastToGame(gameId, 'player:joined', {
      playerId,
      playerName,
      playerCount: game.players.size,
      timestamp: new Date(),
    });
  }

  // Broadcast player left
  broadcastPlayerLeft(gameId: string, playerId: string): void {
    const game = this.gameEngine.getGame(gameId);
    if (!game) return;

    this.broadcastToGame(gameId, 'player:left', {
      playerId,
      playerCount: game.players.size,
      timestamp: new Date(),
    });
  }

  // Broadcast number called
  broadcastNumberCalled(gameId: string, number: number): void {
    this.broadcastToGame(gameId, 'number:called', {
      number,
      timestamp: new Date(),
    });
  }

  // Broadcast player win
  broadcastPlayerWin(gameId: string, playerId: string, playerName: string, pattern: string): void {
    this.broadcastToGame(gameId, 'player:win', {
      playerId,
      playerName,
      pattern,
      timestamp: new Date(),
    });
  }

  // Check rate limit
  checkRateLimit(socketId: string): boolean {
    const metadata = this.socketMetadata.get(socketId);
    if (!metadata) return false;

    const now = Date.now();
    metadata.messageCountWindow = metadata.messageCountWindow.filter(
      t => now - t < RATE_LIMIT_WINDOW
    );

    if (metadata.messageCountWindow.length >= RATE_LIMIT_MAX_EVENTS) {
      return false; // Rate limit exceeded
    }

    metadata.messageCountWindow.push(now);
    return true;
  }

  // Update activity
  updateActivity(socketId: string): void {
    const metadata = this.socketMetadata.get(socketId);
    if (metadata) {
      metadata.lastActivity = new Date();
    }
  }

  // Get connection metrics
  getConnectionMetrics() {
    const totalConnections = this.socketMetadata.size;
    const activeConnections = Array.from(this.socketMetadata.values()).filter(m =>
      Date.now() - m.lastActivity.getTime() < CONNECTION_TIMEOUT
    ).length;

    const avgLatency = this.calculateAverageLatency();

    return {
      totalConnections,
      activeConnections,
      averageLatency: avgLatency,
      metrics: Array.from(this.socketMetadata.values()).map(m => ({
        messageCount: m.messageCount,
        lastActivity: m.lastActivity,
      })),
    };
  }

  // Private methods
  private broadcastBatched(gameId: string, event: string, data: any): void {
    const players = Array.from(this.gameEngine.getGame(gameId)?.players.values() || []);

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      batch.forEach(player => {
        this.io.to(player.socketId).emit(event, data);
      });

      // Small delay between batches
      if (i + BATCH_SIZE < players.length) {
        setTimeout(() => {}, 10);
      }
    }
  }

  private setupConnectionTimeout(socketId: string): void {
    this.clearConnectionTimeout(socketId);

    const timeout = setTimeout(() => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }, CONNECTION_TIMEOUT);

    this.connectionTimeouts.set(socketId, timeout);
  }

  private clearConnectionTimeout(socketId: string): void {
    const timeout = this.connectionTimeouts.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(socketId);
    }
  }

  private calculateAverageLatency(): number {
    if (this.socketMetadata.size === 0) return 0;

    let totalLatency = 0;
    let count = 0;

    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.handshake) {
        count++;
      }
    }

    return count > 0 ? totalLatency / count : 0;
  }

  // Cleanup
  destroy(): void {
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.connectionTimeouts.clear();
    this.socketMetadata.clear();
  }
}
