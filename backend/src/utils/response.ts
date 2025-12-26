import type { calendar_v3 } from 'googleapis';

/**
 * Standard success response with data
 */
export interface SuccessResponse<T> {
  success: true;
  data?: T;
}

/**
 * Create a success response object
 */
export function successResponse<T>(data?: T): SuccessResponse<T> & T {
  return { success: true, ...data } as SuccessResponse<T> & T;
}

/**
 * Map a Google Calendar to frontend format
 */
export interface MappedCalendar {
  id: string | null | undefined;
  name: string | null | undefined;
  primary: boolean | null | undefined;
  backgroundColor: string | null | undefined;
  accessRole: string | null | undefined;
}

export function mapCalendarToResponse(calendar: calendar_v3.Schema$CalendarListEntry): MappedCalendar {
  return {
    id: calendar.id,
    name: calendar.summary,
    primary: calendar.primary,
    backgroundColor: calendar.backgroundColor,
    accessRole: calendar.accessRole,
  };
}

/**
 * Map Google Calendars list to frontend format
 */
export function mapCalendarsToResponse(calendars: calendar_v3.Schema$CalendarListEntry[]): MappedCalendar[] {
  return calendars.map(mapCalendarToResponse);
}

/**
 * User info response format
 */
export interface UserInfoResponse {
  email: string | null | undefined;
  name: string | null | undefined;
  picture: string | null | undefined;
}

export function mapUserInfoToResponse(userInfo: { email?: string | null; name?: string | null; picture?: string | null }): UserInfoResponse {
  return {
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
}

/**
 * Calendar config with permissions response
 */
export interface CalendarWithPermissions {
  id: string;
  name: string;
  color: string;
  permissions: string[];
}

export function mapCalendarWithPermissions(
  calendar: { id: string; name: string; color: string },
  permissions: string[]
): CalendarWithPermissions {
  return {
    id: calendar.id,
    name: calendar.name,
    color: calendar.color,
    permissions,
  };
}

