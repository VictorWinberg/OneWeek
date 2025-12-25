export interface CalendarSource {
  id: string;
  name: string;
  color?: string; // Optional color for frontend display
}

export interface BlockMetadata {
  category?: string;
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
