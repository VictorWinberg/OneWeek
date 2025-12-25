import { useDroppable } from '@dnd-kit/core';
import { formatDayHeader, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '@/types';

interface DroppableDaySectionProps {
  date: Date;
  title: string;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  isToday: boolean;
}

function DroppableDaySection({ date, title, blocks, onBlockClick, isToday }: DroppableDaySectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-section-${date.toISOString()}`,
    data: { date },
  });

  return (
    <section
      ref={setNodeRef}
      className={`
        border-b border-[var(--color-bg-tertiary)] last:border-b-0
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

      <div className="p-4 space-y-3">
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
    </section>
  );
}

interface MobileListViewProps {
  weekDays: Date[];
  blocks: Block[];
  onBlockClick: (block: Block) => void;
}

export function MobileListView({ weekDays, blocks, onBlockClick }: MobileListViewProps) {
  return (
    <div className="overflow-y-auto h-full">
      {weekDays.map((date) => {
        const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date));
        const isCurrentDay = isToday(date);

        return (
          <DroppableDaySection
            key={date.toISOString()}
            date={date}
            title={formatDayHeader(date)}
            blocks={dayBlocks}
            onBlockClick={onBlockClick}
            isToday={isCurrentDay}
          />
        );
      })}
    </div>
  );
}
