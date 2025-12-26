import { Router } from 'express';
import { listCalendars } from '../services/calendarService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { mapCalendarsToResponse } from '../utils/response.js';

const router = Router();

// GET /api/calendars - List all calendars
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const calendars = await listCalendars();
    res.json(mapCalendarsToResponse(calendars));
  })
);

export default router;
