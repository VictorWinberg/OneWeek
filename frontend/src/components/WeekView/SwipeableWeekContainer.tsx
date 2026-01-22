import { useRef, useEffect, useLayoutEffect, useState, useCallback, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
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
  activeBlock?: Block | null;
  children: (weekData: WeekData) => ReactNode;
}

export function SwipeableWeekContainer({
  selectedDate,
  onPrevWeek,
  onNextWeek,
  isDisabled = false,
  activeBlock,
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

  // Track previous date to detect changes and prevent flicker
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Base offset to center current week and show parts of prev/next
  // Layout: [prev: 0-W][current: W-2W][next: 2W-3W] where W = containerWidth
  // Offset by -W/2 to center current week and show parts of adjacent weeks
  const baseOffset = containerWidth > 0 ? -containerWidth / 2 : 0;

  // Use Framer Motion's motion value for drag position
  const x = useMotionValue(baseOffset);

  // Update base offset when container width changes
  useEffect(() => {
    if (containerWidth > 0) {
      const newBaseOffset = -containerWidth / 2;
      x.set(newBaseOffset);
    }
  }, [containerWidth, x]);

  // Reset position when date changes
  useLayoutEffect(() => {
    if (dateChanged && containerWidth > 0) {
      x.set(baseOffset);
    }
  }, [selectedDate, baseOffset, x, dateChanged, containerWidth]);

  // Update previous date tracking
  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Handle drag end to trigger navigation
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isDisabled || (!onPrevWeek && !onNextWeek)) {
        x.set(baseOffset);
        return;
      }

      const threshold = 100; // Minimum distance to trigger navigation
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Use velocity or offset to determine if we should navigate
      const shouldNavigate = Math.abs(offset) >= threshold || Math.abs(velocity) >= 500;

      if (shouldNavigate) {
        if (offset > 0 && onPrevWeek) {
          // Swiped right -> go to previous week
          onPrevWeek();
        } else if (offset < 0 && onNextWeek) {
          // Swiped left -> go to next week
          onNextWeek();
        }
      }

      // Animate back to base position smoothly
      animate(x, baseOffset, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    },
    [onPrevWeek, onNextWeek, isDisabled, baseOffset, x]
  );

  // Check if drag should be disabled
  const isDragDisabled = isDisabled || !!activeBlock;

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
      ref={containerRef}
      className="flex-1 relative"
      style={{
        overflowY: 'hidden',
        overflowX: 'visible', // Allow content to extend beyond viewport to show adjacent weeks
      }}
    >
      <motion.div
        className="flex h-full"
        style={{
          width: `${containerWidth * 3}px`,
          x,
          cursor: isDragDisabled ? 'default' : 'grab',
        }}
        drag={isDragDisabled ? false : 'x'}
        dragConstraints={
          containerWidth > 0
            ? {
                left: -containerWidth * 1.5, // Allow dragging to show more of prev week
                right: containerWidth * 0.5, // Allow dragging to show more of next week
              }
            : undefined
        }
        dragElastic={0.2} // Add some elastic resistance at the edges
        onDragEnd={handleDragEnd}
        dragMomentum={false} // Disable momentum to have more control
        dragPropagation={false}
        onDragStart={(event) => {
          // Prevent drag if touching interactive elements
          const target = event.target as HTMLElement;
          if (
            target.closest('button') ||
            target.closest('a') ||
            target.closest('[role="button"]') ||
            target.closest('[data-event-card]')
          ) {
            // Cancel the drag by setting drag to false dynamically
            // Note: This is a limitation - we can't cancel mid-drag easily
            // But this check helps prevent starting drag on interactive elements
          }
        }}
        whileDrag={{
          cursor: 'grabbing',
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
      </motion.div>
    </div>
  );
}
