import { useState, useEffect } from 'react';
import { RoomFilter } from '../types/room';

export interface RoomData {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  visibility: 'public' | 'private';
  status: 'open' | 'full' | 'closed';
  maxPlayers: number;
  currentPlayers: number;
  gameMode?: string;
  tags: string[];
  createdAt: string;
}

const API_BASE = '/api/rooms';

export class RoomClientService {
  // Create room
  async createRoom(
    hostId: string,
    name: string,
    visibility: 'public' | 'private' = 'public',
    maxPlayers: number = 500,
    description?: string,
    gameMode?: string
  ): Promise<RoomData> {
    const response = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId,
        name,
        visibility,
        maxPlayers,
        description,
        gameMode,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to create room');
    return data.room;
  }

  // Get room
  async getRoom(roomId: string): Promise<RoomData> {
    const response = await fetch(`${API_BASE}/${roomId}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch room');
    return data.room;
  }

  // Join room
  async joinRoom(roomId: string, playerId: string, password?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, password }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to join room');
  }

  // Leave room
  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to leave room');
  }

  // Search rooms
  async searchRooms(
    filter: RoomFilter,
    limit: number = 50
  ): Promise<RoomData[]> {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...filter, limit }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to search rooms');
    return data.rooms;
  }

  // Get public rooms
  async getPublicRooms(limit: number = 50): Promise<RoomData[]> {
    const response = await fetch(`${API_BASE}?limit=${limit}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch public rooms');
    return data.rooms;
  }

  // Get player's rooms
  async getPlayerRooms(playerId: string): Promise<RoomData[]> {
    const response = await fetch(`${API_BASE}/player/${playerId}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch player rooms');
    return data.rooms;
  }

  // Add message
  async addMessage(
    roomId: string,
    playerId: string,
    playerName: string,
    message: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, playerName, message }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to send message');
  }

  // Get messages
  async getMessages(roomId: string, limit: number = 50): Promise<any[]> {
    const response = await fetch(`${API_BASE}/${roomId}/messages?limit=${limit}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch messages');
    return data.messages;
  }
}

export const roomClientService = new RoomClientService();
