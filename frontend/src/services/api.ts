import type { Block, CalendarSource } from '../types';

const API_BASE = '/api';

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
    window.location.href = `${API_BASE}/auth/login`;
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
  getCalendars: async (): Promise<CalendarSource[]> => {
    const response = await fetchJson<{ calendars: CalendarSource[] }>(`${API_BASE}/config/calendars`);
    return response.calendars;
  },
};

// Events API
export const eventsApi = {
  getEvents: async (startDate: Date, endDate: Date, calendars: CalendarSource[]): Promise<Block[]> => {
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
  }): Promise<{ success: boolean; eventId: string }> => {
    return fetchJson(`${API_BASE}/events`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
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
    }
  ): Promise<{ success: boolean }> => {
    return fetchJson(`${API_BASE}/events/${calendarId}/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        startTime: data.startTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
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
