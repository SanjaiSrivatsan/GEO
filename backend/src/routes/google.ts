import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import GoogleService from '../services/GoogleService';

const router = Router();

// GET /api/google/auth/url - Get Google OAuth authorization URL
router.get('/auth/url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GoogleService.getAuthorizationUrl(req.userId!);
    res.status(200).json(result);
  } catch (error) {
    throw error;
  }
});

// GET /api/google/oauth/callback - Handle Google OAuth callback
router.get('/oauth/callback', async (req: any, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `http://localhost:5173?google_error=${encodeURIComponent(error as string)}`
      );
    }

    if (!code || !state) {
      return res.redirect('http://localhost:5173?google_error=missing_code_or_state');
    }

    // Exchange code for tokens (connection already stored in handleOAuthCallback)
    await GoogleService.handleOAuthCallback(code as string, state as string);

    // Redirect back to frontend with success
    res.redirect('http://localhost:5173?google_connected=true');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'OAuth callback failed';
    res.redirect(`http://localhost:5173?google_error=${encodeURIComponent(errorMsg)}`);
  }
});

// GET /api/google/connection/status - Check if Google is connected
router.get('/connection/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isConnected = await GoogleService.getConnectionStatus(req.userId!);
    res.status(200).json({ isConnected });
  } catch (error) {
    throw error;
  }
});

// POST /api/google/disconnect - Disconnect Google account
router.post('/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await GoogleService.disconnect(req.userId!);
    res.status(200).json({ success: true });
  } catch (error) {
    throw error;
  }
});

// GET /api/google/locations - Get user's Google Business Profile locations
router.get('/locations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const locations = await GoogleService.getLocations(req.userId!);
    res.status(200).json({ locations });
  } catch (error) {
    throw error;
  }
});

// POST /api/google/location/select - Select and link a Google location
router.post('/location/select', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId, businessProfileId } = req.body;

    if (!locationId || !businessProfileId) {
      return res.status(400).json({
        error: 'locationId and businessProfileId are required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const location = await GoogleService.selectLocation(req.userId!, locationId, businessProfileId);
    res.status(200).json(location);
  } catch (error) {
    throw error;
  }
});

// POST /api/google/reviews/sync - Sync Google reviews for a location
router.post('/reviews/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({
        error: 'locationId is required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const reviews = await GoogleService.syncReviews(locationId);
    res.status(200).json({ synced: reviews.length, reviews });
  } catch (error) {
    throw error;
  }
});

export default router;
