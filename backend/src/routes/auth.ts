import { Router, type Request } from 'express';
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  getUserInfo,
} from '../services/googleAuth.js';
import { getEnv } from '../utils/env.js';
import { allowedEmails } from './config.js';

const router = Router();

function getRedirectUri(req: Request): string {
  const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
  const host = req.get('X-Forwarded-Host') || req.get('host');

  return `${protocol}://${host}/api/auth/callback`;
}

// GET /api/auth/login - Redirect to Google OAuth
router.get('/login', (req, res) => {
  try {
    const redirectUri = getRedirectUri(req);
    const oauth2Client = createOAuth2Client(redirectUri);
    const authUrl = getAuthUrl(oauth2Client, redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate login';
    res.status(500).json({ error: errorMessage });
  }
});

// GET /api/auth/callback - Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const redirectUri = getRedirectUri(req);
    const oauth2Client = createOAuth2Client(redirectUri);
    const tokens = await getTokensFromCode(oauth2Client, code);

    // Validate user email before storing tokens
    setCredentials(oauth2Client, tokens);
    const userInfo = await getUserInfo(oauth2Client);

    if (!userInfo.email || !allowedEmails.includes(userInfo.email)) {
      console.warn(`Unauthorized login attempt from: ${userInfo.email}`);
      const frontendUrl = getEnv('FRONTEND_URL', 'http://localhost:5173');
      return res.redirect(`${frontendUrl}?error=unauthorized`);
    }

    // Store tokens in session
    req.session.tokens = {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    };

    // Redirect to frontend
    const frontendUrl = getEnv('FRONTEND_URL', 'http://localhost:5173');
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
