export interface Calendar {
  id: string; // Google Calendar ID - also used as person identifier
  name: string;
  color: string;
}

export interface CalendarConfig {
  calendars: Calendar[];
}

// Helper to get initial from name
export function getInitial(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3); // Max 3 characters for initials like "A&V"
}
