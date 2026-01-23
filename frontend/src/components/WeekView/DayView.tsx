import { useDroppable } from '@dnd-kit/core';
import { isToday, formatDayShort, formatDayNumber } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
import type { DesktopViewRenderProps } from '@/components/WeekView/DesktopView';
import type { Block } from '@/types';

interface DroppableDayEventsProps {
  date: Date;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

function DroppableDayEvents({ date, blocks, onBlockClick, onCreateEventForDate }: DroppableDayEventsProps) {
  const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date).filter((b) => !b.allDay));
  const today = isToday(date);

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[80px] p-2 space-y-2 overflow-y-auto cursor-pointer border-r border-[var(--color-bg-tertiary)] last:border-r-0
        ${today ? 'bg-[var(--color-bg-tertiary)]/30' : ''}
        ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-inset' : 'hover:bg-[var(--color-bg-tertiary)]/20'}
        transition-colors
      `}
      onClick={() => onCreateEventForDate?.(date)}
    >
      {dayBlocks.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm opacity-50 pointer-events-none">
          —
        </div>
      ) : (
        dayBlocks.map((block) => (
          <EventCard
            key={`${block.calendarId}-${block.id}`}
            block={block}
            onClick={() => onBlockClick(block)}
            compact={false}
            draggable={true}
          />
        ))
      )}
    </div>
  );
}

export type DayViewProps = DesktopViewRenderProps;

export function DayView({ blocks, weekDays, onBlockClick, onCreateEventForDate }: DayViewProps) {
  return (
    <>
      {/* Day Headers */}
      <div className="flex border-b border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]">
        {weekDays.map((date) => {
          const today = isToday(date);
          return (
            <div
              key={`header-${date.toISOString()}`}
              className={`
                flex-1 p-3 text-center border-r border-[var(--color-bg-tertiary)] last:border-r-0 min-w-[80px] relative
                ${today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''}
              `}
            >
              <div className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)] relative">
                {formatDayShort(date)}
              </div>
              <div
                className={`
                  text-2xl font-bold mt-1 relative
                  ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}
                `}
              >
                {formatDayNumber(date)}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events section - always visible */}
      <div className="flex border-b border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]">
        {weekDays.map((date) => {
          const allDayBlocks = getBlocksForDay(blocks, date).filter((b) => b.allDay);
          const today = isToday(date);

          return (
            <div
              key={`allday-${date.toISOString()}`}
              className={`
                flex-1 border-r border-[var(--color-bg-tertiary)] last:border-r-0 p-2 space-y-1 min-w-[80px] min-h-[60px]
                ${today ? 'bg-[var(--color-accent)]/5' : ''}
              `}
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
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Timed events section */}
      <div className="flex-1 flex overflow-x-auto">
        {weekDays.map((date) => (
          <DroppableDayEvents
            key={date.toISOString()}
            date={date}
            blocks={blocks}
            onBlockClick={onBlockClick}
            onCreateEventForDate={onCreateEventForDate}
          />
        ))}
      </div>
    </>
  );
}
