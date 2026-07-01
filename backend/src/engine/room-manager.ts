import { Room, RoomVisibility, RoomStatus, RoomSettings, RoomStatistics, RoomMessage, RoomFilter } from '../types/room';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'redis';

const ROOM_TTL = 86400; // 24 hours
const MAX_ROOMS_MEMORY = 10000;
const CLEANUP_INTERVAL = 300000; // 5 minutes
const DEFAULT_MAX_PLAYERS = 500;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private redis: Redis.RedisClient | null = null;
  private roomMessages = new Map<string, RoomMessage[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(redisClient?: Redis.RedisClient) {
    this.redis = redisClient || null;
    this.startCleanup();
  }

  // Create a new room
  createRoom(
    hostId: string,
    name: string,
    visibility: RoomVisibility = 'public',
    maxPlayers: number = DEFAULT_MAX_PLAYERS,
    description?: string,
    gameMode?: string
  ): Room {
    const roomId = uuidv4();
    const now = new Date();

    const room: Room = {
      id: roomId,
      name,
      description,
      hostId,
      visibility,
      status: 'open',
      maxPlayers,
      currentPlayers: 1,
      gameMode,
      tags: [],
      createdAt: now,
      updatedAt: now,
      members: new Set([hostId]),
      games: [],
      settings: {
        allowChat: true,
        allowSpectators: true,
        autoStartGames: false,
        passwordProtected: false,
      },
      statistics: {
        totalGamesPlayed: 0,
        totalPlayersJoined: 1,
        averagePlayersPerGame: 0,
        createdGames: 0,
        completedGames: 0,
      },
    };

    this.rooms.set(roomId, room);
    this.roomMessages.set(roomId, []);

    // Cache in Redis
    if (this.redis) {
      this.cacheRoom(room);
    }

    return room;
  }

  // Get room by ID
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  // Join room
  joinRoom(roomId: string, playerId: string, password?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Check room status
    if (room.status === 'closed') return false;
    if (room.currentPlayers >= room.maxPlayers) {
      room.status = 'full';
      return false;
    }

    // Check password
    if (room.settings.passwordProtected && room.settings.password !== password) {
      return false;
    }

    // Check if already member
    if (room.members.has(playerId)) return false;

    room.members.add(playerId);
    room.currentPlayers++;
    room.statistics.totalPlayersJoined++;
    room.updatedAt = new Date();

    // Update status
    if (room.currentPlayers >= room.maxPlayers) {
      room.status = 'full';
    }

    if (this.redis) {
      this.cacheRoom(room);
    }

    return true;
  }

  // Leave room
  leaveRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.members.has(playerId)) return false;

    room.members.delete(playerId);
    room.currentPlayers--;
    room.updatedAt = new Date();

    // Update status
    if (room.currentPlayers < room.maxPlayers) {
      room.status = 'open';
    }

    // Transfer host if host leaves
    if (playerId === room.hostId && room.members.size > 0) {
      room.hostId = Array.from(room.members)[0];
    }

    // Delete room if empty
    if (room.members.size === 0) {
      this.deleteRoom(roomId);
      return true;
    }

    if (this.redis) {
      this.cacheRoom(room);
    }

    return true;
  }

  // Delete room
  deleteRoom(roomId: string): boolean {
    const deleted = this.rooms.delete(roomId);
    this.roomMessages.delete(roomId);

    if (deleted && this.redis) {
      this.redis.del(`room:${roomId}`);
      this.redis.del(`room:${roomId}:messages`);
    }

    return deleted;
  }

  // Search rooms
  searchRooms(filter: RoomFilter, limit: number = 50): Room[] {
    let results = Array.from(this.rooms.values());

    // Apply filters
    if (filter.visibility) {
      results = results.filter(r => r.visibility === filter.visibility);
    }

    if (filter.status) {
      results = results.filter(r => r.status === filter.status);
    }

    if (filter.gameMode) {
      results = results.filter(r => r.gameMode === filter.gameMode);
    }

    if (filter.hasSpace) {
      results = results.filter(r => r.currentPlayers < r.maxPlayers);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(r =>
        filter.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      results = results.filter(r =>
        r.name.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by popularity (most players first)
    results.sort((a, b) => b.currentPlayers - a.currentPlayers);

    return results.slice(0, limit);
  }

  // Get all public rooms
  getPublicRooms(limit: number = 50): Room[] {
    return this.searchRooms({ visibility: 'public', hasSpace: true }, limit);
  }

  // Get player's rooms
  getPlayerRooms(playerId: string): Room[] {
    return Array.from(this.rooms.values()).filter(r =>
      r.members.has(playerId) || r.hostId === playerId
    );
  }

  // Add message to room
  addMessage(roomId: string, playerId: string, playerName: string, message: string): RoomMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const roomMessage: RoomMessage = {
      id: uuidv4(),
      roomId,
      playerId,
      playerName,
      message,
      timestamp: new Date(),
      type: 'chat',
    };

    const messages = this.roomMessages.get(roomId) || [];
    messages.push(roomMessage);

    // Keep last 100 messages per room
    if (messages.length > 100) {
      messages.shift();
    }

    this.roomMessages.set(roomId, messages);

    if (this.redis) {
      this.redis.lpush(`room:${roomId}:messages`, JSON.stringify(roomMessage));
      this.redis.ltrim(`room:${roomId}:messages`, 0, 99);
    }

    return roomMessage;
  }

  // Get room messages
  getRoomMessages(roomId: string, limit: number = 50): RoomMessage[] {
    const messages = this.roomMessages.get(roomId) || [];
    return messages.slice(-limit);
  }

  // Update room settings
  updateRoomSettings(roomId: string, hostId: string, settings: Partial<RoomSettings>): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return false;

    room.settings = { ...room.settings, ...settings };
    room.updatedAt = new Date();

    if (this.redis) {
      this.cacheRoom(room);
    }

    return true;
  }

  // Add tags to room
  addTags(roomId: string, hostId: string, tags: string[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return false;

    room.tags = Array.from(new Set([...room.tags, ...tags]));
    room.updatedAt = new Date();

    if (this.redis) {
      this.cacheRoom(room);
    }

    return true;
  }

  // Add game to room
  addGameToRoom(roomId: string, gameId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.games.push(gameId);
    room.statistics.createdGames++;
    room.updatedAt = new Date();

    if (this.redis) {
      this.cacheRoom(room);
    }

    return true;
  }

  // Get room statistics
  getRoomStats() {
    const totalRooms = this.rooms.size;
    const publicRooms = Array.from(this.rooms.values()).filter(r => r.visibility === 'public').length;
    const totalMembers = Array.from(this.rooms.values()).reduce((sum, r) => sum + r.currentPlayers, 0);
    const averagePlayersPerRoom = totalRooms > 0 ? totalMembers / totalRooms : 0;

    return {
      totalRooms,
      publicRooms,
      totalMembers,
      averagePlayersPerRoom,
      fullRooms: Array.from(this.rooms.values()).filter(r => r.status === 'full').length,
      memoryUsage: this.rooms.size,
    };
  }

  // Private methods
  private cacheRoom(room: Room): void {
    if (!this.redis) return;

    const roomData = {
      ...room,
      members: Array.from(room.members),
    };

    this.redis.setex(`room:${room.id}`, ROOM_TTL, JSON.stringify(roomData));
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [roomId, room] of this.rooms.entries()) {
        // Delete empty rooms older than 1 hour
        if (
          room.members.size === 0 &&
          now - room.updatedAt.getTime() > 3600000
        ) {
          toDelete.push(roomId);
        }
      }

      toDelete.forEach(roomId => this.deleteRoom(roomId));

      // Log cleanup stats
      if (toDelete.length > 0) {
        console.log(`Cleaned up ${toDelete.length} empty rooms`);
      }
    }, CLEANUP_INTERVAL);
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rooms.clear();
    this.roomMessages.clear();
  }
}
