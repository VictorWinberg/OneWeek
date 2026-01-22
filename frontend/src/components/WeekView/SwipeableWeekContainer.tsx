import { useRef, useEffect, useLayoutEffect, useState, useCallback, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useWeekEvents } from '@/hooks/useCalendarQueries';
import { getWeekDays } from '@/utils/dateUtils';
import type { Block } from '@/types';

interface WeekData {
  weekDays: Date[];
  blocks: Block[];
  isLoading: boolean;
}

interface SwipeableWeekContainerProps {
  selectedDate: Date;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isDisabled?: boolean;
  children: (weekData: WeekData) => ReactNode;
}

export function SwipeableWeekContainer({
  selectedDate,
  onPrevWeek,
  onNextWeek,
  isDisabled = false,
  children,
}: SwipeableWeekContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate adjacent week dates
  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);

  // Fetch events for all three weeks
  const { data: currentBlocks = [], isLoading: isCurrentLoading } = useWeekEvents(selectedDate);
  const { data: prevBlocks = [], isLoading: isPrevLoading } = useWeekEvents(prevWeekDate);
  const { data: nextBlocks = [], isLoading: isNextLoading } = useWeekEvents(nextWeekDate);

  // Get week days for all three weeks
  const currentWeekDays = getWeekDays(selectedDate);
  const prevWeekDays = getWeekDays(prevWeekDate);
  const nextWeekDays = getWeekDays(nextWeekDate);

  // Measure container width for swipe calculations
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const {
    swipeState,
    isDragging,
    isAnimating,
    resetSwipeState,
    containerRef: swipeContainerRef,
  } = useSwipeNavigation({
    onPrevWeek,
    onNextWeek,
    isDisabled,
    containerWidth,
  });

  // Combine refs: both containerRef (for width measurement) and swipeContainerRef (for touch events)
  const combinedRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      swipeContainerRef(element);
    },
    [swipeContainerRef]
  );

  // Track previous date to detect changes and prevent flicker
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);

  // Detect if date changed - if so, ignore swipe offset to prevent flicker
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Reset swipe state when selectedDate changes (after navigation completes)
  // This prevents flickering when the date changes after a swipe
  // Using useLayoutEffect to update synchronously before paint to prevent flicker
  useLayoutEffect(() => {
    if (dateChanged) {
      // Date has changed - reset swipe state immediately to prevent flicker
      // The date change means navigation completed, so we should show the new week centered
      resetSwipeState();
    }
  }, [selectedDate, resetSwipeState, dateChanged]);

  // Update previous date tracking after layout effect completes
  // Separated to avoid lint warning about setState in useLayoutEffect
  // Using startTransition to mark this as a non-urgent update
  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Calculate transform offset to show current week centered with parts of prev/next visible
  // Layout: [prev: 0-W][current: W-2W][next: 2W-3W] where W = containerWidth
  // Viewport: [0 to W]
  // To center current week and show equal parts of prev/next, offset by -W/2:
  // - Container x=W/2 maps to viewport x=0 → shows right half of prev
  // - Container x=W maps to viewport x=W/2 → current week starts at viewport center
  // - Container x=2W maps to viewport x=3W/2 → current week extends beyond viewport
  // - Container x=3W/2 maps to viewport x=W → shows left half of next week
  // With overflow-x: visible, the parts extending beyond viewport will be visible
  const baseOffset = containerWidth > 0 ? -containerWidth / 2 : 0; // Center current week, show parts of prev/next
  // If date changed, ignore swipe offset to prevent flicker during the transition
  // Only ignore if we're not currently dragging (to allow smooth swipe animation)
  const effectiveOffsetX = dateChanged && !isDragging && !isAnimating ? 0 : swipeState.offsetX;
  const transformX = baseOffset + effectiveOffsetX;

  // Prepare week data for each position
  const prevWeekData: WeekData = {
    weekDays: prevWeekDays,
    blocks: prevBlocks,
    isLoading: isPrevLoading,
  };

  const currentWeekData: WeekData = {
    weekDays: currentWeekDays,
    blocks: currentBlocks,
    isLoading: isCurrentLoading,
  };

  const nextWeekData: WeekData = {
    weekDays: nextWeekDays,
    blocks: nextBlocks,
    isLoading: isNextLoading,
  };

  return (
    <div
      ref={combinedRef}
      className="flex-1 relative"
      style={{
        touchAction: isDragging ? 'none' : 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
        overflowY: 'hidden',
        overflowX: 'visible', // Allow content to extend beyond viewport to show adjacent weeks
      }}
    >
      <div
        className="flex h-full"
        style={{
          width: `${containerWidth * 3}px`,
          transform: `translateX(${transformX}px)`,
          transition: isAnimating ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {/* Previous Week */}
        <div
          className="h-full overflow-hidden"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(prevWeekData)}
        </div>

        {/* Current Week */}
        <div
          className="h-full overflow-hidden"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(currentWeekData)}
        </div>

        {/* Next Week */}
        <div
          className="h-full overflow-hidden"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(nextWeekData)}
        </div>
      </div>
    </div>
  );
}
