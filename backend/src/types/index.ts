export type PersonId = 'annie' | 'victor' | 'annie-victor' | 'lillen' | 'familjen';

export interface CalendarSource {
  id: string;
  name: string;
  color?: string; // Optional color for frontend display
}

export interface BlockMetadata {
  category?: string;
  energy?: number;
  originalCalendarId?: string;
}

export interface Block {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  allDay: boolean;
  responsiblePersonId: string; // Calendar ID of responsible person
  metadata: BlockMetadata;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface MoveEventRequest {
  sourceCalendarId: string;
  targetCalendarId: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

declare module 'express-session' {
  interface SessionData {
    tokens?: {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
    };
  }
}

