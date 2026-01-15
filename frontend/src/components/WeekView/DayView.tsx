import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useWeekEvents, usePrefetchAdjacentWeeks, useUpdateEvent } from '@/hooks/useCalendarQueries';
import {
  getWeekDays,
  formatWeekHeader,
  getWeekNumber,
  isToday,
  formatDayShort,
  formatDayNumber,
} from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from '@/components/WeekView/EventCard';
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

interface DayViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
}

export function DayView({ onBlockClick, onCreateEventForDate, onNextWeek, onPrevWeek, onGoToToday }: DayViewProps) {
  const { selectedDate } = useCalendarStore();
  const { isConfigured } = useConfigStore();
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  // Fetch events using React Query
  const { data: blocks = [], isLoading, error } = useWeekEvents(selectedDate);
  const { prefetch } = usePrefetchAdjacentWeeks(selectedDate);
  const updateEventTime = useUpdateEvent();

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Prefetch adjacent weeks when data loads
  useEffect(() => {
    if (!isLoading && blocks.length >= 0) {
      prefetch();
    }
  }, [isLoading, prefetch, blocks.length]);

  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = String(event.active.id);
    const block = blocks.find((b) => `${b.calendarId}-${b.id}` === blockId);
    if (block) {
      setActiveBlock(block);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveBlock(null);

    if (!event.over) return;

    const blockId = String(event.active.id);
    const dropData = event.over.data.current as { date: Date } | undefined;

    if (!dropData) return;

    const block = blocks.find((b) => `${b.calendarId}-${b.id}` === blockId);
    if (!block) return;

    // Calculate new times - keep same time, just change the day
    const newStartTime = new Date(dropData.date);
    newStartTime.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);

    const duration = block.endTime.getTime() - block.startTime.getTime();
    const newEndTime = new Date(newStartTime.getTime() + duration);

    // Update the block
    try {
      await updateEventTime.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } catch (error) {
      console.error('Failed to update block:', error);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-secondary)]">Konfigurera kalendrar för att se events</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)]">
          <div className="flex items-center gap-4">
            <h1
              onClick={onGoToToday}
              className="text-xl font-bold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)] transition-colors"
            >
              {formatWeekHeader(selectedDate)}
            </h1>
            <span className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
              v.{weekNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrevWeek}
              className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
              aria-label="Föregående vecka"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={onGoToToday}
              className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Idag
            </button>

            <button
              onClick={onNextWeek}
              className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
              aria-label="Nästa vecka"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200">
            {error instanceof Error ? error.message : 'Failed to load events'}
          </div>
        )}

        {/* Week Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-90">
            <EventCard
              block={activeBlock}
              onClick={() => {}}
              compact={false}
              fillHeight={false}
              isAllDay={activeBlock.allDay}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
