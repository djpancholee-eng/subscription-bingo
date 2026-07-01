import express, { Router, Request, Response } from 'express';
import { QRCodeManager } from '../engine/qrcode-manager';

const router: Router = express.Router();
const qrCodeManager = new QRCodeManager(process.env.BASE_URL || 'https://bingo.app');

// Generate QR code
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { roomId, roomName, maxScans = 1000 } = req.body;

    if (!roomId || !roomName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { qrCodeId, qrDataUrl, metadata } = await qrCodeManager.generateQRCode(
      roomId,
      roomName,
      maxScans
    );

    res.json({
      success: true,
      qrCodeId,
      qrDataUrl,
      metadata,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate QR code as PNG
router.get('/png/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { roomName = 'Bingo Room' } = req.query;

    const pngBuffer = await qrCodeManager.generateQRCodePNG(
      roomId,
      roomName as string
    );

    res.setHeader('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate QR code as SVG
router.get('/svg/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const svgString = await qrCodeManager.generateQRCodeSVG(roomId);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgString);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Validate QR code and record scan
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { qrCodeId } = req.body;
    const clientIp = req.ip || 'unknown';

    if (!qrCodeId) {
      return res.status(400).json({ error: 'Missing qrCodeId' });
    }

    const result = qrCodeManager.validateAndScanQRCode(qrCodeId, clientIp);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate QR code' });
  }
});

// Get QR code metadata
router.get('/metadata/:qrCodeId', (req: Request, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const metadata = qrCodeManager.getQRCodeMetadata(qrCodeId);

    if (!metadata) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR code metadata' });
  }
});

// Get QR codes for room
router.get('/room/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const qrCodes = qrCodeManager.getQRCodesForRoom(roomId);

    res.json({
      success: true,
      count: qrCodes.length,
      qrCodes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

// Get QR code stats
router.get('/stats/:qrCodeId', (req: Request, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const stats = qrCodeManager.getQRCodeStats(qrCodeId);

    if (!stats) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR code stats' });
  }
});

// Deactivate QR code
router.post('/deactivate/:qrCodeId', (req: Request, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const success = qrCodeManager.deactivateQRCode(qrCodeId);

    if (!success) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json({ success: true, message: 'QR code deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate QR code' });
  }
});

export { router as qrcodeRouter, qrCodeManager };
