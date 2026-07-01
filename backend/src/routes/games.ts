import express, { Router, Request, Response } from 'express';
import { GameEngine } from '../engine/game-engine';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();
const gameEngine = new GameEngine();

// Create game
router.post('/', (req: Request, res: Response) => {
  try {
    const { hostId, name, mode = 'classic', maxPlayers = 500 } = req.body;

    if (!hostId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = gameEngine.createGame(hostId, name, mode, maxPlayers);

    res.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        mode: game.mode,
        status: game.status,
        hostId: game.hostId,
        maxPlayers: game.maxPlayers,
        createdAt: game.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game
router.get('/:gameId', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = gameEngine.getGame(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        mode: game.mode,
        status: game.status,
        hostId: game.hostId,
        playerCount: game.players.size,
        maxPlayers: game.maxPlayers,
        numbersCalled: game.calledNumbers.size,
        winners: game.winners.length,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Get game stats
router.get('/:gameId/stats', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const stats = gameEngine.getGameStats(gameId);

    if (!stats) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
});

// Get all games
router.get('/', (req: Request, res: Response) => {
  try {
    const games = gameEngine.getAllGames();

    res.json({
      success: true,
      count: games.length,
      games: games.map(g => ({
        id: g.id,
        name: g.name,
        mode: g.mode,
        status: g.status,
        playerCount: g.players.size,
        maxPlayers: g.maxPlayers,
        createdAt: g.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Start game
router.post('/:gameId/start', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const success = gameEngine.startGame(gameId);

    if (!success) {
      return res.status(400).json({ error: 'Cannot start game' });
    }

    res.json({ success: true, message: 'Game started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// End game
router.post('/:gameId/end', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const success = gameEngine.endGame(gameId);

    if (!success) {
      return res.status(400).json({ error: 'Cannot end game' });
    }

    res.json({ success: true, message: 'Game ended' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end game' });
  }
});

// Pause game
router.post('/:gameId/pause', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const success = gameEngine.pauseGame(gameId);

    if (!success) {
      return res.status(400).json({ error: 'Cannot pause game' });
    }

    res.json({ success: true, message: 'Game paused' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause game' });
  }
});

// Resume game
router.post('/:gameId/resume', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const success = gameEngine.resumeGame(gameId);

    if (!success) {
      return res.status(400).json({ error: 'Cannot resume game' });
    }

    res.json({ success: true, message: 'Game resumed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume game' });
  }
});

// Get players in game
router.get('/:gameId/players', (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const players = gameEngine.getPlayersInGame(gameId);

    res.json({
      success: true,
      count: players.length,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        joinedAt: p.joinedAt,
        isActive: p.isActive,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

export { router as gamesRouter, gameEngine };
