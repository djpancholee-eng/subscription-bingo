import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { qrcodeClientService } from '../services/qrcode';
import { roomClientService } from '../services/room';

export default function QRJoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { qr } = Object.fromEntries(new URLSearchParams(window.location.search));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    validateAndJoin();
  }, [roomId, qr]);

  const validateAndJoin = async () => {
    try {
      setLoading(true);

      // Validate QR code if provided
      if (qr) {
        const validation = await qrcodeClientService.validateQRCode(qr);
        if (!validation.valid) {
          setError(validation.message);
          return;
        }
      }

      // Get room data
      if (!roomId) {
        setError('Invalid room ID');
        return;
      }

      const room = await roomClientService.getRoom(roomId);
      setRoomData(room);

      // Show success and redirect to room
      setTimeout(() => {
        navigate(`/room/${roomId}`);
      }, 2000);
    } catch (err) {
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        {loading && (
          <>
            <div className="inline-block animate-spin">
              <svg className="w-12 h-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Joining Room...</h2>
            <p className="text-gray-600 mt-2">{roomData?.name || 'Processing your QR code'}</p>
          </>
        )}

        {error && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Unable to Join</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Go Home
            </button>
          </>
        )}

        {!loading && !error && roomData && (
          <>
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Success!</h2>
            <p className="text-gray-600 mb-2">Redirecting to</p>
            <p className="text-xl font-bold text-gray-900">{roomData.name}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting in 2 seconds...</p>
          </>
        )}
      </div>
    </div>
  );
}
