import { useRef, useEffect, useLayoutEffect, useState, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { useSpring, animated, config as springConfig } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
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

  // Base offset for current week position
  const baseOffset = -containerWidth;

  // Spring animation for x position
  const [{ x }, api] = useSpring(() => ({
    x: baseOffset,
    config: {
      ...springConfig.gentle,
      tension: 300,
      friction: 30,
    },
  }));

  // Update spring when containerWidth changes
  useEffect(() => {
    if (containerWidth > 0) {
      api.start({ x: baseOffset, immediate: true });
    }
  }, [containerWidth, api, baseOffset]);

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Reset position when selectedDate changes
  useLayoutEffect(() => {
    if (dateChanged && containerWidth > 0) {
      api.start({ x: baseOffset, immediate: true });
      startTransition(() => {
        setIsDragging(false);
      });
    }
  }, [selectedDate, dateChanged, containerWidth, api, baseOffset]);

  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Drag gesture handler
  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], cancel }) => {
      if (isDisabled) {
        cancel();
        return;
      }

      setIsDragging(down);

      if (down) {
        // During drag: follow finger with immediate updates
        const newX = baseOffset + mx;
        // Apply rubber-band effect for over-scrolling
        const minX = baseOffset * 2;
        const maxX = 0;
        let constrainedX = newX;

        if (newX > maxX) {
          const excess = newX - maxX;
          constrainedX = maxX + excess * 0.3; // Rubber-band resistance
        } else if (newX < minX) {
          const excess = minX - newX;
          constrainedX = minX - excess * 0.3;
        }

        api.start({
          x: constrainedX,
          immediate: true,
        });
      } else {
        // On release: check threshold or velocity
        const absMovement = Math.abs(mx);
        const absVelocity = Math.abs(vx);

        if (absMovement >= THRESHOLD || absVelocity > 0.5) {
          // Threshold met or fast swipe - navigate
          if (mx > 0 && onPrevWeek) {
            // Dragged right -> go to previous week
            onPrevWeek();
          } else if (mx < 0 && onNextWeek) {
            // Dragged left -> go to next week
            onNextWeek();
          }
          // Spring will animate to new position after date change
        } else {
          // Threshold not met - snap back to center
          api.start({
            x: baseOffset,
            config: {
              tension: 300,
              friction: 30,
            },
          });
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
    }
  );

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
      <animated.div
        {...bind()}
        className="flex h-full"
        style={{
          x,
          width: `${containerWidth * 3}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
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
      </animated.div>
    </div>
  );
}
