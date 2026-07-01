import QRCode from 'qrcode';
import { QRCodeData, QRCodeMetadata } from '../types/qrcode';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'redis';

const QR_EXPIRATION = 3600000; // 1 hour
const QR_MAX_SCANS = 1000; // Max scans per QR code
const CLEANUP_INTERVAL = 600000; // 10 minutes

export class QRCodeManager {
  private qrCodes = new Map<string, QRCodeMetadata>();
  private redis: Redis.RedisClient | null = null;
  private baseUrl: string;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private rateLimitMap = new Map<string, number[]>(); // IP -> timestamps

  constructor(baseUrl: string = 'https://bingo.app', redisClient?: Redis.RedisClient) {
    this.baseUrl = baseUrl;
    this.redis = redisClient || null;
    this.startCleanup();
  }

  // Generate QR code for room
  async generateQRCode(
    roomId: string,
    roomName: string,
    maxScans: number = QR_MAX_SCANS
  ): Promise<{ qrCodeId: string; qrDataUrl: string; metadata: QRCodeMetadata }> {
    const qrCodeId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_EXPIRATION);

    const joinUrl = `${this.baseUrl}/join/${roomId}?qr=${qrCodeId}`;

    const metadata: QRCodeMetadata = {
      id: qrCodeId,
      roomId,
      generatedAt: now,
      expiresAt,
      maxScans,
      scannedCount: 0,
      isActive: true,
    };

    this.qrCodes.set(qrCodeId, metadata);

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    // Cache in Redis
    if (this.redis) {
      this.redis.setex(
        `qr:${qrCodeId}`,
        Math.ceil(QR_EXPIRATION / 1000),
        JSON.stringify(metadata)
      );
    }

    return { qrCodeId, qrDataUrl, metadata };
  }

  // Generate QR code as PNG buffer
  async generateQRCodePNG(
    roomId: string,
    roomName: string
  ): Promise<Buffer> {
    const joinUrl = `${this.baseUrl}/join/${roomId}`;

    return QRCode.toBuffer(joinUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
  }

  // Generate QR code as SVG
  async generateQRCodeSVG(roomId: string): Promise<string> {
    const joinUrl = `${this.baseUrl}/join/${roomId}`;

    return QRCode.toString(joinUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/svg+xml',
      margin: 1,
      width: 300,
    });
  }

  // Validate QR code and record scan
  async validateAndScanQRCode(
    qrCodeId: string,
    clientIp: string
  ): Promise<{ valid: boolean; roomId?: string; message: string }> {
    const metadata = this.qrCodes.get(qrCodeId);

    if (!metadata) {
      return { valid: false, message: 'QR code not found' };
    }

    if (!metadata.isActive) {
      return { valid: false, message: 'QR code is inactive' };
    }

    if (new Date() > metadata.expiresAt) {
      metadata.isActive = false;
      return { valid: false, message: 'QR code expired' };
    }

    if (metadata.scannedCount >= metadata.maxScans) {
      return { valid: false, message: 'QR code scan limit reached' };
    }

    // Check rate limiting
    if (!this.checkRateLimit(clientIp)) {
      return { valid: false, message: 'Too many scans. Please try again later.' };
    }

    // Record scan
    metadata.scannedCount++;
    metadata.lastScannedAt = new Date();

    if (this.redis) {
      this.redis.incr(`qr:${qrCodeId}:scans`);
      this.redis.setex(`qr:${qrCodeId}:scans`, 3600, metadata.scannedCount.toString());
    }

    return {
      valid: true,
      roomId: metadata.roomId,
      message: 'QR code valid',
    };
  }

  // Get QR code metadata
  getQRCodeMetadata(qrCodeId: string): QRCodeMetadata | null {
    return this.qrCodes.get(qrCodeId) || null;
  }

  // Get QR codes for room
  getQRCodesForRoom(roomId: string): QRCodeMetadata[] {
    return Array.from(this.qrCodes.values()).filter(qr => qr.roomId === roomId && qr.isActive);
  }

  // Deactivate QR code
  deactivateQRCode(qrCodeId: string): boolean {
    const metadata = this.qrCodes.get(qrCodeId);
    if (!metadata) return false;

    metadata.isActive = false;

    if (this.redis) {
      this.redis.del(`qr:${qrCodeId}`);
    }

    return true;
  }

  // Get QR code stats
  getQRCodeStats(qrCodeId: string) {
    const metadata = this.qrCodes.get(qrCodeId);
    if (!metadata) return null;

    return {
      qrCodeId,
      roomId: metadata.roomId,
      generatedAt: metadata.generatedAt,
      expiresAt: metadata.expiresAt,
      scannedCount: metadata.scannedCount,
      maxScans: metadata.maxScans,
      scanRate: metadata.maxScans > 0 ? (metadata.scannedCount / metadata.maxScans) * 100 : 0,
      isActive: metadata.isActive,
      timeRemainingMs: Math.max(0, metadata.expiresAt.getTime() - Date.now()),
    };
  }

  // Private methods
  private checkRateLimit(clientIp: string, maxScansPerMinute: number = 10): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    let timestamps = this.rateLimitMap.get(clientIp) || [];
    timestamps = timestamps.filter(t => t > oneMinuteAgo);

    if (timestamps.length >= maxScansPerMinute) {
      return false;
    }

    timestamps.push(now);
    this.rateLimitMap.set(clientIp, timestamps);

    return true;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const toDelete: string[] = [];

      for (const [qrCodeId, metadata] of this.qrCodes.entries()) {
        if (now > metadata.expiresAt || !metadata.isActive) {
          toDelete.push(qrCodeId);
        }
      }

      toDelete.forEach(qrCodeId => {
        this.qrCodes.delete(qrCodeId);
        if (this.redis) {
          this.redis.del(`qr:${qrCodeId}`);
        }
      });

      if (toDelete.length > 0) {
        console.log(`Cleaned up ${toDelete.length} expired QR codes`);
      }

      // Cleanup rate limit map
      const oneHourAgo = Date.now() - 3600000;
      for (const [ip, timestamps] of this.rateLimitMap.entries()) {
        const validTimestamps = timestamps.filter(t => t > oneHourAgo);
        if (validTimestamps.length === 0) {
          this.rateLimitMap.delete(ip);
        } else {
          this.rateLimitMap.set(ip, validTimestamps);
        }
      }
    }, CLEANUP_INTERVAL);
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.qrCodes.clear();
    this.rateLimitMap.clear();
  }
}
