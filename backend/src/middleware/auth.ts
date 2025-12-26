import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated (has valid access token and user email)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.tokens?.access_token || !req.session?.userEmail) {
    return res.status(401).json({ error: 'Not authenticated' });
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
export const getTokens = (req: Request) => {
  return req.session?.tokens;
};
