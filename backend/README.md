# Subscription Bingo - Backend

Node.js/Express API for managing subscription bingo games.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

Server will run on http://localhost:5000

## API Endpoints

### Games
- `POST /api/games` - Create a new game
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get game details
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `POST /api/games/:id/start` - Start a game
- `POST /api/games/:id/end` - End a game

### Players
- `POST /api/players` - Add player
- `GET /api/games/:gameId/players` - List game players
- `DELETE /api/players/:id` - Remove player

## WebSocket Events

- `game:started` - Game started
- `game:ended` - Game ended
- `player:joined` - Player joined
- `player:left` - Player left
- `bingo:called` - Bingo called
