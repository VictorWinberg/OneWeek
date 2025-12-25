import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';
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
}

export function MobileHourView({ weekDays, blocks, onBlockClick, activeBlock }: MobileHourViewProps) {
  // Calculate position and size for a block in hour view
  const getBlockPosition = (block: Block) => {
    const startHour = block.startTime.getHours();
    const startMinute = block.startTime.getMinutes();
    const endHour = block.endTime.getHours();
    const endMinute = block.endTime.getMinutes();

    const top = (startHour + startMinute / 60) * 50; // 50px per hour
    const duration = endHour - startHour + (endMinute - startMinute) / 60;
    const height = Math.max(duration * 50, 25); // Minimum 25px height

    return { top, height };
  };

  // Check if any day has all-day events
  const hasAllDayEvents = blocks.some((block) => block.allDay);

  return (
    <div className="flex w-full select-none">
      {/* Time column */}
      <div className="sticky left-0 z-20 bg-[var(--color-bg-secondary)] border-r border-[var(--color-bg-tertiary)] w-[35px] flex-shrink-0">
        <div className="sticky top-0 z-30 bg-[var(--color-bg-secondary)] h-[40px] border-b border-[var(--color-bg-tertiary)] flex items-center justify-center px-0.5">
          <span className="text-[8px] font-semibold text-[var(--color-text-secondary)]">Tid</span>
        </div>
        {/* All-day events spacer */}
        {hasAllDayEvents && (
          <div className="sticky top-[40px] z-30 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] h-[20px] flex items-center justify-center px-0.5">
            <span className="text-[6px] text-[var(--color-text-secondary)] text-center">Hela</span>
          </div>
        )}
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

      {/* Day columns */}
      {weekDays.map((date) => {
        const today = isToday(date);
        const dayBlocks = getBlocksForDay(blocks, date).filter((block) => !block.allDay);
        const allDayBlocks = getBlocksForDay(blocks, date).filter((block) => block.allDay);

        return (
          <div
            key={date.toISOString()}
            className={`flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 ${
              today ? 'bg-[var(--color-accent)]/5' : ''
            }`}
            style={{ minWidth: '42px' }}
          >
            {/* Day header */}
            <div
              className={`sticky top-0 z-10 h-[40px] border-b border-[var(--color-bg-tertiary)] flex flex-col items-center justify-center px-0.5 relative bg-[var(--color-bg-secondary)] select-none ${
                today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''
              }`}
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

            {/* All-day events row */}
            {allDayBlocks.length > 0 && (
              <div className="sticky top-[40px] z-10 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] p-0.5 h-[20px] flex flex-col gap-0.5 overflow-hidden">
                {allDayBlocks.map((block) => (
                  <EventCard
                    key={`${block.calendarId}-${block.id}`}
                    block={block}
                    onClick={() => onBlockClick(block)}
                    compact={true}
                    fillHeight={false}
                    draggable={false}
                  />
                ))}
              </div>
            )}

            {/* Hour grid and events */}
            <div className="relative">
              {/* Hour grid lines */}
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <div key={hour} className="h-[50px] border-b border-[var(--color-bg-tertiary)]" />
              ))}

              {/* 15-minute droppable time slots overlay */}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) =>
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
                      <div className="h-[12.5px] cursor-pointer hover:bg-[var(--color-bg-tertiary)]/10 transition-colors pointer-events-auto" />
                    </DroppableTimeSlot>
                  ))
                )}
              </div>

              {/* Events overlay */}
              <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                {dayBlocks.map((block) => {
                  const { top, height } = getBlockPosition(block);
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
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
