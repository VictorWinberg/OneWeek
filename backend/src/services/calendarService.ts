import { google, calendar_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { Block, BlockMetadata, GoogleCalendarEvent, PersonId } from '../types/index.js';

export function getCalendarClient(oauth2Client: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function listCalendars(oauth2Client: OAuth2Client) {
  const calendar = getCalendarClient(oauth2Client);
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

export async function listEvents(
  oauth2Client: OAuth2Client,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(oauth2Client);
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

export async function getEvent(
  oauth2Client: OAuth2Client,
  calendarId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getCalendarClient(oauth2Client);
  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });
    return response.data;
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}

export async function createEvent(
  oauth2Client: OAuth2Client,
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getCalendarClient(oauth2Client);
  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

export async function updateEvent(
  oauth2Client: OAuth2Client,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getCalendarClient(oauth2Client);
  try {
    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: event,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    return null;
  }
}

export async function deleteEvent(
  oauth2Client: OAuth2Client,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const calendar = getCalendarClient(oauth2Client);
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

export async function moveEventBetweenCalendars(
  oauth2Client: OAuth2Client,
  sourceCalendarId: string,
  targetCalendarId: string,
  eventId: string,
  originalCalendarId?: string
): Promise<calendar_v3.Schema$Event | null> {
  // Get the original event
  const originalEvent = await getEvent(oauth2Client, sourceCalendarId, eventId);
  if (!originalEvent) {
    return null;
  }

  // Prepare metadata with original calendar info
  const existingPrivate = originalEvent.extendedProperties?.private || {};
  const metadata: Record<string, string> = {
    ...existingPrivate,
    originalCalendarId: originalCalendarId || existingPrivate.originalCalendarId || sourceCalendarId,
  };

  // Create new event in target calendar
  const newEvent: GoogleCalendarEvent = {
    summary: originalEvent.summary ?? undefined,
    description: originalEvent.description ?? undefined,
    start: originalEvent.start ? {
      dateTime: originalEvent.start.dateTime ?? undefined,
      date: originalEvent.start.date ?? undefined,
      timeZone: originalEvent.start.timeZone ?? undefined,
    } : undefined,
    end: originalEvent.end ? {
      dateTime: originalEvent.end.dateTime ?? undefined,
      date: originalEvent.end.date ?? undefined,
      timeZone: originalEvent.end.timeZone ?? undefined,
    } : undefined,
    extendedProperties: {
      private: metadata,
    },
  };

  const createdEvent = await createEvent(oauth2Client, targetCalendarId, newEvent);
  if (!createdEvent) {
    return null;
  }

  // Delete original event
  await deleteEvent(oauth2Client, sourceCalendarId, eventId);

  return createdEvent;
}

export function normalizeEventToBlock(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  personId: PersonId
): Block {
  const isAllDay = !event.start?.dateTime;
  const startTime = event.start?.dateTime || event.start?.date || '';
  const endTime = event.end?.dateTime || event.end?.date || '';

  const privateProps = event.extendedProperties?.private || {};
  const metadata: BlockMetadata = {
    category: privateProps.category,
    energy: privateProps.energy ? parseInt(privateProps.energy, 10) : undefined,
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
    responsiblePersonId: personId,
    metadata,
  };
}

export function blockToGoogleEvent(
  title: string,
  description: string | undefined,
  startTime: string,
  endTime: string,
  allDay: boolean,
  metadata?: BlockMetadata
): GoogleCalendarEvent {
  const event: GoogleCalendarEvent = {
    summary: title,
    description: description || undefined,
  };

  if (allDay) {
    // For all-day events, use date format (YYYY-MM-DD)
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
        ...(metadata.energy !== undefined && { energy: String(metadata.energy) }),
        ...(metadata.originalCalendarId && { originalCalendarId: metadata.originalCalendarId }),
      },
    };
  }

  return event;
}

