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
    if (activeBlock) return;
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
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!swipeStateRef.current) return;

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

      if (swipeStateRef.current.isSwiping && absDeltaX > minHorizontalMovement && e.cancelable) {
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
        touchAction: 'pan-y pinch-zoom' as const,
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
