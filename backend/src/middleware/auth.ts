import type { Request, Response, NextFunction } from 'express';
import { isTokenExpired, refreshAccessToken, type SessionTokens } from '../services/googleAuth.js';

/**
 * Middleware to check if user is authenticated (has valid access token and user email)
 * Also handles automatic token refresh when tokens are expired
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.tokens?.access_token || !req.session?.userEmail) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if token is expired and try to refresh
  if (isTokenExpired(req.session.tokens)) {
    const newTokens = await refreshAccessToken(req.session.tokens);

    if (!newTokens) {
      // Refresh failed, clear session and require re-authentication
      req.session = null;
      return res.status(401).json({ error: 'Session expired, please login again' });
    }

    // Update session with new tokens
    req.session.tokens = newTokens;
  }

  next();
};

/**
 * Get user email from session (assumes requireAuth middleware has run)
 */
export const getUserEmail = (req: Request): string => {
  return req.session?.userEmail || '';
};

/**
 * Get tokens from session (assumes requireAuth middleware has run)
 */
export const getTokens = (req: Request): SessionTokens | undefined => {
  return req.session?.tokens;
};
