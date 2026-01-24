import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday, findCurrentTimeIndex } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
import { useAppContext } from '@/contexts/AppContext';
import { CurrentTimeIndicator } from '@/components/WeekView/CurrentTimeIndicator';
import type { DesktopViewRenderProps } from '@/components/WeekView/DesktopView';
import type { Block } from '@/types';

interface DroppableGridDayProps {
  date: Date;
  dayBlocks: Block[];
  isCurrentDay: boolean;
}

function DroppableGridDay({ date, dayBlocks, isCurrentDay }: DroppableGridDayProps) {
  const { onEmptyClick } = useAppContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-day-${date.toISOString()}`,
    data: { date },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on an event card
    if ((e.target as HTMLElement).closest('[data-event-card]')) {
      return;
    }
    // Trigger for any click on the day (header or empty space)
    onEmptyClick(date);
  };

  // Find where to insert the current time indicator (only for timed events)
  const timedBlocks = dayBlocks.filter((b) => !b.allDay);
  const currentTimeIndex = findCurrentTimeIndex(date, timedBlocks, isCurrentDay);

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`
        flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all
        ${
          isCurrentDay
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]'
        }
        ${isOver ? 'ring-2 ring-[var(--color-accent)] scale-[1.02]' : 'hover:border-[var(--color-text-secondary)]/30'}
      `}
    >
      {/* Day Header */}
      <div
        className={`
          px-3 py-3 text-center border-b flex-shrink-0
          ${
            isCurrentDay
              ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30'
              : 'bg-[var(--color-bg-tertiary)]/50 border-[var(--color-bg-tertiary)]'
          }
        `}
      >
        <div className="flex items-center justify-center gap-2">
          <div
            className={`text-sm font-semibold uppercase tracking-wide ${
              isCurrentDay ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {formatDayShort(date)}
          </div>
          {isCurrentDay && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />}
        </div>
        <div
          className={`text-2xl font-bold mt-1 ${
            isCurrentDay ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {date.getDate()}
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {dayBlocks.length === 0 ? (
          <>
            {isCurrentDay && <CurrentTimeIndicator date={date} variant="inline" />}
            <div className="empty-space flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm opacity-50">
              Inga events
            </div>
          </>
        ) : (
          <>
            {/* All-day events first */}
            {dayBlocks
              .filter((b) => b.allDay)
              .map((block) => (
                <EventCard
                  key={`${block.calendarId}-${block.id}`}
                  block={block}
                  compact={true}
                  draggable={true}
                />
              ))}
            {/* Timed events with indicator inserted at appropriate position */}
            {timedBlocks.map((block, index) => (
              <div key={`${block.calendarId}-${block.id}`}>
                {isCurrentDay && currentTimeIndex === index && <CurrentTimeIndicator date={date} variant="inline" />}
                <EventCard
                  block={block}
                  compact={true}
                  draggable={true}
                />
              </div>
            ))}
            {/* Current time indicator after all timed events if needed */}
            {isCurrentDay && timedBlocks.length > 0 && currentTimeIndex === -1 && (
              <CurrentTimeIndicator date={date} variant="inline" />
            )}
            {/* Show indicator even if no timed events */}
            {isCurrentDay && timedBlocks.length === 0 && <CurrentTimeIndicator date={date} variant="inline" />}
          </>
        )}
      </div>
    </div>
  );
}

export type GridViewProps = DesktopViewRenderProps;

export function GridView({ blocks, weekDays }: GridViewProps) {
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-3 h-full">
      {weekDays.map((date) => {
        const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date));
        const isCurrentDay = isToday(date);

        return (
          <DroppableGridDay
            key={date.toISOString()}
            date={date}
            dayBlocks={dayBlocks}
            isCurrentDay={isCurrentDay}
          />
        );
      })}
      {/* Empty cell for 8th position */}
      <div className="rounded-xl border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/30" />
    </div>
  );
}
