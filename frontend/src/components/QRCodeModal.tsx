import { useState } from 'react';
import { qrcodeClientService } from '../services/qrcode';

interface QRCodeModalProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

export default function QRCodeModal({ roomId, roomName, onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    generateQRCode();
  }, [roomId]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const { qrCodeId, qrDataUrl } = await qrcodeClientService.generateQRCode(
        roomId,
        roomName
      );
      setQrCodeId(qrCodeId);
      setQrDataUrl(qrDataUrl);
      setError('');
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${roomName}-qrcode.png`;
    link.click();
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Join via QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {qrDataUrl && (
          <>
            <div className="flex justify-center mb-6">
              <img src={qrDataUrl} alt="Room QR Code" className="w-64 h-64 border-2 border-gray-200 rounded" />
            </div>

            <p className="text-center text-gray-600 text-sm mb-6">
              Scan this QR code to join <strong>{roomName}</strong>
            </p>

            <div className="space-y-3">
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                📥 Download QR Code
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                {copied ? '✓ Link Copied' : '🔗 Copy Join Link'}
              </button>

              <button
                onClick={generateQRCode}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                🔄 Generate New
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
