import { Router } from 'express';
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
import { requireAuth, getUserEmail } from '../middleware/auth.js';
import { asyncHandler, PermissionError, ValidationError } from '../middleware/errorHandler.js';
import { getUpdateMode } from '../utils/request.js';
import { buildEventDatetime } from '../utils/date.js';
import { recurrenceRuleToRRULE } from '../utils/recurrence.js';
import { validateListEventsQuery } from '../validators/query.js';
import { validateCreateEventBody, validateUpdateEventBody, validateMoveEventBody } from '../validators/events.js';

const router = Router();

// GET /api/events - Get events from multiple calendars
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userEmail = getUserEmail(req);
    const { startDate, endDate, calendars } = validateListEventsQuery(req.query as Record<string, unknown>);

    // Filter calendars to only those the user has read access to
    const allowedCalendars = calendars.filter((cal) => hasPermission(userEmail, cal.id, 'read'));

    // Fetch events from all calendars in parallel
    const eventPromises = allowedCalendars.map(async (cal) => {
      try {
        const events = await listEvents(cal.id, startDate, endDate);
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
  })
);

// GET /api/events/:calendarId/:eventId - Get a single event
router.get(
  '/:calendarId/:eventId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { calendarId, eventId } = req.params;
    const userEmail = getUserEmail(req);

    if (!hasPermission(userEmail, calendarId, 'read')) {
      throw new PermissionError('No permission to read this calendar');
    }

    // getEvent throws NotFoundError if event doesn't exist
    const event = await getEvent(calendarId, eventId);
    res.json(normalizeEventToBlock(event, calendarId));
  })
);

// POST /api/events - Create a new event
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userEmail = getUserEmail(req);
    const eventData = validateCreateEventBody(req.body);

    if (!hasPermission(userEmail, eventData.calendarId, 'create')) {
      throw new PermissionError('No permission to create events in this calendar');
    }

    // Convert recurrenceRule to RRULE string array if provided
    let recurrence: string[] | undefined;
    if (eventData.recurrenceRule) {
      try {
        const rruleString = recurrenceRuleToRRULE(eventData.recurrenceRule);
        recurrence = [rruleString];
      } catch (error) {
        throw new ValidationError('Invalid recurrence rule');
      }
    }

    const googleEvent = blockToGoogleEvent(
      eventData.title,
      eventData.description,
      eventData.startTime,
      eventData.endTime,
      eventData.allDay || false,
      eventData.metadata,
      recurrence
    );

    // createEvent throws AppError on failure
    const createdEvent = await createEvent(eventData.calendarId, googleEvent);
    res.json({ success: true, eventId: createdEvent.id });
  })
);

// PATCH /api/events/:calendarId/:eventId - Update an event
router.patch(
  '/:calendarId/:eventId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { calendarId, eventId } = req.params;
    const userEmail = getUserEmail(req);

    if (!hasPermission(userEmail, calendarId, 'update')) {
      throw new PermissionError('No permission to update events in this calendar');
    }

    const updateData = validateUpdateEventBody(req.body);
    const updates: Record<string, unknown> = {};

    if (updateData.title !== undefined) {
      updates.summary = updateData.title;
    }
    if (updateData.description !== undefined) {
      updates.description = updateData.description;
    }
    if (updateData.startTime !== undefined) {
      updates.start = buildEventDatetime(updateData.startTime, updateData.allDay || false);
    }
    if (updateData.endTime !== undefined) {
      updates.end = buildEventDatetime(updateData.endTime, updateData.allDay || false);
    }

    // Handle recurrence rule updates
    if (updateData.recurrenceRule !== undefined) {
      if (updateData.recurrenceRule === null) {
        updates.recurrence = null;
      } else {
        try {
          const rruleString = recurrenceRuleToRRULE(updateData.recurrenceRule);
          updates.recurrence = [rruleString];
        } catch (error) {
          throw new ValidationError('Invalid recurrence rule');
        }
      }
    }

    // updateEvent throws AppError on failure
    await updateEvent(calendarId, eventId, updates);
    res.json({ success: true });
  })
);

// POST /api/events/:calendarId/:eventId/move - Move event to another calendar
router.post(
  '/:calendarId/:eventId/move',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { calendarId, eventId } = req.params;
    const userEmail = getUserEmail(req);
    const { targetCalendarId } = validateMoveEventBody(req.body);

    if (!hasPermission(userEmail, calendarId, 'delete')) {
      throw new PermissionError('No permission to delete events from source calendar');
    }

    if (!hasPermission(userEmail, targetCalendarId, 'create')) {
      throw new PermissionError('No permission to create events in target calendar');
    }

    // moveEventBetweenCalendars throws AppError on failure
    const movedEvent = await moveEventBetweenCalendars(calendarId, targetCalendarId, eventId);
    res.json({ success: true, newEventId: movedEvent.id });
  })
);

// DELETE /api/events/:calendarId/:eventId - Delete an event
router.delete(
  '/:calendarId/:eventId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { calendarId, eventId } = req.params;
    const userEmail = getUserEmail(req);
    const updateMode = getUpdateMode(req);

    if (!hasPermission(userEmail, calendarId, 'delete')) {
      throw new PermissionError('No permission to delete events from this calendar');
    }

    // deleteEvent throws AppError on failure
    await deleteEvent(calendarId, eventId, updateMode);
    res.json({ success: true });
  })
);

export default router;
