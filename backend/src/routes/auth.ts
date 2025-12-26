import { Router } from 'express';
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  getUserInfo,
} from '../services/googleAuth.js';
import { isEmailAllowed } from '../services/permissionService.js';
import { getRedirectUri, appendErrorToUrl } from '../utils/url.js';
import { mapUserInfoToResponse } from '../utils/response.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { requireAuth, getTokens } from '../middleware/auth.js';
import { validateRedirectUrl, validateAuthCode } from '../validators/query.js';

const router = Router();

// GET /api/auth/login - Redirect to Google OAuth
router.get('/login', (req, res) => {
  const redirectUrl = validateRedirectUrl(req.query as Record<string, unknown>);

  if (!req.session) {
    console.error('Session is not available');
    throw new ValidationError('Session configuration error');
  }
  req.session.redirectUrl = redirectUrl;

  const redirectUri = getRedirectUri(req);
  const oauth2Client = createOAuth2Client(redirectUri);
  const authUrl = getAuthUrl(oauth2Client, redirectUri);
  res.redirect(authUrl);
});

// GET /api/auth/callback - Handle OAuth callback
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const code = validateAuthCode(req.query as Record<string, unknown>);

    const redirectUri = getRedirectUri(req);
    const oauth2Client = createOAuth2Client(redirectUri);
    const tokens = await getTokensFromCode(oauth2Client, code);

    setCredentials(oauth2Client, tokens);
    const userInfo = await getUserInfo(oauth2Client);

    if (!userInfo.email || !isEmailAllowed(userInfo.email)) {
      console.warn(`Unauthorized login attempt from: ${userInfo.email}`);
      const redirectUrl = req.session?.redirectUrl || '/';
      if (req.session) {
        delete req.session.redirectUrl;
      }
      return res.redirect(appendErrorToUrl(redirectUrl, 'unauthorized'));
    }

    if (!req.session) {
      console.error('Session is not available during callback');
      throw new ValidationError('Session configuration error');
    }

    req.session.tokens = {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    };
    req.session.userEmail = userInfo.email;

    const redirectUrl = req.session.redirectUrl || '/';
    delete req.session.redirectUrl;

    res.redirect(redirectUrl);
  })
);

// GET /api/auth/me - Get current user info
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tokens = getTokens(req);

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, tokens!);
    const userInfo = await getUserInfo(oauth2Client);

    res.json(mapUserInfoToResponse(userInfo));
  })
);

// POST /api/auth/logout - Clear session
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// GET /api/auth/status - Check authentication status
router.get('/status', (req, res) => {
  const isAuthenticated = !!req.session?.tokens?.access_token;
  res.json({ isAuthenticated });
});

export default router;
