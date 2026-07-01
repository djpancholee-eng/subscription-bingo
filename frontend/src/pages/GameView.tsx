import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function GameView() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState(null);

  useEffect(() => {
    // TODO: Fetch game details from API
  }, [id]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Game Details</h1>
      {/* TODO: Implement game view UI */}
      <div className="bg-white rounded-lg p-8">Loading game details...</div>
    </div>
  );
}
