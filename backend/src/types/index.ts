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
  recurrence?: string[]; // RRULE strings from Google Calendar
  recurringEventId?: string; // ID of the recurring event series
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
  recurrence?: string[];
}

export interface TaskMetadata {
  assignedUser?: string; // User ID from config (e.g., "victor", "annie")
  assignedUserEmail?: string; // User email for reference
  category?: string;
  originalTaskListId?: string;
  [key: string]: string | undefined; // Allow additional custom fields
}

export interface Task {
  id: string;
  taskListId: string;
  title: string;
  notes?: string;
  due?: string; // ISO 8601 date
  status: 'needsAction' | 'completed';
  completed?: string; // ISO 8601 datetime when completed
  parent?: string; // Parent task ID for subtasks
  metadata: TaskMetadata;
}
