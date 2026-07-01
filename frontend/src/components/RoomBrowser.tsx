import { useState, useEffect } from 'react';
import { roomClientService, RoomData } from '../services/room';

export default function RoomBrowser() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'full'>('open');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const publicRooms = await roomClientService.getPublicRooms(100);
      setRooms(publicRooms);
      setError('');
    } catch (err) {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedGameMode && room.gameMode !== selectedGameMode) {
      return false;
    }
    if (filterStatus === 'open' && room.status !== 'open') {
      return false;
    }
    if (filterStatus === 'full' && room.status !== 'full') {
      return false;
    }
    return true;
  });

  if (loading && rooms.length === 0) {
    return <div className="text-center py-8 text-gray-600">Loading rooms...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🎮 Game Rooms</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | 'open' | 'full')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Rooms</option>
          <option value="open">Open Rooms</option>
          <option value="full">Full Rooms</option>
        </select>
        <button
          onClick={fetchRooms}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Refresh
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {/* Rooms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map(room => (
          <div key={room.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
            <div className="mb-3">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{room.name}</h3>
              {room.description && <p className="text-sm text-gray-600">{room.description}</p>}
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Players:</span>
                <span className="font-semibold">
                  {room.currentPlayers}/{room.maxPlayers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-semibold">{room.gameMode || 'Classic'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    room.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {room.status === 'open' ? '✓ Open' : 'Full'}
                </span>
              </div>
            </div>

            {/* Tags */}
            {room.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {room.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <button
              disabled={room.status === 'full'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {room.status === 'open' ? 'Join Room' : 'Room Full'}
            </button>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-8 text-gray-500">No rooms match your criteria</div>
      )}
    </div>
  );
}
