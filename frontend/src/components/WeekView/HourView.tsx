import { useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, calculateBlockPosition } from '@/services/calendarNormalizer';
import { calculateNextHourTimeSlot } from '@/utils/timeUtils';
import { EventCard } from '@/components/WeekView/EventCard';
import { DesktopView } from '@/components/WeekView/DesktopView';
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
  const outlineHeight = activeBlockDuration ? Math.max((activeBlockDuration / (1000 * 60 * 60)) * 60, 30) : 0;

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

// Generate hours array (0-23)
const hours = Array.from({ length: 24 }, (_, i) => i);

interface HourViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
}

export function HourView({ onBlockClick, onCreateEventForDate, onNextWeek, onPrevWeek, onGoToToday }: HourViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Auto-scroll to hour 8 (8am) on mount
  useEffect(() => {
    if (scrollContainerRef.current && !hasScrolledRef.current) {
      // Calculate position for hour 8: 8 hours * 60px per hour = 480px
      const targetScrollPosition = 8 * 60;
      scrollContainerRef.current.scrollTop = targetScrollPosition;
      hasScrolledRef.current = true;
    }
  }, []);

  // Handle click on empty time slot to create event
  const handleEmptySpaceClick = (date: Date, hour: number, minute: number) => {
    const { startTime, endTime } = calculateNextHourTimeSlot(hour, minute);
    if (onCreateEventForDate) {
      onCreateEventForDate(date, undefined, startTime, endTime);
    }
  };

  // Use extracted utility for block positioning (60px per hour, 30px min height)
  const getBlockPositionForView = (block: Block) => calculateBlockPosition(block, 60, 30);

  return (
    <DesktopView
      onBlockClick={onBlockClick}
      onCreateEventForDate={onCreateEventForDate}
      onNextWeek={onNextWeek}
      onPrevWeek={onPrevWeek}
      onGoToToday={onGoToToday}
      dragOverlayProps={{ hideTime: true }}
      contentClassName="flex-1 flex flex-col overflow-hidden min-h-0"
    >
      {({ blocks, weekDays, activeBlock, onBlockClick }) => (
        <>
          {/* Day Headers Section */}
          <div className="flex flex-shrink-0 bg-[var(--color-bg-secondary)] overflow-x-auto">
            <div className="w-[80px] flex-shrink-0 border-r border-[var(--color-bg-tertiary)] border-b border-[var(--color-bg-tertiary)] flex items-center justify-center h-[60px] px-4">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Tid</span>
            </div>
            {weekDays.map((date) => {
              const today = isToday(date);
              return (
                <div
                  key={`header-${date.toISOString()}`}
                  className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 border-b border-[var(--color-bg-tertiary)] flex flex-col items-center justify-center h-[60px] min-w-[80px] relative ${
                    today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''
                  }`}
                >
                  <div
                    className={`uppercase tracking-wide text-xs relative ${
                      today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {formatDayShort(date)}
                  </div>
                  <div
                    className={`font-bold text-lg relative ${
                      today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day Events Section */}
          <div className="flex flex-shrink-0 bg-[var(--color-bg-secondary)] overflow-x-auto">
            <div className="w-[80px] flex-shrink-0 border-r border-[var(--color-bg-tertiary)] border-b border-[var(--color-bg-tertiary)] min-h-[40px] flex items-center justify-center px-2">
              <span className="text-[10px] text-[var(--color-text-secondary)] text-center">Heldag</span>
            </div>
            {weekDays.map((date) => {
              const allDayBlocks = getBlocksForDay(blocks, date).filter((block) => block.allDay);
              const today = isToday(date);
              return (
                <div
                  key={`allday-${date.toISOString()}`}
                  className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 border-b border-[var(--color-bg-tertiary)] p-1 min-h-[40px] flex flex-col gap-1 min-w-[80px] ${
                    today ? 'bg-[var(--color-accent)]/5' : ''
                  }`}
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
          <div ref={scrollContainerRef} className="flex-1 overflow-auto">
            <div className="flex min-w-max">
              {/* Time column */}
              <div className="w-[80px] flex-shrink-0 sticky left-0 z-10 bg-[var(--color-bg-secondary)] border-r border-[var(--color-bg-tertiary)]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-[var(--color-bg-tertiary)] flex items-start justify-end pt-1 h-[60px] pr-2"
                  >
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {hour.toString().padStart(2, '0')}:00
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
                    className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 min-w-[80px] relative ${
                      today ? 'bg-[var(--color-accent)]/5' : ''
                    }`}
                  >
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div key={hour} className="h-[60px] border-b border-[var(--color-bg-tertiary)]" />
                    ))}

                    {/* 15-minute droppable time slots overlay */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                      {hours.map((hour) =>
                        [0, 15, 30, 45].map((minute) => (
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
                              className="h-[15px] cursor-pointer hover:bg-[var(--color-bg-tertiary)]/10 transition-colors pointer-events-auto"
                              onClick={() => handleEmptySpaceClick(date, hour, minute)}
                            />
                          </DroppableTimeSlot>
                        ))
                      )}
                    </div>

                    {/* Events overlay */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                      {dayBlocks.map((block) => {
                        const { top, height } = getBlockPositionForView(block);
                        return (
                          <div
                            key={`${block.calendarId}-${block.id}`}
                            className="absolute pointer-events-auto left-1 right-1"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                          >
                            <EventCard
                              block={block}
                              onClick={() => onBlockClick(block)}
                              compact={false}
                              fillHeight={true}
                              draggable={true}
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
        </>
      )}
    </DesktopView>
  );
}
