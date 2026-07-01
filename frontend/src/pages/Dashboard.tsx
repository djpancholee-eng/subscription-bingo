import { useState, useEffect } from 'react';
import GameCard from '../components/GameCard';
import CreateGameModal from '../components/CreateGameModal';

interface Game {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  playerCount: number;
  createdAt: string;
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch games from API
    setLoading(false);
  }, []);

  const handleCreateGame = (gameData: any) => {
    // TODO: Call API to create game
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Games</h1>
          <p className="text-gray-600 mt-2">Manage your subscription bingo games</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          + New Game
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : games.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">No games yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateGameModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateGame}
        />
      )}
    </div>
  );
}
