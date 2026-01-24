import { useDroppable } from '@dnd-kit/core';
import { formatDayHeader, isToday, findCurrentTimeIndex } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
import { useAppContext } from '@/contexts/AppContext';
import { CurrentTimeIndicator } from '@/components/WeekView/CurrentTimeIndicator';
import type { Block } from '@/types';

interface DroppableDaySectionProps {
  date: Date;
  title: string;
  blocks: Block[];
  isToday: boolean;
}

function DroppableDaySection({
  date,
  title,
  blocks,
  isToday,
}: DroppableDaySectionProps) {
  const { onEmptyClick } = useAppContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `day-section-${date.toISOString()}`,
    data: { date },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on an event card
    if ((e.target as HTMLElement).closest('[data-event-card]')) {
      return;
    }
    // Trigger for any click on the day section (header or empty space)
    onEmptyClick(date);
  };

  // Find where to insert the current time indicator (only for timed events)
  const timedBlocks = blocks.filter((b) => !b.allDay);
  const currentTimeIndex = findCurrentTimeIndex(date, timedBlocks, isToday);

  return (
    <section
      ref={setNodeRef}
      onClick={handleClick}
      className={`
        border-b border-[var(--color-bg-tertiary)] last:border-b-0 cursor-pointer
        ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-inset' : ''}
      `}
    >
      <header
        className={`
          sticky top-0 z-10 px-4 py-3
          ${isToday ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'}
        `}
      >
        <div className="flex items-center gap-2">
          <h2
            className={`
              text-base font-bold
              ${isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}
            `}
          >
            {title}
          </h2>
          {isToday && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />}
        </div>
      </header>

      <div className="p-4 min-h-[100px]">
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <>
              {isToday && <CurrentTimeIndicator date={date} variant="inline" />}
              <p className="text-center text-[var(--color-text-secondary)] py-8 opacity-60">Inga events</p>
            </>
          ) : (
            <>
              {/* All-day events first */}
              {blocks
                .filter((b) => b.allDay)
                .map((block) => (
                  <EventCard
                    key={`${block.calendarId}-${block.id}`}
                    block={block}
                    draggable={true}
                  />
                ))}
              {/* Timed events with indicator inserted at appropriate position */}
              {timedBlocks.map((block, index) => (
                <div key={`${block.calendarId}-${block.id}`}>
                  {isToday && currentTimeIndex === index && <CurrentTimeIndicator date={date} variant="inline" />}
                  <EventCard
                    block={block}
                    draggable={true}
                  />
                </div>
              ))}
              {/* Current time indicator after all timed events if needed */}
              {isToday && timedBlocks.length > 0 && currentTimeIndex === -1 && (
                <CurrentTimeIndicator date={date} variant="inline" />
              )}
              {/* Show indicator even if no timed events */}
              {isToday && timedBlocks.length === 0 && <CurrentTimeIndicator date={date} variant="inline" />}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

interface MobileListViewProps {
  weekDays: Date[];
  blocks: Block[];
}

export function MobileListView({ weekDays, blocks }: MobileListViewProps) {
  // Custom sort: timed events first (by time), then all-day events (by time)
  const sortBlocksForList = (blocks: Block[]): Block[] => {
    const timed = blocks.filter((b) => !b.allDay);
    const allDay = blocks.filter((b) => b.allDay);
    return [...sortBlocksByTime(timed), ...sortBlocksByTime(allDay)];
  };

  return (
    <div className="overflow-y-auto h-full">
      {weekDays.map((date) => {
        const dayBlocks = sortBlocksForList(getBlocksForDay(blocks, date));
        const isCurrentDay = isToday(date);

        return (
          <DroppableDaySection
            key={date.toISOString()}
            date={date}
            title={formatDayHeader(date)}
            blocks={dayBlocks}
            isToday={isCurrentDay}
          />
        );
      })}
    </div>
  );
}
