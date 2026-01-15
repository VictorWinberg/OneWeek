/**
 * View mode utilities
 * Handles mapping between URL view modes and mobile view modes
 */

export type MobileViewMode = 'list' | 'calendar' | 'grid' | 'hour';
export type UrlViewMode = 'day' | 'grid' | 'user' | 'hour';

/**
 * Map URL view modes to mobile view modes
 */
export function urlToMobileViewMode(
  urlMode: UrlViewMode | undefined,
  defaultMode: MobileViewMode = 'grid'
): MobileViewMode {
  if (!urlMode) return defaultMode;

  switch (urlMode) {
    case 'day':
      return 'list';
    case 'grid':
      return 'grid';
    case 'user':
      return 'calendar';
    case 'hour':
      return 'hour';
    default:
      return 'grid';
  }
}

/**
 * Map mobile view modes to URL view modes
 */
export function mobileToUrlViewMode(mobileMode: MobileViewMode): UrlViewMode {
  switch (mobileMode) {
    case 'list':
      return 'day';
    case 'grid':
      return 'grid';
    case 'calendar':
      return 'user';
    case 'hour':
      return 'hour';
    default:
      return 'grid';
  }
}

/**
 * Check if a view mode is valid
 */
export function isValidUrlViewMode(mode: string): mode is UrlViewMode {
  return ['day', 'grid', 'user', 'hour'].includes(mode);
}

/**
 * Check if a mobile view mode is valid
 */
export function isValidMobileViewMode(mode: string): mode is MobileViewMode {
  return ['list', 'calendar', 'grid', 'hour'].includes(mode);
}
