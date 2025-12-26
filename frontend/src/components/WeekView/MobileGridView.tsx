import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '@/types';

interface DroppableTimeSlotProps {
  id: string;
  date: Date;
  hour: number;
  minute: number;
  children: React.ReactNode;
  activeBlockDuration?: number;
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

  return (
    <div ref={setNodeRef} className="relative h-full">
      {children}
      {isOver && activeBlockDuration && (
        <div className="absolute inset-0 border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded pointer-events-none z-10" />
      )}
    </div>
  );
}

interface DroppableGridDayProps {
  date: Date;
  dayBlocks: Block[];
  onBlockClick: (block: Block) => void;
  isCurrentDay: boolean;
  activeBlock: Block | null;
}

function DroppableGridDay({ date, dayBlocks, onBlockClick, isCurrentDay, activeBlock }: DroppableGridDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-day-${date.toISOString()}`,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-lg border overflow-hidden
        ${
          isCurrentDay
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]'
        }
        ${isOver ? 'ring-2 ring-[var(--color-accent)]' : ''}
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
      <div className="p-2 min-h-[120px] max-h-[200px] overflow-y-auto relative">
        {/* Time slot overlay for vertical dragging */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 24 }, (_, i) => i).map((hour) =>
            [0, 15, 30, 45].map((minute) => (
              <DroppableTimeSlot
                key={`${date.toISOString()}-${hour}-${minute}`}
                id={`grid-${date.toISOString()}-${hour}-${minute}`}
                date={date}
                hour={hour}
                minute={minute}
                activeBlockDuration={
                  activeBlock ? activeBlock.endTime.getTime() - activeBlock.startTime.getTime() : undefined
                }
              >
                <div className="h-2 pointer-events-auto" />
              </DroppableTimeSlot>
            ))
          )}
        </div>

        {/* Events */}
        <div className="space-y-2 relative z-10">
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
  activeBlock?: Block | null;
}

export function MobileGridView({ weekDays, blocks, onBlockClick, activeBlock }: MobileGridViewProps) {
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
              onBlockClick={onBlockClick}
              isCurrentDay={isCurrentDay}
              activeBlock={activeBlock || null}
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
