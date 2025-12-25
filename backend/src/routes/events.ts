import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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
import { hasPermission } from '../services/permissionService.js';
import type { CalendarSource } from '../types/index.js';
import { recurrenceRuleToRRULE, type RecurrenceRule } from '../utils/recurrence.js';

const router = Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.tokens?.access_token || !req.session?.userEmail) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// GET /api/events - Get events from multiple calendars
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, calendars: calendarsJson } = req.query;
    const userEmail = req.session?.userEmail!;

    if (!startDate || !endDate || !calendarsJson) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, calendars',
      });
    }

    const calendars: CalendarSource[] = JSON.parse(calendarsJson as string);

    // Filter calendars to only those the user has read access to
    const allowedCalendars = calendars.filter((cal) => hasPermission(userEmail, cal.id, 'read'));

    const timeMin = new Date(startDate as string).toISOString();
    const timeMax = new Date(endDate as string).toISOString();

    // Fetch events from all calendars in parallel using service account
    const eventPromises = allowedCalendars.map(async (cal) => {
      try {
        const events = await listEvents(cal.id, timeMin, timeMax);
        return events.map((event) => normalizeEventToBlock(event, cal.id));
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
    const userEmail = req.session?.userEmail!;

    // Check read permission
    if (!hasPermission(userEmail, calendarId, 'read')) {
      return res.status(403).json({ error: 'No permission to read this calendar' });
    }

    const event = await getEvent(calendarId, eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const block = normalizeEventToBlock(event, calendarId);
    res.json(block);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events - Create a new event
router.post('/', requireAuth, async (req, res) => {
  try {
<<<<<<< HEAD
    const { calendarId, title, description, startTime, endTime, allDay, metadata } = req.body;
    const userEmail = req.session?.userEmail!;
=======
    const { calendarId, title, description, startTime, endTime, allDay, metadata, recurrenceRule } = req.body;
    const userEmail = req.session.userEmail!;
>>>>>>> 3bb56fe (feat: add recurring events support to create and edit panels)

    if (!calendarId || !title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: calendarId, title, startTime, endTime',
      });
    }

    // Check create permission
    if (!hasPermission(userEmail, calendarId, 'create')) {
      return res.status(403).json({ error: 'No permission to create events in this calendar' });
    }

    // Convert recurrenceRule to RRULE string array if provided
    let recurrence: string[] | undefined;
    if (recurrenceRule) {
      try {
        const rruleString = recurrenceRuleToRRULE(recurrenceRule as RecurrenceRule);
        recurrence = [rruleString];
      } catch (error) {
        console.error('Error converting recurrence rule:', error);
        return res.status(400).json({ error: 'Invalid recurrence rule' });
      }
    }

    const googleEvent = blockToGoogleEvent(
      title,
      description,
      startTime,
      endTime,
      allDay || false,
      metadata,
      recurrence
    );
    const createdEvent = await createEvent(calendarId, googleEvent);

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
    const { title, description, startTime, endTime, allDay } = req.body;
    const userEmail = req.session?.userEmail!;

    // Check update permission
    if (!hasPermission(userEmail, calendarId, 'update')) {
      return res.status(403).json({ error: 'No permission to update events in this calendar' });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.summary = title;
    if (description !== undefined) updates.description = description;

    // For all-day events, use 'date' field; for timed events, use 'dateTime'
    if (startTime !== undefined) {
      updates.start = allDay ? { date: startTime } : { dateTime: startTime };
    }
    if (endTime !== undefined) {
      updates.end = allDay ? { date: endTime } : { dateTime: endTime };
    }

    const updatedEvent = await updateEvent(calendarId, eventId, updates);

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
    const userEmail = req.session?.userEmail!;

    if (!targetCalendarId) {
      return res.status(400).json({ error: 'Missing targetCalendarId' });
    }

    // Check delete permission on source calendar and create permission on target calendar
    if (!hasPermission(userEmail, calendarId, 'delete')) {
      return res.status(403).json({ error: 'No permission to delete events from source calendar' });
    }

    if (!hasPermission(userEmail, targetCalendarId, 'create')) {
      return res.status(403).json({ error: 'No permission to create events in target calendar' });
    }

    const movedEvent = await moveEventBetweenCalendars(calendarId, targetCalendarId, eventId);

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
    const userEmail = req.session?.userEmail!;

    // Check delete permission
    if (!hasPermission(userEmail, calendarId, 'delete')) {
      return res.status(403).json({ error: 'No permission to delete events from this calendar' });
    }

    const success = await deleteEvent(calendarId, eventId);

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
