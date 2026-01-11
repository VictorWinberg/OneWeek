import { useRef, useState, useCallback, useEffect } from 'react';

interface UseSwipeNavigationOptions {
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isDisabled?: boolean;
  containerWidth?: number;
}

interface SwipeState {
  isDragging: boolean;
  offsetX: number;
  isAnimating: boolean;
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useSwipeNavigation({
  onPrevWeek,
  onNextWeek,
  isDisabled = false,
  containerWidth = 0,
}: UseSwipeNavigationOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isDragging: false,
    offsetX: 0,
    isAnimating: false,
  });

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const lastOffsetX = useRef<number>(0);

  // Thresholds
  const minSwipeDistance = 50; // Minimum distance to register as swipe
  const maxVerticalDistance = 30; // Max vertical movement to still consider horizontal
  const swipeThreshold = containerWidth * 0.3; // 30% of container width to trigger navigation

  // Reset state when navigation happens
  useEffect(() => {
    if (swipeState.isAnimating) {
      const timer = setTimeout(() => {
        setSwipeState({
          isDragging: false,
          offsetX: 0,
          isAnimating: false,
        });
        touchStartX.current = null;
        touchStartY.current = null;
        isHorizontalSwipe.current = null;
        lastOffsetX.current = 0;
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [swipeState.isAnimating]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isDisabled) return;

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isHorizontalSwipe.current = null;

      setSwipeState((prev) => ({
        ...prev,
        isDragging: false,
        isAnimating: false,
      }));
    },
    [isDisabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDisabled || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Determine if this is a horizontal or vertical swipe on first significant movement
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaY) < maxVerticalDistance;
        }
      }

      // If it's a horizontal swipe, prevent default scrolling and update offset
      if (isHorizontalSwipe.current) {
        e.preventDefault();

        // Add resistance at edges
        let adjustedDeltaX = deltaX;
        if (containerWidth > 0) {
          // Add resistance when dragging beyond limits
          const maxDrag = containerWidth;
          if (Math.abs(deltaX) > maxDrag) {
            const excess = Math.abs(deltaX) - maxDrag;
            const resistance = 0.3;
            adjustedDeltaX = (deltaX > 0 ? 1 : -1) * (maxDrag + excess * resistance);
          }
        }

        lastOffsetX.current = adjustedDeltaX;
        setSwipeState({
          isDragging: true,
          offsetX: adjustedDeltaX,
          isAnimating: false,
        });
      }
    },
    [isDisabled, containerWidth, maxVerticalDistance]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      if (isDisabled || touchStartX.current === null || !isHorizontalSwipe.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        isHorizontalSwipe.current = null;
        return;
      }

      const deltaX = lastOffsetX.current;
      const shouldNavigate = Math.abs(deltaX) > Math.max(minSwipeDistance, swipeThreshold);

      if (shouldNavigate) {
        if (deltaX > 0 && onPrevWeek) {
          // Swipe right -> go to previous week
          // Animate to full width before navigation
          setSwipeState({
            isDragging: false,
            offsetX: containerWidth,
            isAnimating: true,
          });
          // Delay navigation to allow animation
          setTimeout(() => {
            onPrevWeek();
          }, 150);
        } else if (deltaX < 0 && onNextWeek) {
          // Swipe left -> go to next week
          setSwipeState({
            isDragging: false,
            offsetX: -containerWidth,
            isAnimating: true,
          });
          setTimeout(() => {
            onNextWeek();
          }, 150);
        } else {
          // Snap back
          setSwipeState({
            isDragging: false,
            offsetX: 0,
            isAnimating: true,
          });
        }
      } else {
        // Snap back to center
        setSwipeState({
          isDragging: false,
          offsetX: 0,
          isAnimating: true,
        });
      }

      touchStartX.current = null;
      touchStartY.current = null;
      lastOffsetX.current = 0;
    },
    [isDisabled, onPrevWeek, onNextWeek, containerWidth, swipeThreshold, minSwipeDistance]
  );

  const getHandlers = useCallback((): TouchHandlers => {
    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const resetSwipeState = useCallback(() => {
    setSwipeState({
      isDragging: false,
      offsetX: 0,
      isAnimating: false,
    });
    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
    lastOffsetX.current = 0;
  }, []);

  return {
    swipeState,
    getHandlers,
    isDragging: swipeState.isDragging,
    offsetX: swipeState.offsetX,
    isAnimating: swipeState.isAnimating,
    resetSwipeState,
  };
}
