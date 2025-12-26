import { Router } from 'express';
import { getUserCalendars, getUserPermissionsForCalendar } from '../services/permissionService.js';
import { requireAuth, getUserEmail } from '../middleware/auth.js';
import { asyncHandler, AuthenticationError } from '../middleware/errorHandler.js';
import { mapCalendarWithPermissions } from '../utils/response.js';

const router = Router();

// GET /api/config/calendars - Get calendar configuration with user's permissions
router.get(
  '/calendars',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userEmail = getUserEmail(req);

    if (!userEmail) {
      throw new AuthenticationError('User email not found in session');
    }

    // Get calendars the user has access to
    const calendars = getUserCalendars(userEmail);

    // Add user's permissions to each calendar
    const calendarsWithPermissions = calendars.map((cal) =>
      mapCalendarWithPermissions(cal, getUserPermissionsForCalendar(userEmail, cal.id))
    );

    res.json({ calendars: calendarsWithPermissions });
  })
);

export default router;
