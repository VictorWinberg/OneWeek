import type { Request } from 'express';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Get a required string query parameter
 * @throws ValidationError if parameter is missing or not a string
 */
export function getRequiredQueryParam(req: Request, name: string): string {
  const value = req.query[name];
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`Missing required parameter: ${name}`);
  }
  return value;
}

/**
 * Get an optional string query parameter
 */
export function getOptionalQueryParam(req: Request, name: string): string | undefined {
  const value = req.query[name];
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value;
}

/**
 * Parse a JSON query parameter
 * @throws ValidationError if parameter is not valid JSON
 */
export function parseJsonQueryParam<T>(req: Request, name: string): T {
  const value = getRequiredQueryParam(req, name);
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new ValidationError(`Invalid JSON in parameter: ${name}`);
  }
}

/**
 * Parse a date query parameter to ISO string
 * @throws ValidationError if the date is invalid
 */
export function parseDateQueryParam(req: Request, name: string): string {
  const value = getRequiredQueryParam(req, name);
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date in parameter: ${name}`);
  }
  return date.toISOString();
}

/**
 * Get a required string from request body
 * @throws ValidationError if field is missing
 */
export function getRequiredBodyField<T>(body: Record<string, unknown>, name: string): T {
  const value = body[name];
  if (value === undefined || value === null) {
    throw new ValidationError(`Missing required field: ${name}`);
  }
  return value as T;
}

/**
 * Validate that all required fields are present in request body
 * @throws ValidationError listing all missing fields
 */
export function validateRequiredFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(field => body[field] === undefined || body[field] === null);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Get typed update mode from query parameter
 */
export function getUpdateMode(req: Request): 'this' | 'all' | 'future' | undefined {
  const mode = getOptionalQueryParam(req, 'updateMode');
  if (mode && !['this', 'all', 'future'].includes(mode)) {
    throw new ValidationError('Invalid updateMode. Must be: this, all, or future');
  }
  return mode as 'this' | 'all' | 'future' | undefined;
}

