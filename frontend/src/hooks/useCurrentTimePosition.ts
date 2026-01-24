import { useState, useEffect } from 'react';
import { isToday } from '@/utils/dateUtils';

interface UseCurrentTimePositionResult {
  /**
   * The top position in pixels for the current time indicator
   * Returns null if the date is not today
   */
  topPosition: number | null;
  /**
   * Whether the current time indicator should be shown
   */
  shouldShow: boolean;
}

/**
 * Hook that calculates the vertical position for a current time indicator
 * @param date - The date of the day column
 * @param pixelsPerHour - The number of pixels per hour (e.g., 60 for desktop, 50 for mobile)
 * @returns The top position in pixels and whether to show the indicator
 */
export function useCurrentTimePosition(date: Date, pixelsPerHour: number): UseCurrentTimePositionResult {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 10 seconds for smoother movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const isCurrentDay = isToday(date);

  if (!isCurrentDay) {
    return { topPosition: null, shouldShow: false };
  }

  const now = currentTime;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Calculate position: (hours * pixelsPerHour) + (minutes / 60 * pixelsPerHour) + (seconds / 3600 * pixelsPerHour)
  const topPosition = (hours * pixelsPerHour) + (minutes / 60 * pixelsPerHour) + (seconds / 3600 * pixelsPerHour);

  return {
    topPosition,
    shouldShow: true,
  };
}

