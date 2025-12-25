import type { Block, Calendar } from '@/types';

const API_BASE = '/api';

/**
 * Format date for API requests
 * - All-day events: YYYY-MM-DD format
 * - Timed events: ISO timestamp
 */
function formatDateForAPI(date: Date, isAllDay: boolean): string {
  if (isAllDay) {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return date.toISOString();
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: () => {
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${API_BASE}/auth/login?redirect_url=${redirectUrl}`;
  },

  logout: async () => {
    await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' });
  },

  getStatus: async (): Promise<{ isAuthenticated: boolean }> => {
    return fetchJson(`${API_BASE}/auth/status`);
  },

  getMe: async (): Promise<{ email: string; name: string; picture: string }> => {
    return fetchJson(`${API_BASE}/auth/me`);
  },
};

// Calendar API
export interface CalendarListItem {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor: string;
  accessRole: string;
}

export const calendarApi = {
  listCalendars: async (): Promise<CalendarListItem[]> => {
    return fetchJson(`${API_BASE}/calendars`);
  },
};

// Config API
export const configApi = {
  getCalendars: async (): Promise<Calendar[]> => {
    const response = await fetchJson<{ calendars: Calendar[] }>(`${API_BASE}/config/calendars`);
    return response.calendars;
  },
};

// Events API
export const eventsApi = {
  getEvents: async (startDate: Date, endDate: Date, calendars: Calendar[]): Promise<Block[]> => {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendars: JSON.stringify(calendars),
    });

    const rawBlocks = await fetchJson<Block[]>(`${API_BASE}/events?${params}`);

    // Convert date strings to Date objects
    const blocks = rawBlocks.map((block) => ({
      ...block,
      startTime: new Date(block.startTime),
      endTime: new Date(block.endTime),
    }));

    return blocks;
  },

  createEvent: async (data: {
    calendarId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    recurrenceRule?: {
      frequency: string;
      interval?: number;
      count?: number;
      until?: Date;
      byDay?: string[];
    } | null;
  }): Promise<{ success: boolean; eventId: string }> => {
    const isAllDay = data.allDay ?? false;
    return fetchJson(`${API_BASE}/events`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        startTime: formatDateForAPI(data.startTime, isAllDay),
        endTime: formatDateForAPI(data.endTime, isAllDay),
        recurrenceRule: data.recurrenceRule
          ? {
              ...data.recurrenceRule,
              until: data.recurrenceRule.until?.toISOString(),
            }
          : undefined,
      }),
    });
  },

  updateEvent: async (
    calendarId: string,
    eventId: string,
    data: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      allDay?: boolean;
    }
  ): Promise<{ success: boolean }> => {
    const isAllDay = data.allDay ?? false;
    return fetchJson(`${API_BASE}/events/${calendarId}/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        startTime: data.startTime ? formatDateForAPI(data.startTime, isAllDay) : undefined,
        endTime: data.endTime ? formatDateForAPI(data.endTime, isAllDay) : undefined,
      }),
    });
  },

  moveEvent: async (
    calendarId: string,
    eventId: string,
    targetCalendarId: string
  ): Promise<{ success: boolean; newEventId: string }> => {
    return fetchJson(`${API_BASE}/events/${calendarId}/${eventId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetCalendarId }),
    });
  },

  deleteEvent: async (calendarId: string, eventId: string): Promise<{ success: boolean }> => {
    return fetchJson(`${API_BASE}/events/${calendarId}/${eventId}`, {
      method: 'DELETE',
    });
  },
};
