import { Router } from 'express';
import { getUserCalendars, getUserPermissionsForCalendar } from '../services/permissionService.js';

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

// GET /api/config/calendars - Get calendar configuration with user's permissions
router.get('/calendars', requireAuth, async (req, res) => {
  try {
    // Get user email from session (should be set during auth)
    const userEmail = req.session.userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in session' });
    }

    // Get calendars the user has access to
    const calendars = getUserCalendars(userEmail);

    // Add user's permissions to each calendar
    const calendarsWithPermissions = calendars.map((cal) => ({
      id: cal.id,
      name: cal.name,
      color: cal.color,
      permissions: getUserPermissionsForCalendar(userEmail, cal.id),
    }));

    res.json({ calendars: calendarsWithPermissions });
  } catch (error) {
    console.error('Error getting calendar config:', error);
    res.status(500).json({ error: 'Failed to load calendar configuration' });
  }
});

export default router;
