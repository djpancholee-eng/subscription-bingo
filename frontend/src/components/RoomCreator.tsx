import { useState } from 'react';
import { roomClientService } from '../services/room';

interface RoomCreatorProps {
  playerId: string;
  playerName: string;
  onRoomCreated: (roomId: string) => void;
}

export default function RoomCreator({ playerId, playerName, onRoomCreated }: RoomCreatorProps) {
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [maxPlayers, setMaxPlayers] = useState(500);
  const [gameMode, setGameMode] = useState('classic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const room = await roomClientService.createRoom(
        playerId,
        roomName,
        visibility,
        maxPlayers,
        description,
        gameMode
      );

      onRoomCreated(room.id);
    } catch (err) {
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a Room</h2>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <form onSubmit={handleCreateRoom} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            required
            placeholder="e.g., Friday Night Bingo"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Room description (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as 'public' | 'private')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Game Mode</label>
            <select
              value={gameMode}
              onChange={e => setGameMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="classic">Classic</option>
              <option value="speed">Speed</option>
              <option value="pattern">Pattern</option>
              <option value="jackpot">Jackpot</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Max Players: {maxPlayers}
          </label>
          <input
            type="range"
            min="2"
            max="500"
            value={maxPlayers}
            onChange={e => setMaxPlayers(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>2</span>
            <span>500</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!roomName || loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  );
}
