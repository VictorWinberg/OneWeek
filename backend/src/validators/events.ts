import { ValidationError } from '../middleware/errorHandler.js';
import type { RecurrenceRule } from '../utils/recurrence.js';

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
  metadata?: {
    category?: string;
    originalCalendarId?: string;
  };
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

/**
 * Validate event creation request body
 * @throws ValidationError if required fields are missing
 */
export function validateCreateEventBody(body: Record<string, unknown>): CreateEventBody {
  const { calendarId, title, startTime, endTime } = body;

  if (!calendarId || typeof calendarId !== 'string') {
    throw new ValidationError('Missing required field: calendarId');
  }
  if (!title || typeof title !== 'string') {
    throw new ValidationError('Missing required field: title');
  }
  if (!startTime || typeof startTime !== 'string') {
    throw new ValidationError('Missing required field: startTime');
  }
  if (!endTime || typeof endTime !== 'string') {
    throw new ValidationError('Missing required field: endTime');
  }

  return {
    calendarId,
    title,
    description: typeof body.description === 'string' ? body.description : undefined,
    startTime,
    endTime,
    allDay: typeof body.allDay === 'boolean' ? body.allDay : false,
    metadata: body.metadata as CreateEventBody['metadata'],
    recurrenceRule: body.recurrenceRule as RecurrenceRule | undefined,
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
    if (typeof title !== 'string') {
      throw new ValidationError('title must be a string');
    }
    update.title = title;
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new ValidationError('description must be a string');
    }
    update.description = description;
  }

  if (startTime !== undefined) {
    if (typeof startTime !== 'string') {
      throw new ValidationError('startTime must be a string');
    }
    update.startTime = startTime;
  }

  if (endTime !== undefined) {
    if (typeof endTime !== 'string') {
      throw new ValidationError('endTime must be a string');
    }
    update.endTime = endTime;
  }

  if (allDay !== undefined) {
    if (typeof allDay !== 'boolean') {
      throw new ValidationError('allDay must be a boolean');
    }
    update.allDay = allDay;
  }

  if (recurrenceRule !== undefined) {
    update.recurrenceRule = recurrenceRule as RecurrenceRule | null;
  }

  return update;
}

/**
 * Validate move event request body
 * @throws ValidationError if targetCalendarId is missing
 */
export function validateMoveEventBody(body: Record<string, unknown>): MoveEventBody {
  const { targetCalendarId } = body;

  if (!targetCalendarId || typeof targetCalendarId !== 'string') {
    throw new ValidationError('Missing targetCalendarId');
  }

  return { targetCalendarId };
}

/**
 * Validate recurrence rule object
 * @throws ValidationError if rule is invalid
 */
export function validateRecurrenceRule(rule: unknown): RecurrenceRule {
  if (!rule || typeof rule !== 'object') {
    throw new ValidationError('Invalid recurrence rule');
  }

  const r = rule as Record<string, unknown>;

  if (!r.frequency || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(r.frequency as string)) {
    throw new ValidationError('Invalid recurrence frequency. Must be: DAILY, WEEKLY, MONTHLY, or YEARLY');
  }

  return rule as RecurrenceRule;
}

