import { useRef, useEffect, useLayoutEffect, useState, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
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
  activeBlock: _activeBlock,
  children,
  onAllBlocksChange,
}: SwipeableWeekContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);

  const { data: currentBlocks = [], isLoading: isCurrentLoading } = useWeekEvents(selectedDate);
  const { data: prevBlocks = [], isLoading: isPrevLoading } = useWeekEvents(prevWeekDate);
  const { data: nextBlocks = [], isLoading: isNextLoading } = useWeekEvents(nextWeekDate);

  const currentWeekDays = getWeekDays(selectedDate);
  const prevWeekDays = getWeekDays(prevWeekDate);
  const nextWeekDays = getWeekDays(nextWeekDate);

  // Measure container width
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

  // Track previous date to detect changes
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Reset scroll position when selectedDate changes
  useLayoutEffect(() => {
    if (dateChanged && scrollContainerRef.current && containerWidth > 0) {
      // Scroll to current week (middle position)
      scrollContainerRef.current.scrollTo({
        left: containerWidth,
        behavior: 'auto',
      });
      startTransition(() => {
        setIsDragging(false);
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged, containerWidth]);

  // Handle scroll to detect week changes
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || containerWidth === 0) return;

    const handleScroll = () => {
      if (isDragging) return; // Don't trigger during active drag

      const scrollLeft = scrollContainer.scrollLeft;
      const threshold = containerWidth * 0.3; // 30% threshold

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll detection
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (scrollLeft < containerWidth - threshold && onPrevWeek) {
          // Scrolled to previous week
          onPrevWeek();
        } else if (scrollLeft > containerWidth + threshold && onNextWeek) {
          // Scrolled to next week
          onNextWeek();
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerWidth, onPrevWeek, onNextWeek, isDragging]);

  // Touch event handlers for momentum detection
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDisabled) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

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
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      style={{
        touchAction: isDragging ? 'none' : 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={scrollContainerRef}
        className="flex h-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >

        {/* Previous Week */}
        <div
          className="h-full overflow-hidden flex-shrink-0"
          style={{
            width: `${containerWidth}px`,
            scrollSnapAlign: 'start',
          }}
        >
          {children(prevWeekData)}
        </div>

        {/* Current Week */}
        <div
          className="h-full overflow-hidden flex-shrink-0"
          style={{
            width: `${containerWidth}px`,
            scrollSnapAlign: 'center',
          }}
        >
          {children(currentWeekData)}
        </div>

        {/* Next Week */}
        <div
          className="h-full overflow-hidden flex-shrink-0"
          style={{
            width: `${containerWidth}px`,
            scrollSnapAlign: 'end',
          }}
        >
          {children(nextWeekData)}
        </div>
      </div>
    </div>
  );
}
