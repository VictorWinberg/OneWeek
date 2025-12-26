/**
 * Drag sensor configuration utilities
 * Provides pre-configured sensor settings for different contexts
 */

import { PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { SensorDescriptor, SensorOptions } from '@dnd-kit/core';

export interface SensorConfig {
  sensor: typeof PointerSensor | typeof TouchSensor;
  options: SensorOptions;
}

/**
 * Desktop pointer sensor configuration
 * Requires 8px movement before drag starts
 */
export const desktopPointerConfig: SensorConfig = {
  sensor: PointerSensor,
  options: {
    activationConstraint: {
      distance: 8,
    },
  },
};

/**
 * Mobile pointer sensor configuration
 * Lower distance threshold for more responsive touch
 */
export const mobilePointerConfig: SensorConfig = {
  sensor: PointerSensor,
  options: {
    activationConstraint: {
      distance: 3,
    },
  },
};

/**
 * Mobile touch sensor configuration
 * Uses delay to prevent accidental drags and allow scrolling
 */
export const mobileTouchConfig: SensorConfig = {
  sensor: TouchSensor,
  options: {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  },
};

/**
 * Get sensor descriptors for desktop views
 */
export function getDesktopSensorDescriptors(): SensorDescriptor<SensorOptions>[] {
  return [
    {
      sensor: PointerSensor,
      options: desktopPointerConfig.options,
    },
  ];
}

/**
 * Get sensor descriptors for mobile views
 */
export function getMobileSensorDescriptors(): SensorDescriptor<SensorOptions>[] {
  return [
    {
      sensor: PointerSensor,
      options: mobilePointerConfig.options,
    },
    {
      sensor: TouchSensor,
      options: mobileTouchConfig.options,
    },
  ];
}
