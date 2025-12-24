import { readFileSync } from 'fs';
import { join } from 'path';

interface User {
  emails: string[];
}

interface Role {
  [roleName: string]: string[];
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  permissions: {
    [userId: string]: string; // userId -> roleName
  };
}

interface ConfigFile {
  users: {
    [userId: string]: User;
  };
  roles: Role;
  calendars: Calendar[];
}

// Load config at module initialization - fail fast if config is invalid
function initializeConfig(): ConfigFile {
  try {
    // Read from project root (parent of backend directory)
    const configPath = join(process.cwd(), '..', 'config.json');
    const configData = readFileSync(configPath, 'utf-8');
    const config: ConfigFile = JSON.parse(configData);

    // Validate config structure
    if (!config.users || !config.roles || !config.calendars) {
      throw new Error('Invalid config structure: missing users, roles, or calendars');
    }

    console.log(`✓ Config loaded: ${Object.keys(config.users).length} users, ${config.calendars.length} calendars`);
    return config;
  } catch (error) {
    console.error('❌ FATAL: Failed to load config.json:', error);
    throw new Error(`Failed to initialize config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize config once at module load
const config: ConfigFile = initializeConfig();

/**
 * Get user ID from email
 */
export function getUserIdFromEmail(email: string): string | null {
  for (const [userId, user] of Object.entries(config.users)) {
    if (user.emails.includes(email)) {
      return userId;
    }
  }

  return null;
}

/**
 * Get all emails for a user
 */
export function getUserEmails(userId: string): string[] {
  return config.users[userId]?.emails || [];
}

/**
 * Check if email is allowed (exists in any user)
 */
export function isEmailAllowed(email: string): boolean {
  return getUserIdFromEmail(email) !== null;
}

/**
 * Get user's role for a specific calendar
 */
export function getUserRoleForCalendar(userId: string, calendarId: string): string | null {
  const calendar = config.calendars.find((cal) => cal.id === calendarId);
  if (!calendar) {
    return null;
  }

  return calendar.permissions[userId] || null;
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(roleName: string): string[] {
  return config.roles[roleName] || [];
}

/**
 * Check if user has a specific permission for a calendar
 */
export function hasPermission(
  email: string,
  calendarId: string,
  permission: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const userId = getUserIdFromEmail(email);
  if (!userId) {
    return false;
  }

  const roleName = getUserRoleForCalendar(userId, calendarId);
  if (!roleName) {
    return false;
  }

  const permissions = getPermissionsForRole(roleName);
  return permissions.includes(permission);
}

/**
 * Get all calendars accessible by a user
 */
export function getUserCalendars(email: string): Calendar[] {
  const userId = getUserIdFromEmail(email);

  if (!userId) {
    return [];
  }

  return config.calendars.filter((calendar) => {
    return calendar.permissions[userId] !== undefined;
  });
}

/**
 * Get all permissions for a user on a calendar
 */
export function getUserPermissionsForCalendar(email: string, calendarId: string): string[] {
  const userId = getUserIdFromEmail(email);
  if (!userId) {
    return [];
  }

  const roleName = getUserRoleForCalendar(userId, calendarId);
  if (!roleName) {
    return [];
  }

  return getPermissionsForRole(roleName);
}

/**
 * Get calendar configuration (for frontend)
 */
export function getCalendarConfig(): Calendar[] {
  return config.calendars;
}

/**
 * Reload config from disk (useful for development/testing)
 */
export function reloadConfig(): ConfigFile {
  // Re-initialize config by re-requiring this module would require clearing require cache
  // For simplicity, just read and parse again
  try {
    const configPath = join(process.cwd(), '..', 'config.json');
    const configData = readFileSync(configPath, 'utf-8');
    const newConfig: ConfigFile = JSON.parse(configData);

    // Update the module-level config
    Object.assign(config, newConfig);

    console.log('✓ Config reloaded');
    return config;
  } catch (error) {
    console.error('❌ Failed to reload config:', error);
    throw new Error(`Failed to reload config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
