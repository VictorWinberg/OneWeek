import { Router } from 'express';
import { createOAuth2Client, setCredentials } from '../services/googleAuth.js';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  moveEventBetweenCalendars,
  normalizeEventToBlock,
  blockToGoogleEvent,
} from '../services/calendarService.js';
import type { PersonId, CalendarSource } from '../types/index.js';

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

// GET /api/events - Get events from multiple calendars
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, calendars: calendarsJson } = req.query;

    if (!startDate || !endDate || !calendarsJson) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, calendars',
      });
    }

    const calendars: CalendarSource[] = JSON.parse(calendarsJson as string);

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const timeMin = new Date(startDate as string).toISOString();
    const timeMax = new Date(endDate as string).toISOString();

    // Fetch events from all calendars in parallel
    const eventPromises = calendars.map(async (cal) => {
      try {
        const events = await listEvents(oauth2Client, cal.id, timeMin, timeMax);
        return events.map((event) => normalizeEventToBlock(event, cal.id, cal.personId));
      } catch (error) {
        console.error(`Error fetching events from calendar ${cal.id}:`, error);
        return [];
      }
    });

    const allEventsArrays = await Promise.all(eventPromises);
    const allEvents = allEventsArrays.flat();

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    res.json(allEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:calendarId/:eventId - Get a single event
router.get('/:calendarId/:eventId', requireAuth, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;
    const { personId } = req.query;

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const event = await getEvent(oauth2Client, calendarId, eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const block = normalizeEventToBlock(event, calendarId, (personId as PersonId) || 'familjen');
    res.json(block);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events - Create a new event
router.post('/', requireAuth, async (req, res) => {
  try {
    const { calendarId, title, description, startTime, endTime, allDay, metadata } = req.body;

    if (!calendarId || !title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: calendarId, title, startTime, endTime',
      });
    }

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const googleEvent = blockToGoogleEvent(title, description, startTime, endTime, allDay || false, metadata);
    const createdEvent = await createEvent(oauth2Client, calendarId, googleEvent);

    if (!createdEvent) {
      return res.status(500).json({ error: 'Failed to create event' });
    }

    res.json({ success: true, eventId: createdEvent.id });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/events/:calendarId/:eventId - Update an event
router.patch('/:calendarId/:eventId', requireAuth, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;
    const { title, description, startTime, endTime } = req.body;

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.summary = title;
    if (description !== undefined) updates.description = description;
    if (startTime !== undefined) updates.start = { dateTime: startTime };
    if (endTime !== undefined) updates.end = { dateTime: endTime };

    const updatedEvent = await updateEvent(oauth2Client, calendarId, eventId, updates);

    if (!updatedEvent) {
      return res.status(500).json({ error: 'Failed to update event' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// POST /api/events/:calendarId/:eventId/move - Move event to another calendar
router.post('/:calendarId/:eventId/move', requireAuth, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;
    const { targetCalendarId } = req.body;

    if (!targetCalendarId) {
      return res.status(400).json({ error: 'Missing targetCalendarId' });
    }

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const movedEvent = await moveEventBetweenCalendars(
      oauth2Client,
      calendarId,
      targetCalendarId,
      eventId
    );

    if (!movedEvent) {
      return res.status(500).json({ error: 'Failed to move event' });
    }

    res.json({ success: true, newEventId: movedEvent.id });
  } catch (error) {
    console.error('Error moving event:', error);
    res.status(500).json({ error: 'Failed to move event' });
  }
});

// DELETE /api/events/:calendarId/:eventId - Delete an event
router.delete('/:calendarId/:eventId', requireAuth, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;

    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, req.session.tokens!);

    const success = await deleteEvent(oauth2Client, calendarId, eventId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to delete event' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;

