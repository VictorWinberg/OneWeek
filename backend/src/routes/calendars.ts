import { Router } from 'express';
import { listCalendars } from '../services/calendarService.js';
import { requireAuth } from './auth.js';

const router = Router();

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
