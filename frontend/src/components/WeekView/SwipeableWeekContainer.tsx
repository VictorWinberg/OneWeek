import { useRef, useEffect, useState, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { useWeekEvents } from '@/hooks/useCalendarQueries';
import { getWeekDays } from '@/utils/dateUtils';
import type { Block } from '@/types';

// Import Swiper styles
// @ts-expect-error - CSS import
import 'swiper/css';

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
  const swiperRef = useRef<SwiperType | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);

  const { data: currentBlocks = [], isLoading: isCurrentLoading } = useWeekEvents(selectedDate);
  const { data: prevBlocks = [], isLoading: isPrevLoading } = useWeekEvents(prevWeekDate);
  const { data: nextBlocks = [], isLoading: isNextLoading } = useWeekEvents(nextWeekDate);

  const currentWeekDays = getWeekDays(selectedDate);
  const prevWeekDays = getWeekDays(prevWeekDate);
  const nextWeekDays = getWeekDays(nextWeekDate);

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

  // Reset Swiper position when selectedDate changes
  useEffect(() => {
    if (dateChanged && swiperRef.current) {
      // Swiper uses 0-indexed slides: [0: prev, 1: current, 2: next]
      // We want to show slide 1 (current week) when date changes
      swiperRef.current.slideTo(1, 0); // 0ms transition for instant update
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Handle slide change
  const handleSlideChange = (swiper: SwiperType) => {
    const activeIndex = swiper.activeIndex;

    // Swiper slides: [0: prev, 1: current, 2: next]
    if (activeIndex === 0 && onPrevWeek) {
      // Swiped to previous week slide -> navigate to previous week
      onPrevWeek();
    } else if (activeIndex === 2 && onNextWeek) {
      // Swiped to next week slide -> navigate to next week
      onNextWeek();
    }
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
      className="flex-1 overflow-hidden relative"
      style={{
        touchAction: isDragging ? 'none' : 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
      }}
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          // Initialize to show current week (slide index 1)
          swiper.slideTo(1, 0);
        }}
        onSlideChange={handleSlideChange}
        onTouchStart={() => {
          if (!isDisabled) {
            setIsDragging(true);
          }
        }}
        onTouchEnd={() => {
          setIsDragging(false);
        }}
        slidesPerView={1}
        spaceBetween={0}
        resistance={true}
        resistanceRatio={0.3}
        allowTouchMove={!isDisabled}
        speed={300}
        className="h-full"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {/* Previous Week */}
        <SwiperSlide>
          <div className="h-full overflow-hidden">{children(prevWeekData)}</div>
        </SwiperSlide>

        {/* Current Week */}
        <SwiperSlide>
          <div className="h-full overflow-hidden">{children(currentWeekData)}</div>
        </SwiperSlide>

        {/* Next Week */}
        <SwiperSlide>
          <div className="h-full overflow-hidden">{children(nextWeekData)}</div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}
