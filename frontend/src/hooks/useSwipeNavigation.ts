import { useRef, useCallback } from 'react';

interface UseSwipeNavigationOptions {
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  /**
   * Minimum distance in pixels to trigger navigation (default: 100)
   */
  threshold?: number;
  /**
   * Minimum horizontal movement to start swipe (default: 10)
   */
  minHorizontalMovement?: number;
  /**
   * Maximum vertical movement allowed for horizontal swipe (default: 50)
   */
  maxVerticalMovement?: number;
  /**
   * If an active block is being dragged, disable swipe navigation
   */
  activeBlock?: unknown | null;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
}

/**
 * Hook for handling horizontal swipe navigation between weeks
 * Provides drag-like behavior where the view follows the finger
 */
export function useSwipeNavigation({
  onPrevWeek,
  onNextWeek,
  threshold = 100,
  minHorizontalMovement = 10,
  maxVerticalMovement = 50,
  activeBlock,
}: UseSwipeNavigationOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeStateRef = useRef<SwipeState | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Don't interfere if there's no navigation handlers
      if (!onPrevWeek && !onNextWeek) return;

      // Don't start swipe if a block is being dragged
      if (activeBlock) return;

      // Don't start swipe if touching an interactive element
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-event-card]')
      ) {
        return;
      }

      const touch = e.touches[0];
      swipeStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isSwiping: false,
      };
    },
    [onPrevWeek, onNextWeek, activeBlock]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeStateRef.current || !containerRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStateRef.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeStateRef.current.startY);
      const absDeltaX = Math.abs(deltaX);

      // Check if this is a horizontal swipe
      if (!swipeStateRef.current.isSwiping) {
        // Need minimum horizontal movement to start
        if (absDeltaX < minHorizontalMovement) return;

        // If vertical movement is too much, cancel swipe
        if (deltaY > maxVerticalMovement) {
          swipeStateRef.current = null;
          return;
        }

        // Mark as swiping
        swipeStateRef.current.isSwiping = true;
      }

      // Prevent default scrolling during horizontal swipe
      if (swipeStateRef.current.isSwiping && absDeltaX > minHorizontalMovement) {
        e.preventDefault();
      }

      // Update current position
      swipeStateRef.current.currentX = touch.clientX;

      // Apply transform to follow finger
      const translateX = deltaX;
      containerRef.current.style.transform = `translateX(${translateX}px)`;
      containerRef.current.style.transition = 'none';
    },
    [minHorizontalMovement, maxVerticalMovement]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current || !containerRef.current) return;

    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const absDeltaX = Math.abs(deltaX);

    // Reset transform
    containerRef.current.style.transform = '';
    containerRef.current.style.transition = '';

    // Check if threshold is met
    if (swipeStateRef.current.isSwiping && absDeltaX >= threshold) {
      if (deltaX > 0 && onPrevWeek) {
        // Swiped right -> go to previous week
        onPrevWeek();
      } else if (deltaX < 0 && onNextWeek) {
        // Swiped left -> go to next week
        onNextWeek();
      }
    }

    swipeStateRef.current = null;
  }, [threshold, onPrevWeek, onNextWeek]);

  const getContainerProps = useCallback(() => {
    return {
      ref: containerRef,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        touchAction: 'pan-y pinch-zoom' as const, // Allow vertical scrolling but handle horizontal swipes
      },
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    getContainerProps,
  };
}
