import { useRef, useEffect, useLayoutEffect, useState, useCallback, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useWeekEvents } from '@/hooks/useCalendarQueries';
import { getWeekDays } from '@/utils/dateUtils';
import type { Block } from '@/types';

interface WeekData {
  date: Date;
  weekDays: Date[];
  blocks: Block[];
  isLoading: boolean;
}

interface SwipeableWeekContainerProps {
  selectedDate: Date;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isDisabled?: boolean;
  activeBlock?: Block | null;
  children: (weekData: WeekData) => ReactNode;
  onAllBlocksChange?: (blocks: Block[]) => void;
}

export function SwipeableWeekContainer({
  selectedDate,
  onPrevWeek,
  onNextWeek,
  isDisabled = false,
  activeBlock,
  children,
  onAllBlocksChange,
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
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    // Measure immediately
    updateWidth();

    // Use ResizeObserver for more reliable width detection
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      });

      resizeObserver.observe(containerRef.current);

      // Fallback to window resize
      window.addEventListener('resize', updateWidth);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateWidth);
      };
    }
  }, []);

  // Merge all blocks and notify parent when they change
  useEffect(() => {
    if (onAllBlocksChange) {
      const allBlocks = [...prevBlocks, ...currentBlocks, ...nextBlocks];
      onAllBlocksChange(allBlocks);
    }
  }, [prevBlocks, currentBlocks, nextBlocks, onAllBlocksChange]);

  const {
    swipeState,
    isDragging,
    isAnimating,
    resetSwipeState,
    containerRef: swipeContainerRef,
    getContainerProps,
  } = useSwipeNavigation({
    onPrevWeek,
    onNextWeek,
    isDisabled,
    containerWidth,
    activeBlock,
  });

  // Get touch event handlers from hook
  const swipeProps = getContainerProps();

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

  // Calculate transform offset
  // The weeks are laid out as: [prev][current][next]
  // Default position shows current week (translateX = -100%)
  // When dragging right (positive offset), we reveal prev week
  // When dragging left (negative offset), we reveal next week
  const baseOffset = -containerWidth; // Start at current week (-100%)
  // If date changed, ignore swipe offset to prevent flicker during the transition
  // Only ignore if we're not currently dragging (to allow smooth swipe animation)
  const effectiveOffsetX = dateChanged && !isDragging && !isAnimating ? 0 : swipeState.offsetX;
  const transformX = baseOffset + effectiveOffsetX;

  // Prepare week data for each position
  const prevWeekData: WeekData = {
    date: prevWeekDate,
    weekDays: prevWeekDays,
    blocks: prevBlocks,
    isLoading: isPrevLoading,
  };

  const currentWeekData: WeekData = {
    date: selectedDate,
    weekDays: currentWeekDays,
    blocks: currentBlocks,
    isLoading: isCurrentLoading,
  };

  const nextWeekData: WeekData = {
    date: nextWeekDate,
    weekDays: nextWeekDays,
    blocks: nextBlocks,
    isLoading: isNextLoading,
  };

  return (
    <div
      ref={combinedRef}
      className="h-full overflow-hidden relative"
      onTouchStart={swipeProps.onTouchStart}
      onTouchMove={swipeProps.onTouchMove}
      onTouchEnd={swipeProps.onTouchEnd}
      style={{
        touchAction: isDragging ? 'none' : 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
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
          className="h-full overflow-hidden flex flex-col"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(prevWeekData)}
        </div>

        {/* Current Week */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(currentWeekData)}
        </div>

        {/* Next Week */}
        <div
          className="h-full overflow-hidden flex flex-col"
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
