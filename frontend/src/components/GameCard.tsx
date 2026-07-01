import { Link } from 'react-router-dom';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    status: 'pending' | 'active' | 'completed';
    playerCount: number;
    createdAt: string;
  };
}

export default function GameCard({ game }: GameCardProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  return (
    <Link to={`/games/${game.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[game.status]}`}>
            {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p>👥 {game.playerCount} player{game.playerCount !== 1 ? 's' : ''}</p>
          <p>📅 {new Date(game.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </Link>
  );
}
