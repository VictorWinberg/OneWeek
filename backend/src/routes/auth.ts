import { Router } from 'express';
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  getUserInfo,
} from '../services/googleAuth.js';

const router = Router();

// GET /api/auth/login - Redirect to Google OAuth
router.get('/login', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const authUrl = getAuthUrl(oauth2Client);
  res.redirect(authUrl);
});

// GET /api/auth/callback - Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const oauth2Client = createOAuth2Client();
    const tokens = await getTokensFromCode(oauth2Client, code);

    // Store tokens in session
    req.session.tokens = {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    };

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
  const tokens = req.session.tokens;

  if (!tokens?.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, tokens);
    const userInfo = await getUserInfo(oauth2Client);
    res.json({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// POST /api/auth/logout - Clear session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/status - Check authentication status
router.get('/status', (req, res) => {
  const isAuthenticated = !!req.session.tokens?.access_token;
  res.json({ isAuthenticated });
});

export default router;

