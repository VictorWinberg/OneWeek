import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted to define mock data that needs to be available during mock hoisting
const { mockConfigData } = vi.hoisted(() => ({
  mockConfigData: JSON.stringify({
    users: {
      user1: { emails: ['user1@example.com', 'user1.alt@example.com'] },
      user2: { emails: ['user2@example.com'] },
      admin: { emails: ['admin@example.com'] },
    },
    roles: {
      viewer: ['read'],
      editor: ['read', 'create', 'update'],
      admin: ['read', 'create', 'update', 'delete'],
    },
    calendars: [
      {
        id: 'family-calendar',
        name: 'Family',
        color: '#4285f4',
        permissions: {
          user1: 'editor',
          user2: 'viewer',
          admin: 'admin',
        },
      },
      {
        id: 'work-calendar',
        name: 'Work',
        color: '#0f9d58',
        permissions: {
          user1: 'admin',
        },
      },
      {
        id: 'shared-calendar',
        name: 'Shared',
        color: '#f4b400',
        permissions: {
          user1: 'viewer',
          user2: 'editor',
        },
      },
    ],
  }),
}));

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => mockConfigData),
}));

// Import after mocking
import {
  getUserIdFromEmail,
  isEmailAllowed,
  getUserRoleForCalendar,
  getPermissionsForRole,
  hasPermission,
  getUserCalendars,
  getUserPermissionsForCalendar,
  getCalendarConfig,
} from '../../src/services/permissionService.js';

describe('permissionService', () => {
  describe('getUserIdFromEmail', () => {
    it('should return userId for primary email', () => {
      expect(getUserIdFromEmail('user1@example.com')).toBe('user1');
    });

    it('should return userId for alternate email', () => {
      expect(getUserIdFromEmail('user1.alt@example.com')).toBe('user1');
    });

    it('should return null for unknown email', () => {
      expect(getUserIdFromEmail('unknown@example.com')).toBeNull();
    });

    it('should return correct userId for different users', () => {
      expect(getUserIdFromEmail('user2@example.com')).toBe('user2');
      expect(getUserIdFromEmail('admin@example.com')).toBe('admin');
    });
  });

  describe('isEmailAllowed', () => {
    it('should return true for allowed email', () => {
      expect(isEmailAllowed('user1@example.com')).toBe(true);
    });

    it('should return true for alternate allowed email', () => {
      expect(isEmailAllowed('user1.alt@example.com')).toBe(true);
    });

    it('should return false for unknown email', () => {
      expect(isEmailAllowed('unknown@example.com')).toBe(false);
    });
  });

  describe('getUserRoleForCalendar', () => {
    it('should return role for user with access', () => {
      expect(getUserRoleForCalendar('user1', 'family-calendar')).toBe('editor');
    });

    it('should return null for user without access', () => {
      expect(getUserRoleForCalendar('user2', 'work-calendar')).toBeNull();
    });

    it('should return null for non-existent calendar', () => {
      expect(getUserRoleForCalendar('user1', 'non-existent')).toBeNull();
    });

    it('should return different roles for different calendars', () => {
      expect(getUserRoleForCalendar('user1', 'family-calendar')).toBe('editor');
      expect(getUserRoleForCalendar('user1', 'work-calendar')).toBe('admin');
      expect(getUserRoleForCalendar('user1', 'shared-calendar')).toBe('viewer');
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for viewer role', () => {
      expect(getPermissionsForRole('viewer')).toEqual(['read']);
    });

    it('should return permissions for editor role', () => {
      expect(getPermissionsForRole('editor')).toEqual(['read', 'create', 'update']);
    });

    it('should return permissions for admin role', () => {
      expect(getPermissionsForRole('admin')).toEqual(['read', 'create', 'update', 'delete']);
    });

    it('should return empty array for unknown role', () => {
      expect(getPermissionsForRole('unknown')).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has read permission', () => {
      expect(hasPermission('user1@example.com', 'family-calendar', 'read')).toBe(true);
    });

    it('should return true when user has create permission as editor', () => {
      expect(hasPermission('user1@example.com', 'family-calendar', 'create')).toBe(true);
    });

    it('should return false when viewer tries to create', () => {
      expect(hasPermission('user2@example.com', 'family-calendar', 'create')).toBe(false);
    });

    it('should return false when editor tries to delete', () => {
      expect(hasPermission('user1@example.com', 'family-calendar', 'delete')).toBe(false);
    });

    it('should return true when admin tries to delete', () => {
      expect(hasPermission('admin@example.com', 'family-calendar', 'delete')).toBe(true);
    });

    it('should return false for unknown email', () => {
      expect(hasPermission('unknown@example.com', 'family-calendar', 'read')).toBe(false);
    });

    it('should return false for calendar without access', () => {
      expect(hasPermission('user2@example.com', 'work-calendar', 'read')).toBe(false);
    });

    it('should work with alternate email addresses', () => {
      expect(hasPermission('user1.alt@example.com', 'family-calendar', 'read')).toBe(true);
    });
  });

  describe('getUserCalendars', () => {
    it('should return calendars accessible by user', () => {
      const calendars = getUserCalendars('user1@example.com');
      expect(calendars).toHaveLength(3);
      expect(calendars.map((c) => c.id)).toContain('family-calendar');
      expect(calendars.map((c) => c.id)).toContain('work-calendar');
      expect(calendars.map((c) => c.id)).toContain('shared-calendar');
    });

    it('should return limited calendars for user with partial access', () => {
      const calendars = getUserCalendars('user2@example.com');
      expect(calendars).toHaveLength(2);
      expect(calendars.map((c) => c.id)).toContain('family-calendar');
      expect(calendars.map((c) => c.id)).toContain('shared-calendar');
      expect(calendars.map((c) => c.id)).not.toContain('work-calendar');
    });

    it('should return empty array for unknown user', () => {
      const calendars = getUserCalendars('unknown@example.com');
      expect(calendars).toEqual([]);
    });
  });

  describe('getUserPermissionsForCalendar', () => {
    it('should return all permissions for admin', () => {
      const permissions = getUserPermissionsForCalendar('admin@example.com', 'family-calendar');
      expect(permissions).toEqual(['read', 'create', 'update', 'delete']);
    });

    it('should return editor permissions', () => {
      const permissions = getUserPermissionsForCalendar('user1@example.com', 'family-calendar');
      expect(permissions).toEqual(['read', 'create', 'update']);
    });

    it('should return viewer permissions', () => {
      const permissions = getUserPermissionsForCalendar('user2@example.com', 'family-calendar');
      expect(permissions).toEqual(['read']);
    });

    it('should return empty array for no access', () => {
      const permissions = getUserPermissionsForCalendar('user2@example.com', 'work-calendar');
      expect(permissions).toEqual([]);
    });

    it('should return empty array for unknown user', () => {
      const permissions = getUserPermissionsForCalendar('unknown@example.com', 'family-calendar');
      expect(permissions).toEqual([]);
    });
  });

  describe('getCalendarConfig', () => {
    it('should return all calendars', () => {
      const calendars = getCalendarConfig();
      expect(calendars).toHaveLength(3);
    });

    it('should include calendar properties', () => {
      const calendars = getCalendarConfig();
      const familyCalendar = calendars.find((c) => c.id === 'family-calendar');
      expect(familyCalendar).toBeDefined();
      expect(familyCalendar?.name).toBe('Family');
      expect(familyCalendar?.color).toBe('#4285f4');
    });
  });
});
