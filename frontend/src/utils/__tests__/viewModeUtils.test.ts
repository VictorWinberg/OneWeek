import { describe, it, expect } from 'vitest';
import {
  urlToMobileViewMode,
  mobileToUrlViewMode,
  isValidUrlViewMode,
  isValidMobileViewMode,
  type MobileViewMode,
  type UrlViewMode,
} from '@/utils/viewModeUtils';

describe('viewModeUtils', () => {
  describe('urlToMobileViewMode', () => {
    it('maps "day" to "list"', () => {
      expect(urlToMobileViewMode('day')).toBe('list');
    });

    it('maps "grid" to "grid"', () => {
      expect(urlToMobileViewMode('grid')).toBe('grid');
    });

    it('maps "user" to "calendar"', () => {
      expect(urlToMobileViewMode('user')).toBe('calendar');
    });

    it('maps "hour" to "hour"', () => {
      expect(urlToMobileViewMode('hour')).toBe('hour');
    });

    it('returns default mode when urlMode is undefined', () => {
      expect(urlToMobileViewMode(undefined, 'calendar')).toBe('calendar');
    });

    it('returns "list" as default when no default provided', () => {
      expect(urlToMobileViewMode(undefined)).toBe('list');
    });

    it('handles unknown mode by returning "list"', () => {
      expect(urlToMobileViewMode('unknown' as UrlViewMode)).toBe('list');
    });
  });

  describe('mobileToUrlViewMode', () => {
    it('maps "list" to "day"', () => {
      expect(mobileToUrlViewMode('list')).toBe('day');
    });

    it('maps "grid" to "grid"', () => {
      expect(mobileToUrlViewMode('grid')).toBe('grid');
    });

    it('maps "calendar" to "user"', () => {
      expect(mobileToUrlViewMode('calendar')).toBe('user');
    });

    it('maps "hour" to "hour"', () => {
      expect(mobileToUrlViewMode('hour')).toBe('hour');
    });

    it('handles unknown mode by returning "day"', () => {
      expect(mobileToUrlViewMode('unknown' as MobileViewMode)).toBe('day');
    });
  });

  describe('round-trip conversion', () => {
    it('preserves mode through url->mobile->url conversion', () => {
      const urlModes: UrlViewMode[] = ['day', 'grid', 'user', 'hour'];

      for (const urlMode of urlModes) {
        const mobileMode = urlToMobileViewMode(urlMode);
        const backToUrl = mobileToUrlViewMode(mobileMode);
        expect(backToUrl).toBe(urlMode);
      }
    });

    it('preserves mode through mobile->url->mobile conversion', () => {
      const mobileModes: MobileViewMode[] = ['list', 'grid', 'calendar', 'hour'];

      for (const mobileMode of mobileModes) {
        const urlMode = mobileToUrlViewMode(mobileMode);
        const backToMobile = urlToMobileViewMode(urlMode);
        expect(backToMobile).toBe(mobileMode);
      }
    });
  });

  describe('isValidUrlViewMode', () => {
    it('returns true for valid modes', () => {
      expect(isValidUrlViewMode('day')).toBe(true);
      expect(isValidUrlViewMode('grid')).toBe(true);
      expect(isValidUrlViewMode('user')).toBe(true);
      expect(isValidUrlViewMode('hour')).toBe(true);
    });

    it('returns false for invalid modes', () => {
      expect(isValidUrlViewMode('invalid')).toBe(false);
      expect(isValidUrlViewMode('list')).toBe(false);
      expect(isValidUrlViewMode('')).toBe(false);
    });
  });

  describe('isValidMobileViewMode', () => {
    it('returns true for valid modes', () => {
      expect(isValidMobileViewMode('list')).toBe(true);
      expect(isValidMobileViewMode('calendar')).toBe(true);
      expect(isValidMobileViewMode('grid')).toBe(true);
      expect(isValidMobileViewMode('hour')).toBe(true);
    });

    it('returns false for invalid modes', () => {
      expect(isValidMobileViewMode('invalid')).toBe(false);
      expect(isValidMobileViewMode('day')).toBe(false);
      expect(isValidMobileViewMode('')).toBe(false);
    });
  });
});

