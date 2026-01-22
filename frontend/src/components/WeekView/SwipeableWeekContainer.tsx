import { useRef, useEffect, useLayoutEffect, useState, useCallback, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { motion, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
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

const THRESHOLD = 100;

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
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Use motion value for x position
  const x = useMotionValue(-containerWidth);

  // Update x when containerWidth changes
  useEffect(() => {
    if (containerWidth > 0) {
      x.set(-containerWidth);
    }
  }, [containerWidth, x]);

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Reset position when selectedDate changes
  useLayoutEffect(() => {
    if (dateChanged && containerWidth > 0) {
      x.set(-containerWidth);
      startTransition(() => {
        setIsDragging(false);
        setIsAnimating(false);
      });
    }
  }, [selectedDate, dateChanged, containerWidth, x]);

  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const offset = info.offset.x;
      const absOffset = Math.abs(offset);
      const velocity = info.velocity.x;

      // Check threshold or velocity
      if (absOffset >= THRESHOLD || Math.abs(velocity) > 500) {
        setIsAnimating(true);
        if (offset > 0 && onPrevWeek) {
          // Dragged right -> go to previous week
          onPrevWeek();
        } else if (offset < 0 && onNextWeek) {
          // Dragged left -> go to next week
          onNextWeek();
        }
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      } else {
        // Threshold not met, animate back to center
        setIsAnimating(true);
        x.set(-containerWidth);
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      }
    },
    [containerWidth, onPrevWeek, onNextWeek, x]
  );

  // Calculate drag constraints
  const dragConstraints = containerWidth > 0
    ? {
        left: -containerWidth * 2, // Can drag left to show next week
        right: 0, // Can drag right to show previous week
      }
    : undefined;

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
    >
      <motion.div
        className="flex h-full"
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.3}
        dragMomentum={false}
        onDragStart={() => {
          if (!isDisabled) {
            setIsDragging(true);
          }
        }}
        onDragEnd={isDisabled ? undefined : handleDragEnd}
        style={{
          x,
          width: `${containerWidth * 3}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        animate={
          isAnimating
            ? {
                x: -containerWidth,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                },
              }
            : undefined
        }
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
      </motion.div>
    </div>
  );
}
