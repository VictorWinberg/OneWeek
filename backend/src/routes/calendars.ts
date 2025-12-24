import { Router } from 'express';
import { createOAuth2Client, setCredentials } from '../services/googleAuth.js';
import { listCalendars } from '../services/calendarService.js';

const router = Router();

// Middleware to check authentication
const requireAuth = (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) => {
  if (!req.session.tokens?.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// GET /api/calendars - List all calendars
router.get('/', requireAuth, async (req, res) => {
  try {
    const calendars = await listCalendars();

    const result = calendars.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing calendars:', error);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

export default router;
