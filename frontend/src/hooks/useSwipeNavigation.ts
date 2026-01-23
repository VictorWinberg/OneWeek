import { useRef, useCallback, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';

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
  isDisabled = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  containerWidth: _containerWidth = 0,
}: UseSwipeNavigationOptions) {
  const { activeBlock } = useAppContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeNavigationState>({ offsetX: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const callbacksRef = useRef({ onPrevWeek, onNextWeek, activeBlock, isDisabled });
  useEffect(() => {
    callbacksRef.current = { onPrevWeek, onNextWeek, activeBlock, isDisabled };
  }, [onPrevWeek, onNextWeek, activeBlock, isDisabled]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const { isDisabled, onPrevWeek, onNextWeek, activeBlock } = callbacksRef.current;

    if (isDisabled || (!onPrevWeek && !onNextWeek)) return;
    if (activeBlock) return; // Don't start swipe if a drag is in progress

    const target = e.target as HTMLElement;

    // Don't start swipe if touching an event card - let dnd-kit handle it
    // Event cards are always buttons, so we need to check for the data attribute
    const eventCard = target.closest('[data-event-card]');
    if (eventCard) {
      // Check if the event card is draggable by checking computed style
      const computedStyle = window.getComputedStyle(eventCard as HTMLElement);
      const isDraggable = computedStyle.touchAction === 'none';
      if (isDraggable) {
        // Don't initialize swipe - let dnd-kit handle the drag
        console.log('[useSwipeNavigation] Skipping swipe initialization - touching draggable event card');
        return;
      }
    }

    // Don't start swipe if touching interactive elements (buttons, links)
    // But allow swipe to start on event cards if they're not draggable
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      // Only block if it's not an event card (event cards can be swiped over if not draggable)
      if (!eventCard) {
        return;
      }
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
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!swipeStateRef.current) return;

      const { activeBlock } = callbacksRef.current;

      // Cancel swipe if a drag is in progress
      if (activeBlock) {
        swipeStateRef.current = null;
        setIsDragging(false);
        setSwipeState({ offsetX: 0 });
        return;
      }

      // Check if touch is now on a draggable event card - cancel swipe to let drag handle it
      const target = e.target as HTMLElement;
      const eventCard = target.closest('[data-event-card]');
      if (eventCard) {
        const computedStyle = window.getComputedStyle(eventCard as HTMLElement);
        const isDraggable = computedStyle.touchAction === 'none';
        if (isDraggable) {
          // Cancel swipe to allow drag to proceed
          swipeStateRef.current = null;
          setIsDragging(false);
          setSwipeState({ offsetX: 0 });
          return;
        }
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStateRef.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeStateRef.current.startY);
      const absDeltaX = Math.abs(deltaX);

      if (!swipeStateRef.current.isSwiping) {
        if (absDeltaX < minHorizontalMovement) return;

        if (deltaY > maxVerticalMovement) {
          swipeStateRef.current = null;
          return;
        }

        swipeStateRef.current.isSwiping = true;
        setIsDragging(true);
      }

      // Only prevent default if we're actually swiping and not on a draggable element
      if (swipeStateRef.current.isSwiping && absDeltaX > minHorizontalMovement && e.cancelable) {
        // Double-check we're not on a draggable event card before preventing default
        const currentTarget = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        const currentEventCard = currentTarget?.closest('[data-event-card]');
        if (currentEventCard) {
          const computedStyle = window.getComputedStyle(currentEventCard);
          const isDraggable = computedStyle.touchAction === 'none';
          if (isDraggable) {
            // Don't prevent default - let drag handle it
            return;
          }
        }
        e.preventDefault();
      }

      swipeStateRef.current.currentX = touch.clientX;
      setSwipeState({ offsetX: deltaX });
    },
    [minHorizontalMovement, maxVerticalMovement]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current) return;

    const { onPrevWeek, onNextWeek } = callbacksRef.current;
    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const absDeltaX = Math.abs(deltaX);

    setIsDragging(false);

    if (swipeStateRef.current.isSwiping && absDeltaX >= threshold) {
      setIsAnimating(true);

      if (deltaX > 0 && onPrevWeek) {
        onPrevWeek();
      } else if (deltaX < 0 && onNextWeek) {
        onNextWeek();
      }

      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }

    swipeStateRef.current = null;
    setSwipeState({ offsetX: 0 });
  }, [threshold]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

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

  const getContainerProps = useCallback(() => {
    return {
      ref: containerRef,
      style: {
        touchAction: 'pan-y pan-x pinch-zoom' as const,
      },
    };
  }, []);

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
