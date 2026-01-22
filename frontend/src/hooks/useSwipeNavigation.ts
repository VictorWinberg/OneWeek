import { useRef, useCallback, useState } from 'react';
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
   * Minimum velocity in pixels per millisecond to trigger fast swipe (default: 0.5)
   * Fast swipes override event card dragging
   */
  fastSwipeVelocity?: number;
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
  startTime: number;
  isSwiping: boolean;
  startedOnEventCard: boolean;
  isFastSwipe: boolean;
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
  fastSwipeVelocity = 0.5,
  activeBlock,
  isDisabled = false,
}: UseSwipeNavigationOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeNavigationState>({ offsetX: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Don't interfere if disabled or no navigation handlers
      if (isDisabled || (!onPrevWeek && !onNextWeek)) return;

      // Don't start swipe if a block is being dragged
      if (activeBlock) return;

      // Check if touching an interactive element (but allow event cards for fast swipe detection)
      const target = e.target as HTMLElement;
      const startedOnEventCard = !!target.closest('[data-event-card]');

      // Don't start swipe if touching other interactive elements (buttons, links, etc.)
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        // But allow if it's an event card (we'll handle fast swipes)
        if (!startedOnEventCard) {
          return;
        }
      }

      const touch = e.touches[0];
      swipeStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        startTime: Date.now(),
        isSwiping: false,
        startedOnEventCard,
        isFastSwipe: false,
      };
      setIsDragging(false);
      setIsAnimating(false);
    },
    [onPrevWeek, onNextWeek, activeBlock, isDisabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeStateRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStateRef.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeStateRef.current.startY);
      const absDeltaX = Math.abs(deltaX);
      const elapsedTime = Date.now() - swipeStateRef.current.startTime;

      // Calculate velocity (pixels per millisecond)
      const velocity = elapsedTime > 0 ? absDeltaX / elapsedTime : 0;

      // Check if this is a fast swipe (high velocity and significant horizontal movement)
      // Also consider it fast if horizontal movement is very significant (user clearly swiping)
      const isFastSwipe =
        (velocity >= fastSwipeVelocity && absDeltaX >= minHorizontalMovement * 2) ||
        absDeltaX >= minHorizontalMovement * 4; // Very significant horizontal movement

      // If started on event card and this is a fast swipe, prevent event drag immediately
      // This must happen BEFORE any other logic to prevent dnd-kit from starting drag
      if (swipeStateRef.current.startedOnEventCard && isFastSwipe) {
        e.preventDefault();
        e.stopPropagation();
        swipeStateRef.current.isFastSwipe = true;
        // Mark as swiping immediately to prevent drag from starting
        if (!swipeStateRef.current.isSwiping) {
          swipeStateRef.current.isSwiping = true;
          setIsDragging(true);
        }
      }

      // Check if this is a horizontal swipe
      if (!swipeStateRef.current.isSwiping) {
        // Need minimum horizontal movement to start
        if (absDeltaX < minHorizontalMovement) return;

        // If vertical movement is too much, cancel swipe
        if (deltaY > maxVerticalMovement) {
          swipeStateRef.current = null;
          return;
        }

        // If started on event card, only proceed if it's a fast swipe
        // Give it a bit of time (up to 100ms) to develop into a fast swipe
        if (swipeStateRef.current.startedOnEventCard) {
          if (!isFastSwipe && elapsedTime < 100) {
            // Wait a bit longer to see if it becomes fast
            // But prevent default to stop drag from starting
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (!isFastSwipe) {
            // After waiting, if still not fast, cancel to allow event drag
            swipeStateRef.current = null;
            return;
          }
          // If it's a fast swipe, prevent drag from starting
          e.preventDefault();
          e.stopPropagation();
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
    [minHorizontalMovement, maxVerticalMovement, fastSwipeVelocity]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current) return;

    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const absDeltaX = Math.abs(deltaX);

    setIsDragging(false);

    // For fast swipes, use a lower threshold to make navigation easier
    const effectiveThreshold = swipeStateRef.current.isFastSwipe
      ? Math.max(threshold * 0.6, minHorizontalMovement * 3)
      : threshold;

    // Check if threshold is met or if it's a fast swipe
    if (swipeStateRef.current.isSwiping && (absDeltaX >= effectiveThreshold || swipeStateRef.current.isFastSwipe)) {
      // Enable animation transition first
      setIsAnimating(true);

      if (deltaX > 0 && onPrevWeek) {
        // Swiped right -> go to previous week
        onPrevWeek();
      } else if (deltaX < 0 && onNextWeek) {
        // Swiped left -> go to next week
        onNextWeek();
      }

      // Reset offsetX to 0 in the next frame to trigger slide-back animation
      // The transition will animate from current offsetX to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSwipeState({ offsetX: 0 });
        });
      });

      // Reset animation state after transition completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    } else {
      // If threshold not met, reset immediately
      setSwipeState({ offsetX: 0 });
    }

    // Always clear the ref
    swipeStateRef.current = null;
  }, [threshold, minHorizontalMovement, onPrevWeek, onNextWeek]);

  const resetSwipeState = useCallback(() => {
    swipeStateRef.current = null;
    setSwipeState({ offsetX: 0 });
    setIsDragging(false);
    setIsAnimating(false);
  }, []);

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
