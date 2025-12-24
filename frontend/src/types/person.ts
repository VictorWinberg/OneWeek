// Person is now just an alias for calendar - calendars ARE the people/entities
import type { CalendarSource } from './calendar';

export type Person = CalendarSource;

// Helper to get initial from name
export function getInitial(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3); // Max 3 characters for initials like "A&V"
}

