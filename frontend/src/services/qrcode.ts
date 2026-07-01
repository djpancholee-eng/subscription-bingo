const API_BASE = '/api/qrcode';

export class QRCodeClientService {
  // Generate QR code
  async generateQRCode(
    roomId: string,
    roomName: string,
    maxScans: number = 1000
  ): Promise<{ qrCodeId: string; qrDataUrl: string }> {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, roomName, maxScans }),
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to generate QR code');
    return { qrCodeId: data.qrCodeId, qrDataUrl: data.qrDataUrl };
  }

  // Get QR code as PNG URL
  getQRCodePngUrl(roomId: string, roomName: string = 'Bingo Room'): string {
    return `${API_BASE}/png/${roomId}?roomName=${encodeURIComponent(roomName)}`;
  }

  // Get QR code as SVG URL
  getQRCodeSvgUrl(roomId: string): string {
    return `${API_BASE}/svg/${roomId}`;
  }

  // Validate QR code
  async validateQRCode(qrCodeId: string): Promise<{ valid: boolean; roomId?: string; message: string }> {
    const response = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeId }),
    });

    return response.json();
  }

  // Get QR code metadata
  async getQRCodeMetadata(qrCodeId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/metadata/${qrCodeId}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch metadata');
    return data.metadata;
  }

  // Get QR codes for room
  async getQRCodesForRoom(roomId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/room/${roomId}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch QR codes');
    return data.qrCodes;
  }

  // Get QR code stats
  async getQRCodeStats(qrCodeId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/stats/${qrCodeId}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch stats');
    return data.stats;
  }

  // Deactivate QR code
  async deactivateQRCode(qrCodeId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/deactivate/${qrCodeId}`, {
      method: 'POST',
    });

    const data = await response.json();
    if (!data.success) throw new Error('Failed to deactivate QR code');
  }
}

export const qrcodeClientService = new QRCodeClientService();
