import express, { Router, Request, Response } from 'express';
import { RoomManager } from '../engine/room-manager';
import { RoomFilter } from '../types/room';

const router: Router = express.Router();
const roomManager = new RoomManager();

// Create room
router.post('/', (req: Request, res: Response) => {
  try {
    const { hostId, name, visibility = 'public', maxPlayers = 500, description, gameMode } = req.body;

    if (!hostId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = roomManager.createRoom(hostId, name, visibility, maxPlayers, description, gameMode);

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        visibility: room.visibility,
        status: room.status,
        maxPlayers: room.maxPlayers,
        currentPlayers: room.currentPlayers,
        gameMode: room.gameMode,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room
router.get('/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        visibility: room.visibility,
        status: room.status,
        maxPlayers: room.maxPlayers,
        currentPlayers: room.currentPlayers,
        gameMode: room.gameMode,
        tags: room.tags,
        createdAt: room.createdAt,
        members: Array.from(room.members).length,
        games: room.games,
        settings: room.settings,
        statistics: room.statistics,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Join room
router.post('/:roomId/join', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId, password } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    const success = roomManager.joinRoom(roomId, playerId, password);

    if (!success) {
      return res.status(400).json({ error: 'Cannot join room' });
    }

    res.json({ success: true, message: 'Joined room' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Leave room
router.post('/:roomId/leave', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    const success = roomManager.leaveRoom(roomId, playerId);

    if (!success) {
      return res.status(400).json({ error: 'Cannot leave room' });
    }

    res.json({ success: true, message: 'Left room' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Search rooms
router.post('/search', (req: Request, res: Response) => {
  try {
    const { visibility, status, gameMode, tags, hasSpace, searchText, limit = 50 } = req.body;

    const filter: RoomFilter = {
      visibility,
      status,
      gameMode,
      tags,
      hasSpace,
      searchText,
    };

    const rooms = roomManager.searchRooms(filter, limit);

    res.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        hostId: r.hostId,
        visibility: r.visibility,
        status: r.status,
        maxPlayers: r.maxPlayers,
        currentPlayers: r.currentPlayers,
        gameMode: r.gameMode,
        tags: r.tags,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search rooms' });
  }
});

// Get public rooms
router.get('/', (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const rooms = roomManager.getPublicRooms(parseInt(limit as string));

    res.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        hostId: r.hostId,
        visibility: r.visibility,
        status: r.status,
        maxPlayers: r.maxPlayers,
        currentPlayers: r.currentPlayers,
        gameMode: r.gameMode,
        tags: r.tags,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public rooms' });
  }
});

// Get player's rooms
router.get('/player/:playerId', (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const rooms = roomManager.getPlayerRooms(playerId);

    res.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        hostId: r.hostId,
        visibility: r.visibility,
        status: r.status,
        currentPlayers: r.currentPlayers,
        maxPlayers: r.maxPlayers,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player rooms' });
  }
});

// Add message
router.post('/:roomId/messages', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId, playerName, message } = req.body;

    if (!playerId || !playerName || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const roomMessage = roomManager.addMessage(roomId, playerId, playerName, message);

    if (!roomMessage) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      message: roomMessage,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Get messages
router.get('/:roomId/messages', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;
    const messages = roomManager.getRoomMessages(roomId, parseInt(limit as string));

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Update room settings
router.patch('/:roomId/settings', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { hostId, settings } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing hostId' });
    }

    const success = roomManager.updateRoomSettings(roomId, hostId, settings);

    if (!success) {
      return res.status(400).json({ error: 'Cannot update room settings' });
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Add tags
router.post('/:roomId/tags', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { hostId, tags } = req.body;

    if (!hostId || !tags) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const success = roomManager.addTags(roomId, hostId, tags);

    if (!success) {
      return res.status(400).json({ error: 'Cannot add tags' });
    }

    res.json({ success: true, message: 'Tags added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

// Get room stats
router.get('/stats/overview', (req: Request, res: Response) => {
  try {
    const stats = roomManager.getRoomStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export { router as roomsRouter, roomManager };
