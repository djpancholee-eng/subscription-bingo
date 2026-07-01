export interface QRCodeData {
  roomId: string;
  roomName: string;
  joinUrl: string;
  expiresAt: Date;
  maxScans?: number;
  scannedCount: number;
}

export interface QRCodeMetadata {
  id: string;
  roomId: string;
  generatedAt: Date;
  expiresAt: Date;
  maxScans: number;
  scannedCount: number;
  lastScannedAt?: Date;
  isActive: boolean;
}
