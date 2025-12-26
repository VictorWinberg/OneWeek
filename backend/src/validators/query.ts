import { ValidationError } from '../middleware/errorHandler.js';
import type { CalendarSource } from '../types/index.js';

/**
 * Parsed query parameters for listing events
 */
export interface ListEventsQuery {
  startDate: string;
  endDate: string;
  calendars: CalendarSource[];
}

/**
 * Validate and parse query parameters for listing events
 * @throws ValidationError if required parameters are missing or invalid
 */
export function validateListEventsQuery(query: Record<string, unknown>): ListEventsQuery {
  const { startDate, endDate, calendars } = query;

  if (!startDate || typeof startDate !== 'string') {
    throw new ValidationError('Missing required parameter: startDate');
  }

  if (!endDate || typeof endDate !== 'string') {
    throw new ValidationError('Missing required parameter: endDate');
  }

  if (!calendars || typeof calendars !== 'string') {
    throw new ValidationError('Missing required parameter: calendars');
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    throw new ValidationError('Invalid startDate format');
  }

  if (isNaN(endDateObj.getTime())) {
    throw new ValidationError('Invalid endDate format');
  }

  // Parse calendars JSON
  let parsedCalendars: CalendarSource[];
  try {
    parsedCalendars = JSON.parse(calendars);
  } catch {
    throw new ValidationError('Invalid calendars JSON format');
  }

  if (!Array.isArray(parsedCalendars)) {
    throw new ValidationError('calendars must be an array');
  }

  return {
    startDate: startDateObj.toISOString(),
    endDate: endDateObj.toISOString(),
    calendars: parsedCalendars,
  };
}

/**
 * Validate redirect URL parameter
 * @throws ValidationError if redirect_url is missing
 */
export function validateRedirectUrl(query: Record<string, unknown>): string {
  const { redirect_url } = query;

  if (!redirect_url || typeof redirect_url !== 'string') {
    throw new ValidationError('redirect_url query parameter is required');
  }

  return redirect_url;
}

/**
 * Validate authorization code parameter
 * @throws ValidationError if code is missing
 */
export function validateAuthCode(query: Record<string, unknown>): string {
  const { code } = query;

  if (!code || typeof code !== 'string') {
    throw new ValidationError('Missing authorization code');
  }

  return code;
}

