import { ValidationError } from '../middleware/errorHandler.js';
import type { RecurrenceRule } from '../utils/recurrence.js';

/**
 * Event metadata
 */
export interface EventMetadata {
  category?: string;
  originalCalendarId?: string;
}

/**
 * Event creation request body
 */
export interface CreateEventBody {
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  metadata?: EventMetadata;
  recurrenceRule?: RecurrenceRule;
}

/**
 * Event update request body
 */
export interface UpdateEventBody {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  recurrenceRule?: RecurrenceRule | null;
}

/**
 * Event move request body
 */
export interface MoveEventBody {
  targetCalendarId: string;
}

// Type guards for safer validation

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate and extract metadata from request body
 */
function validateMetadata(metadata: unknown): EventMetadata | undefined {
  if (metadata === undefined || metadata === null) {
    return undefined;
  }

  if (!isObject(metadata)) {
    throw new ValidationError('metadata must be an object');
  }

  const result: EventMetadata = {};

  if (metadata.category !== undefined) {
    if (!isString(metadata.category)) {
      throw new ValidationError('metadata.category must be a string');
    }
    result.category = metadata.category;
  }

  if (metadata.originalCalendarId !== undefined) {
    if (!isString(metadata.originalCalendarId)) {
      throw new ValidationError('metadata.originalCalendarId must be a string');
    }
    result.originalCalendarId = metadata.originalCalendarId;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validate event creation request body
 * @throws ValidationError if required fields are missing
 */
export function validateCreateEventBody(body: Record<string, unknown>): CreateEventBody {
  const { calendarId, title, startTime, endTime } = body;

  if (!calendarId || !isString(calendarId)) {
    throw new ValidationError('Missing required field: calendarId');
  }
  if (!title || !isString(title)) {
    throw new ValidationError('Missing required field: title');
  }
  if (!startTime || !isString(startTime)) {
    throw new ValidationError('Missing required field: startTime');
  }
  if (!endTime || !isString(endTime)) {
    throw new ValidationError('Missing required field: endTime');
  }

  // Validate recurrence rule if provided
  const recurrenceRule = body.recurrenceRule !== undefined 
    ? validateRecurrenceRule(body.recurrenceRule) 
    : undefined;

  return {
    calendarId,
    title,
    description: isString(body.description) ? body.description : undefined,
    startTime,
    endTime,
    allDay: isBoolean(body.allDay) ? body.allDay : false,
    metadata: validateMetadata(body.metadata),
    recurrenceRule,
  };
}

/**
 * Validate event update request body
 * At least one field must be present
 */
export function validateUpdateEventBody(body: Record<string, unknown>): UpdateEventBody {
  const { title, description, startTime, endTime, allDay, recurrenceRule } = body;

  const update: UpdateEventBody = {};

  if (title !== undefined) {
    if (!isString(title)) {
      throw new ValidationError('title must be a string');
    }
    update.title = title;
  }

  if (description !== undefined) {
    if (!isString(description)) {
      throw new ValidationError('description must be a string');
    }
    update.description = description;
  }

  if (startTime !== undefined) {
    if (!isString(startTime)) {
      throw new ValidationError('startTime must be a string');
    }
    update.startTime = startTime;
  }

  if (endTime !== undefined) {
    if (!isString(endTime)) {
      throw new ValidationError('endTime must be a string');
    }
    update.endTime = endTime;
  }

  if (allDay !== undefined) {
    if (!isBoolean(allDay)) {
      throw new ValidationError('allDay must be a boolean');
    }
    update.allDay = allDay;
  }

  if (recurrenceRule !== undefined) {
    // null explicitly clears recurrence, otherwise validate the rule
    update.recurrenceRule = recurrenceRule === null ? null : validateRecurrenceRule(recurrenceRule);
  }

  return update;
}

/**
 * Validate move event request body
 * @throws ValidationError if targetCalendarId is missing
 */
export function validateMoveEventBody(body: Record<string, unknown>): MoveEventBody {
  const { targetCalendarId } = body;

  if (!targetCalendarId || !isString(targetCalendarId)) {
    throw new ValidationError('Missing targetCalendarId');
  }

  return { targetCalendarId };
}

const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
const VALID_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/**
 * Type guard to check if a value is a valid frequency
 */
function isValidFrequency(value: unknown): value is RecurrenceRule['frequency'] {
  return isString(value) && VALID_FREQUENCIES.includes(value as (typeof VALID_FREQUENCIES)[number]);
}

/**
 * Validate recurrence rule object
 * @throws ValidationError if rule is invalid
 */
export function validateRecurrenceRule(rule: unknown): RecurrenceRule {
  if (!isObject(rule)) {
    throw new ValidationError('Invalid recurrence rule: must be an object');
  }

  if (!isValidFrequency(rule.frequency)) {
    throw new ValidationError('Invalid recurrence frequency. Must be: DAILY, WEEKLY, MONTHLY, or YEARLY');
  }

  const result: RecurrenceRule = {
    frequency: rule.frequency,
  };

  // Validate optional interval
  if (rule.interval !== undefined) {
    if (typeof rule.interval !== 'number' || rule.interval < 1 || !Number.isInteger(rule.interval)) {
      throw new ValidationError('interval must be a positive integer');
    }
    result.interval = rule.interval;
  }

  // Validate optional count
  if (rule.count !== undefined) {
    if (typeof rule.count !== 'number' || rule.count < 1 || !Number.isInteger(rule.count)) {
      throw new ValidationError('count must be a positive integer');
    }
    result.count = rule.count;
  }

  // Validate optional until
  if (rule.until !== undefined) {
    if (!isString(rule.until)) {
      throw new ValidationError('until must be a date string');
    }
    result.until = rule.until;
  }

  // Validate optional byDay
  if (rule.byDay !== undefined) {
    if (!Array.isArray(rule.byDay)) {
      throw new ValidationError('byDay must be an array');
    }
    for (const day of rule.byDay) {
      if (!isString(day) || !VALID_WEEKDAYS.includes(day as (typeof VALID_WEEKDAYS)[number])) {
        throw new ValidationError(`Invalid day in byDay: ${day}. Must be: ${VALID_WEEKDAYS.join(', ')}`);
      }
    }
    result.byDay = rule.byDay as string[];
  }

  return result;
}

