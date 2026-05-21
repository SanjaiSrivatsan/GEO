import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/auth/url', authMiddleware, (req: any, res) => {
  res.status(200).json({ authorizationUrl: '', state: '' });
});

router.get('/oauth/callback', (req: any, res) => {
  res.redirect('http://localhost:5173?google_connected=true');
});

router.get('/connection/status', authMiddleware, (req: any, res) => {
  res.status(200).json({ isConnected: false });
});

router.post('/disconnect', authMiddleware, (req: any, res) => {
  res.status(200).json({ success: true });
});

router.get('/locations', authMiddleware, (req: any, res) => {
  res.status(200).json({ locations: [] });
});

router.post('/location/select', authMiddleware, (req: any, res) => {
  res.status(200).json({ success: true });
});

router.post('/reviews/sync', authMiddleware, (req: any, res) => {
  res.status(200).json({ synced: 0 });
});

export default router;
