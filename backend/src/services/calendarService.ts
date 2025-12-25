import { google, calendar_v3 } from 'googleapis';
import type { Block, BlockMetadata, GoogleCalendarEvent } from '../types/index.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccountClient: calendar_v3.Calendar | null = null;

/**
 * Initialize and return the service account calendar client.
 */
function getServiceAccountClient(): calendar_v3.Calendar {
  if (!serviceAccountClient) {
    const credentialsPath = path.resolve(__dirname, '../../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    });
    serviceAccountClient = google.calendar({ version: 'v3', auth });
  }
  return serviceAccountClient;
}

/** List all calendars accessible by the service account */
export async function listCalendars() {
  const calendar = getServiceAccountClient();
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

/** List events in a specific calendar between two times */
export async function listEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getServiceAccountClient();
  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });
  return response.data.items || [];
}

/** Get a single event by ID */
export async function getEvent(calendarId: string, eventId: string): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getServiceAccountClient();
  try {
    const response = await calendar.events.get({ calendarId, eventId });
    return response.data;
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}

/** Create a new event */
export async function createEvent(
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getServiceAccountClient();
  try {
    const response = await calendar.events.insert({ calendarId, requestBody: event });
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

/** Update an existing event */
export async function updateEvent(
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getServiceAccountClient();
  try {
    const response = await calendar.events.patch({ calendarId, eventId, requestBody: event });
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    return null;
  }
}

/** Delete an event */
export async function deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
  const calendar = getServiceAccountClient();
  try {
    await calendar.events.delete({ calendarId, eventId });
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

/** Move an event from one calendar to another */
export async function moveEventBetweenCalendars(
  sourceCalendarId: string,
  targetCalendarId: string,
  eventId: string,
  originalCalendarId?: string
): Promise<calendar_v3.Schema$Event | null> {
  const originalEvent = await getEvent(sourceCalendarId, eventId);
  if (!originalEvent) return null;

  const existingPrivate = originalEvent.extendedProperties?.private || {};

  // Ensure all values are strings to avoid toString errors
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(existingPrivate)) {
    if (value != null) {
      metadata[key] = typeof value === 'string' ? value : String(value);
    }
  }

  metadata.originalCalendarId = originalCalendarId || metadata.originalCalendarId || sourceCalendarId;

  const newEvent: GoogleCalendarEvent = {
    summary: originalEvent.summary ?? undefined,
    description: originalEvent.description ?? undefined,
    start: originalEvent.start
      ? {
          dateTime: originalEvent.start.dateTime ?? undefined,
          date: originalEvent.start.date ?? undefined,
          timeZone: originalEvent.start.timeZone ?? undefined,
        }
      : undefined,
    end: originalEvent.end
      ? {
          dateTime: originalEvent.end.dateTime ?? undefined,
          date: originalEvent.end.date ?? undefined,
          timeZone: originalEvent.end.timeZone ?? undefined,
        }
      : undefined,
    extendedProperties: { private: metadata },
  };

  const createdEvent = await createEvent(targetCalendarId, newEvent);
  if (!createdEvent) return null;

  await deleteEvent(sourceCalendarId, eventId);
  return createdEvent;
}

/** Convert a Google Calendar event to internal Block format */
export function normalizeEventToBlock(event: calendar_v3.Schema$Event, calendarId: string): Block {
  const isAllDay = !event.start?.dateTime;
  const startTime = event.start?.dateTime || event.start?.date || '';
  const endTime = event.end?.dateTime || event.end?.date || '';
  const privateProps = event.extendedProperties?.private || {};

  const metadata: BlockMetadata = {
    category: privateProps.category,
    originalCalendarId: privateProps.originalCalendarId,
  };

  return {
    id: event.id || '',
    calendarId,
    title: event.summary || 'Untitled',
    description: event.description || undefined,
    startTime,
    endTime,
    allDay: isAllDay,
    metadata,
    recurrence: event.recurrence || undefined,
    recurringEventId: event.recurringEventId || undefined,
  };
}

/** Convert internal Block data to Google Calendar event */
export function blockToGoogleEvent(
  title: string,
  description: string | undefined,
  startTime: string,
  endTime: string,
  allDay: boolean,
  metadata?: BlockMetadata,
  recurrence?: string[]
): GoogleCalendarEvent {
  const event: GoogleCalendarEvent = { summary: title, description: description || undefined };

  if (allDay) {
    event.start = { date: startTime.split('T')[0] };
    event.end = { date: endTime.split('T')[0] };
  } else {
    event.start = { dateTime: startTime };
    event.end = { dateTime: endTime };
  }

  if (metadata) {
    event.extendedProperties = {
      private: {
        ...(metadata.category && { category: metadata.category }),
        ...(metadata.originalCalendarId && { originalCalendarId: metadata.originalCalendarId }),
      },
    };
  }

  if (recurrence && recurrence.length > 0) {
    event.recurrence = recurrence;
  }

  return event;
}
