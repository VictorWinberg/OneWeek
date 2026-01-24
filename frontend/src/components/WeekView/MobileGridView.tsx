import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday, findCurrentTimeIndex } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
import { useAppContext } from '@/contexts/AppContext';
import { CurrentTimeIndicator } from '@/components/WeekView/CurrentTimeIndicator';
import type { Block } from '@/types';

interface DroppableGridDayProps {
  date: Date;
  dayBlocks: Block[];
  isCurrentDay: boolean;
}

function DroppableGridDay({
  date,
  dayBlocks,
  isCurrentDay,
}: DroppableGridDayProps) {
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
        rounded-lg border overflow-hidden cursor-pointer transition-all
        ${
          isCurrentDay
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]'
        }
        ${isOver ? 'ring-2 ring-[var(--color-accent)]' : 'hover:border-[var(--color-text-secondary)]/30'}
      `}
    >
      {/* Day Header */}
      <div
        className={`
          px-3 py-2 text-center border-b
          ${
            isCurrentDay
              ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
              : 'bg-[var(--color-bg-tertiary)] border-[var(--color-bg-tertiary)]'
          }
        `}
      >
        <div className="flex items-center justify-center gap-2">
          <div
            className={`text-sm font-bold ${
              isCurrentDay ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
            }`}
          >
            {formatDayShort(date)}
          </div>
          {isCurrentDay && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {date.getDate()}/{date.getMonth() + 1}
        </div>
      </div>

      {/* Events */}
      <div className="p-2 min-h-[120px] max-h-[200px] overflow-y-auto">
        <div className="space-y-2">
          {dayBlocks.length === 0 ? (
            <>
              {isCurrentDay && <CurrentTimeIndicator date={date} variant="inline" />}
              <p className="text-center text-[var(--color-text-secondary)] text-xs py-8 opacity-60">Inga events</p>
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
                  {isCurrentDay && currentTimeIndex === index && (
                    <CurrentTimeIndicator date={date} variant="inline" />
                  )}
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
    </div>
  );
}

interface MobileGridViewProps {
  weekDays: Date[];
  blocks: Block[];
}

export function MobileGridView({ weekDays, blocks }: MobileGridViewProps) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="grid grid-cols-2 gap-2 p-2">
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
        {/* Empty cell for 8th position if needed */}
        {weekDays.length % 2 !== 0 && (
          <div className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/50" />
        )}
      </div>
    </div>
  );
}
