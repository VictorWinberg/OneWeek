import { useRef, useCallback, useState, useEffect } from 'react';
import type { Block } from '@/types';

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
  activeBlock?: Block | null;
  /**
   * Disable swipe navigation
   */
  isDisabled?: boolean;
  /**
   * Container width for calculating swipe limits
   */
  containerWidth?: number;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
}

export interface SwipeNavigationState {
  offsetX: number;
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
  isDisabled = false,
  containerWidth: _containerWidth = 0, // Currently unused but kept for API compatibility
}: UseSwipeNavigationOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeNavigationState>({ offsetX: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Don't interfere if disabled or no navigation handlers
      if (isDisabled || (!onPrevWeek && !onNextWeek)) return;

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
      setIsDragging(false);
      setIsAnimating(false);
    },
    [onPrevWeek, onNextWeek, activeBlock, isDisabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!swipeStateRef.current) return;

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
        setIsDragging(true);
      }

      // Prevent default scrolling during horizontal swipe
      if (swipeStateRef.current.isSwiping && absDeltaX > minHorizontalMovement) {
        e.preventDefault();
      }

      // Update current position
      swipeStateRef.current.currentX = touch.clientX;

      // Update offsetX state
      setSwipeState({ offsetX: deltaX });
    },
    [minHorizontalMovement, maxVerticalMovement]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current) return;

    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const absDeltaX = Math.abs(deltaX);

    setIsDragging(false);

    // Check if threshold is met
    if (swipeStateRef.current.isSwiping && absDeltaX >= threshold) {
      setIsAnimating(true);

      if (deltaX > 0 && onPrevWeek) {
        // Swiped right -> go to previous week
        onPrevWeek();
      } else if (deltaX < 0 && onNextWeek) {
        // Swiped left -> go to next week
        onNextWeek();
      }

      // Reset animation state after transition
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }

    // Reset swipe state
    swipeStateRef.current = null;
    setSwipeState({ offsetX: 0 });
  }, [threshold, onPrevWeek, onNextWeek]);

  // Attach native event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Use native listeners with { passive: false } to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const resetSwipeState = useCallback(() => {
    swipeStateRef.current = null;
    setSwipeState({ offsetX: 0 });
    setIsDragging(false);
    setIsAnimating(false);
  }, []);

  // getContainerProps is no longer needed since we use native listeners
  // Keeping for backwards compatibility but it won't attach handlers
  const getContainerProps = useCallback(() => {
    return {
      ref: containerRef,
      style: {
        touchAction: 'pan-y pinch-zoom' as const, // Allow vertical scrolling but handle horizontal swipes
      },
    };
  }, []);

  // Container ref callback function
  const containerRefCallback = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    swipeState,
    isDragging,
    isAnimating,
    resetSwipeState,
    containerRef: containerRefCallback,
    getContainerProps,
  };
}
