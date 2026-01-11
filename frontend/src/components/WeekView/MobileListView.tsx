import { useDroppable } from '@dnd-kit/core';
import { formatDayHeader, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
import type { Block } from '@/types';

interface DroppableDaySectionProps {
  date: Date;
  title: string;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onEmptyClick?: (date: Date) => void;
  isToday: boolean;
}

function DroppableDaySection({ date, title, blocks, onBlockClick, onEmptyClick, isToday }: DroppableDaySectionProps) {
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
    onEmptyClick?.(date);
  };

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
        {/* Events */}
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-8 opacity-60">Inga events</p>
          ) : (
            blocks.map((block) => (
              <EventCard
                key={`${block.calendarId}-${block.id}`}
                block={block}
                onClick={() => onBlockClick(block)}
                draggable={true}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

interface MobileListViewProps {
  weekDays: Date[];
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  activeBlock?: Block | null;
}

export function MobileListView({ weekDays, blocks, onBlockClick, onCreateEventForDate, activeBlock: _activeBlock }: MobileListViewProps) {
  // Custom sort: timed events first (by time), then all-day events (by time)
  const sortBlocksForList = (blocks: Block[]): Block[] => {
    const timed = blocks.filter((b) => !b.allDay);
    const allDay = blocks.filter((b) => b.allDay);
    return [...sortBlocksByTime(timed), ...sortBlocksByTime(allDay)];
  };

  const handleEmptySpaceClick = (date: Date) => {
    if (onCreateEventForDate) {
      onCreateEventForDate(date);
    }
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
            onBlockClick={onBlockClick}
            onEmptyClick={handleEmptySpaceClick}
            isToday={isCurrentDay}
          />
        );
      })}
    </div>
  );
}
