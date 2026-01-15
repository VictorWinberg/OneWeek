import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { EventCard } from '@/components/WeekView/EventCard';
import type { Block } from '@/types';

interface DroppableGridDayProps {
  date: Date;
  dayBlocks: Block[];
  onBlockClick: (block: Block) => void;
  onEmptyClick?: (date: Date) => void;
  isCurrentDay: boolean;
}

function DroppableGridDay({ date, dayBlocks, onBlockClick, onEmptyClick, isCurrentDay }: DroppableGridDayProps) {
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
    onEmptyClick?.(date);
  };

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
        {/* Events */}
        <div className="space-y-2">
          {dayBlocks.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] text-xs py-8 opacity-60">Inga events</p>
          ) : (
            dayBlocks.map((block) => (
              <EventCard
                key={`${block.calendarId}-${block.id}`}
                block={block}
                onClick={() => onBlockClick(block)}
                compact={true}
                draggable={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface MobileGridViewProps {
  weekDays: Date[];
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  activeBlock?: Block | null;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

export function MobileGridView({
  weekDays,
  blocks,
  onBlockClick,
  onCreateEventForDate,
  activeBlock,
  onPrevWeek,
  onNextWeek,
}: MobileGridViewProps) {
  const { getContainerProps } = useSwipeNavigation({
    onPrevWeek,
    onNextWeek,
    activeBlock,
  });
  const swipeContainerProps = getContainerProps();
  const handleEmptySpaceClick = (date: Date) => {
    if (onCreateEventForDate) {
      onCreateEventForDate(date);
    }
  };

  return (
    <div {...swipeContainerProps} className="overflow-y-auto h-full">
      <div className="grid grid-cols-2 gap-2 p-2">
        {weekDays.map((date) => {
          const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date));
          const isCurrentDay = isToday(date);

          return (
            <DroppableGridDay
              key={date.toISOString()}
              date={date}
              dayBlocks={dayBlocks}
              onBlockClick={onBlockClick}
              onEmptyClick={handleEmptySpaceClick}
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
