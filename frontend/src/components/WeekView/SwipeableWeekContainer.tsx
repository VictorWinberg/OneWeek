import { useRef, useEffect, useLayoutEffect, useState, useCallback, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
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

  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);

  const { data: currentBlocks = [], isLoading: isCurrentLoading } = useWeekEvents(selectedDate);
  const { data: prevBlocks = [], isLoading: isPrevLoading } = useWeekEvents(prevWeekDate);
  const { data: nextBlocks = [], isLoading: isNextLoading } = useWeekEvents(nextWeekDate);

  const currentWeekDays = getWeekDays(selectedDate);
  const prevWeekDays = getWeekDays(prevWeekDate);
  const nextWeekDays = getWeekDays(nextWeekDate);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();

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
      window.addEventListener('resize', updateWidth);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateWidth);
      };
    }
  }, []);

  const prevBlocksRef = useRef<string>('');
  useEffect(() => {
    if (onAllBlocksChange) {
      const allBlocks = [...prevBlocks, ...currentBlocks, ...nextBlocks];
      const blocksKey = `${prevBlocks.length}-${currentBlocks.length}-${nextBlocks.length}`;
      if (prevBlocksRef.current !== blocksKey) {
        prevBlocksRef.current = blocksKey;
        onAllBlocksChange(allBlocks);
      }
    }
  }, [prevBlocks, currentBlocks, nextBlocks, onAllBlocksChange]);

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
    activeBlock,
  });

  const combinedRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      swipeContainerRef(element);
    },
    [swipeContainerRef]
  );

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldTransitionRef = useRef(false);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();
  const dateChangeDirectionRef = useRef<'prev' | 'next' | null>(null);

  // Determine navigation direction by comparing dates
  useEffect(() => {
    if (dateChanged && prevSelectedDate.getTime() !== 0) {
      const timeDiff = selectedDate.getTime() - prevSelectedDate.getTime();
      dateChangeDirectionRef.current = timeDiff > 0 ? 'next' : 'prev';
    }
  }, [selectedDate, prevSelectedDate, dateChanged]);

  // Track when we should start transitioning
  useLayoutEffect(() => {
    if (dateChanged && !isDragging && !isAnimating) {
      shouldTransitionRef.current = true;
    }
  }, [selectedDate, dateChanged, isDragging, isAnimating]);

  // Apply transition state update in a separate effect to avoid lint warning
  useEffect(() => {
    // Clear any pending transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (shouldTransitionRef.current && dateChanged && !isDragging && !isAnimating) {
      shouldTransitionRef.current = false;
      // Set transitioning state for smooth animation
      // Use flushSync for synchronous DOM updates needed for animations
      flushSync(() => {
        setIsTransitioning(true);
      });
      // Reset swipe state after animation completes
      transitionTimeoutRef.current = setTimeout(() => {
        resetSwipeState();
        setIsTransitioning(false);
        setPrevSelectedDate(selectedDate);
        dateChangeDirectionRef.current = null;
        transitionTimeoutRef.current = null;
      }, 300);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [selectedDate, resetSwipeState, dateChanged, isDragging, isAnimating]);

  const baseOffset = -containerWidth;
  // During transition, animate to center (offset 0), otherwise use swipe offset
  const effectiveOffsetX = isTransitioning ? 0 : swipeState.offsetX;
  const transformX = baseOffset + effectiveOffsetX;
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
          transition: isAnimating || isTransitioning ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: isDragging || isTransitioning ? 'transform' : 'auto',
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
