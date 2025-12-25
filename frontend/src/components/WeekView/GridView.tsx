import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useWeekEvents, usePrefetchAdjacentWeeks, useUpdateEvent } from '@/hooks/useCalendarQueries';
import { getWeekDays, formatWeekHeader, getWeekNumber, formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';
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

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        // Only trigger if clicking on empty space
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.empty-space')) {
          onEmptyClick?.(date);
        }
      }}
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
          <div className="empty-space flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm opacity-50">
            Inga events
          </div>
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
  );
}

interface GridViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate?: (date: Date) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
}

export function GridView({
  onBlockClick,
  onCreateEvent,
  onCreateEventForDate,
  onNextWeek,
  onPrevWeek,
  onGoToToday,
}: GridViewProps) {
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

  const handleEmptySpaceClick = (date: Date) => {
    if (onCreateEventForDate) {
      onCreateEventForDate(date);
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
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{formatWeekHeader(selectedDate)}</h1>
            <span className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
              v.{weekNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateEvent}
              className="px-3 py-2 rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors flex items-center gap-2"
              aria-label="Skapa event"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Skapa event</span>
            </button>

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

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-full">
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
              {/* Empty cell for 8th position */}
              <div className="rounded-xl border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/30" />
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-90">
            <EventCard block={activeBlock} onClick={() => {}} compact={true} fillHeight={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

