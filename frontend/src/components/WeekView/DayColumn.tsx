import { useDroppable } from '@dnd-kit/core';
import type { Block } from '@/types';
import { isToday, formatDayShort, formatDayNumber } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';

interface DayColumnProps {
  date: Date;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onEmptySpaceClick?: (date: Date) => void;
  compact?: boolean;
  draggable?: boolean;
}

export function DayColumn({ date, blocks, onBlockClick, onEmptySpaceClick, compact = false, draggable = false }: DayColumnProps) {
  const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date).filter((b) => !b.allDay));
  const today = isToday(date);

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date },
  });

  const handleEmptySpaceClick = () => {
    if (onEmptySpaceClick) {
      onEmptySpaceClick(date);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-0 flex-1
        ${today ? 'bg-[var(--color-bg-tertiary)]/30' : ''}
        ${compact ? '' : 'border-r border-[var(--color-bg-tertiary)] last:border-r-0'}
        ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-inset' : ''}
      `}
    >
      {/* Day Header */}
      <div
        className={`
          sticky top-0 z-10 p-3 text-center relative
          bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)]
          ${today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''}
        `}
      >
        <div className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)] relative">{formatDayShort(date)}</div>
        <div
          className={`
            text-2xl font-bold mt-1 relative
            ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}
          `}
        >
          {formatDayNumber(date)}
        </div>
      </div>

      {/* Events */}
      <div
        className="flex-1 p-2 space-y-2 overflow-y-auto cursor-pointer hover:bg-[var(--color-bg-tertiary)]/20 transition-colors"
        onClick={handleEmptySpaceClick}
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
              compact={compact}
              draggable={draggable}
            />
          ))
        )}
      </div>
    </div>
  );
}
