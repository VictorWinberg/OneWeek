import { useDroppable } from '@dnd-kit/core';
import { useEffect, useRef } from 'react';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, calculateBlockPosition } from '@/services/calendarNormalizer';
import { calculateNextHourTimeSlot } from '@/utils/timeUtils';
import { EventCard } from '@/components/WeekView/EventCard';
import type { Block } from '@/types';

interface DroppableTimeSlotProps {
  id: string;
  date: Date;
  hour: number;
  minute: number;
  children: React.ReactNode;
  activeBlockDuration?: number; // Duration in milliseconds
}

function DroppableTimeSlot({ id, date, hour, minute, children, activeBlockDuration }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      hour,
      minute,
    },
  });

  // Calculate the height of the outline based on the active block's duration
  const outlineHeight = activeBlockDuration ? Math.max((activeBlockDuration / (1000 * 60 * 60)) * 50, 25) : 0;

  return (
    <div ref={setNodeRef} className="relative">
      {children}
      {/* Show outline of full event when hovering */}
      {isOver && activeBlockDuration && (
        <div
          className="absolute left-0 right-0 border-2 border-[var(--color-accent)] bg-[var(--color-bg-secondary)] rounded pointer-events-none z-10 before:absolute before:inset-0 before:bg-[var(--color-accent)]/10 before:rounded"
          style={{
            top: 0,
            height: `${outlineHeight}px`,
          }}
        />
      )}
    </div>
  );
}

interface MobileHourViewProps {
  weekDays: Date[];
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  activeBlock: Block | null;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

export function MobileHourView({
  weekDays,
  blocks,
  onBlockClick,
  activeBlock,
  onCreateEventForDate,
}: MobileHourViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Disable scrolling when dragging
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (activeBlock) {
      isDraggingRef.current = true;
      // Disable scroll during drag - use important styles to override
      container.style.overflow = 'hidden';
      container.style.touchAction = 'none';

      // Store current scroll position to prevent any scroll drift
      const scrollTop = container.scrollTop;

      // Prevent scroll on the container - be very aggressive
      const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        // Force scroll position to stay fixed
        container.scrollTop = scrollTop;
        return false;
      };

      container.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      container.addEventListener('scroll', preventScroll, { passive: false });
      container.addEventListener('wheel', preventScroll, { passive: false });

      return () => {
        container.removeEventListener('touchmove', preventScroll, true);
        container.removeEventListener('scroll', preventScroll);
        container.removeEventListener('wheel', preventScroll);
        isDraggingRef.current = false;
      };
    } else {
      // Re-enable scroll after drag
      container.style.overflow = 'auto';
      container.style.touchAction = 'pan-y';
    }
  }, [activeBlock]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetScrollPosition = 8 * 50;
      scrollContainerRef.current.scrollTop = targetScrollPosition;
    }
  }, []);

  // Use extracted utility for block positioning (50px per hour, 25px min height)
  const getBlockPositionForView = (block: Block) => calculateBlockPosition(block, 50, 25);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Day Headers Section */}
      <div className="flex flex-shrink-0 w-full bg-[var(--color-bg-secondary)]">
        <div className="w-[35px] flex-shrink-0 border-r border-[var(--color-bg-tertiary)] border-b border-[var(--color-bg-tertiary)] h-[40px] flex items-center justify-center px-0.5">
          <span className="text-[8px] font-semibold text-[var(--color-text-secondary)]">Tid</span>
        </div>
        {weekDays.map((date) => {
          const today = isToday(date);
          return (
            <div
              key={`header-${date.toISOString()}`}
              className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 border-b border-[var(--color-bg-tertiary)] h-[40px] flex flex-col items-center justify-center px-0.5 relative select-none ${
                today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''
              }`}
              style={{ minWidth: '42px' }}
            >
              <div
                className={`text-[7px] uppercase tracking-wide relative ${
                  today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                }`}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {formatDayShort(date).substring(0, 2)}
              </div>
              <div
                className={`text-[11px] font-bold relative ${
                  today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                }`}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day Events Section */}
      <div className="flex flex-shrink-0 w-full bg-[var(--color-bg-secondary)]">
        <div className="w-[35px] flex-shrink-0 border-r border-[var(--color-bg-tertiary)] border-b border-[var(--color-bg-tertiary)] min-h-[24px] flex items-center justify-center px-0.5">
          <span className="text-[6px] text-[var(--color-text-secondary)] text-center leading-none">Hela</span>
        </div>
        {weekDays.map((date) => {
          const allDayBlocks = getBlocksForDay(blocks, date).filter((block) => block.allDay);
          const today = isToday(date);
          return (
            <div
              key={`allday-${date.toISOString()}`}
              className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 border-b border-[var(--color-bg-tertiary)] p-0.5 flex flex-col gap-0.5 min-h-[24px] ${
                today ? 'bg-[var(--color-accent)]/5' : ''
              }`}
              style={{ minWidth: '42px' }}
            >
              {allDayBlocks.map((block) => (
                <EventCard
                  key={`${block.calendarId}-${block.id}`}
                  block={block}
                  onClick={() => onBlockClick(block)}
                  compact={true}
                  fillHeight={false}
                  draggable={false}
                  isAllDay={true}
                  hideTime={true}
                  truncate={true}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Hourly Events Section - Scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex flex-1 w-full overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex w-full">
          {/* Time column */}
          <div
            className="w-[35px] flex-shrink-0 sticky left-0 z-10 bg-[var(--color-bg-secondary)] border-r border-[var(--color-bg-tertiary)]"
            style={{ height: '1200px' }}
          >
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <div
                key={hour}
                className="h-[50px] border-b border-[var(--color-bg-tertiary)] flex items-start justify-end pr-0.5 pt-0.5"
              >
                <span className="text-[7px] text-[var(--color-text-secondary)]">
                  {hour.toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDays.map((date) => {
            const today = isToday(date);
            const dayBlocks = getBlocksForDay(blocks, date).filter((block) => !block.allDay);

            return (
              <div
                key={date.toISOString()}
                className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 relative ${
                  today ? 'bg-[var(--color-accent)]/5' : ''
                }`}
                style={{ minWidth: '42px', height: '1200px' }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div key={hour} className="h-[50px] border-b border-[var(--color-bg-tertiary)]" />
                ))}

                {/* 15-minute droppable time slots overlay */}
                <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) =>
                    [0, 15, 30, 45].map((minute) => {
                      // Create date with the clicked time
                      const clickedDateTime = new Date(date);
                      clickedDateTime.setHours(hour, minute, 0, 0);

                      // Use utility to calculate time slot
                      const { startTime: startTimeStr, endTime: endTimeStr } = calculateNextHourTimeSlot(hour, minute);

                      return (
                        <DroppableTimeSlot
                          key={`${date.toISOString()}-${hour}-${minute}`}
                          id={`${date.toISOString()}-${hour}-${minute}`}
                          date={date}
                          hour={hour}
                          minute={minute}
                          activeBlockDuration={
                            activeBlock ? activeBlock.endTime.getTime() - activeBlock.startTime.getTime() : undefined
                          }
                        >
                          <div
                            className="h-[12.5px] cursor-pointer hover:bg-[var(--color-bg-tertiary)]/10 transition-colors pointer-events-auto"
                            onClick={() =>
                              onCreateEventForDate &&
                              onCreateEventForDate(clickedDateTime, undefined, startTimeStr, endTimeStr)
                            }
                          />
                        </DroppableTimeSlot>
                      );
                    })
                  )}
                </div>

                {/* Events overlay */}
                <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                  {dayBlocks.map((block) => {
                    const { top, height } = getBlockPositionForView(block);
                    return (
                      <div
                        key={`${block.calendarId}-${block.id}`}
                        className="absolute left-0.5 right-0.5 pointer-events-auto"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                      >
                        <EventCard
                          block={block}
                          onClick={() => onBlockClick(block)}
                          compact={true}
                          fillHeight={true}
                          draggable={true}
                          hideTime={true}
                          extraCompact={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
