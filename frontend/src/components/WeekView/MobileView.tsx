import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { getWeekDays, formatWeekHeader, getWeekNumber } from '@/utils/dateUtils';
import { EventCard } from './EventCard';
import { MobileListView } from './MobileListView';
import { MobileGridView } from './MobileGridView';
import { MobileUserView } from './MobileUserView';
import { MobileHourView } from './MobileHourView';
import type { Block } from '@/types';

interface MobileViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
}

export function MobileView({ onBlockClick, onCreateEvent }: MobileViewProps) {
  const {
    blocks,
    selectedDate,
    isLoading,
    error,
    goToToday,
    nextWeek,
    prevWeek,
    fetchBlocks,
    prefetchAdjacentWeeks,
    updateBlockTime,
    moveBlock,
  } = useCalendarStore();
  const { config, isConfigured } = useConfigStore();
  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);
  const calendars = config.calendars;
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'grid' | 'hour'>('list');
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch blocks on mount and when configuration changes
  useEffect(() => {
    if (isConfigured) {
      fetchBlocks().then(() => {
        // Prefetch adjacent weeks after initial load
        prefetchAdjacentWeeks();
      });
    }
  }, [isConfigured, fetchBlocks, prefetchAdjacentWeeks]);

  // Auto-scroll to hour 8 (8am) on mount when in hour view
  useEffect(() => {
    if (viewMode === 'hour' && scrollContainerRef.current && !isLoading) {
      const targetScrollPosition = 8 * 60;
      scrollContainerRef.current.scrollTop = targetScrollPosition;
    }
  }, [viewMode, isLoading]);

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
    const dropData = event.over.data.current as
      | { date?: Date; calendarId?: string; hour?: number; minute?: number }
      | undefined;

    if (!dropData) return;

    const block = blocks.find((b) => `${b.calendarId}-${b.id}` === blockId);
    if (!block) return;

    // Handle hour view (time slot change)
    if (dropData.date && dropData.hour !== undefined && dropData.minute !== undefined) {
      const newStartTime = new Date(dropData.date);
      newStartTime.setHours(dropData.hour, dropData.minute, 0, 0);

      const duration = block.endTime.getTime() - block.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      try {
        await updateBlockTime(block.id, block.calendarId, newStartTime, newEndTime);
      } catch (error) {
        console.error('Failed to update block time:', error);
      }
    }
    // Handle calendar view (day + calendar change)
    else if (dropData.date && dropData.calendarId) {
      const needsMove = block.calendarId !== dropData.calendarId;
      const needsTimeUpdate = block.startTime.toDateString() !== dropData.date.toDateString();

      if (needsMove) {
        try {
          await moveBlock(block.id, block.calendarId, dropData.calendarId);
        } catch (error) {
          console.error('Failed to move block:', error);
          return;
        }
      }

      if (needsTimeUpdate) {
        const newStartTime = new Date(dropData.date);
        newStartTime.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);

        const duration = block.endTime.getTime() - block.startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);

        try {
          await updateBlockTime(block.id, needsMove ? dropData.calendarId : block.calendarId, newStartTime, newEndTime);
        } catch (error) {
          console.error('Failed to update block time:', error);
        }
      }
    }
    // Handle list/grid view (day change only)
    else if (dropData.date) {
      const newStartTime = new Date(dropData.date);
      newStartTime.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);

      const duration = block.endTime.getTime() - block.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      try {
        await updateBlockTime(block.id, block.calendarId, newStartTime, newEndTime);
      } catch (error) {
        console.error('Failed to update block time:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex flex-col gap-2 p-4 border-b border-[var(--color-bg-tertiary)]">
          <div className="flex items-center justify-between">
            <button
              onClick={prevWeek}
              className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-col items-center">
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{formatWeekHeader(selectedDate)}</h1>
              <span className="text-xs text-[var(--color-text-secondary)]">v.{weekNumber}</span>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onCreateEvent}
              className="p-2 rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors"
              aria-label="Skapa event"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={goToToday}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium"
            >
              Idag
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Översikt
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Användarvy
            </button>
            <button
              onClick={() => setViewMode('hour')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'hour'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Timvy
            </button>
          </div>
        </header>

        {/* Error */}
        {error && <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200 text-sm">{error}</div>}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" ref={viewMode === 'hour' ? scrollContainerRef : null}>
          {viewMode === 'list' ? (
            <MobileListView weekDays={weekDays} blocks={blocks} onBlockClick={onBlockClick} />
          ) : viewMode === 'grid' ? (
            <MobileGridView weekDays={weekDays} blocks={blocks} onBlockClick={onBlockClick} />
          ) : viewMode === 'hour' ? (
            <MobileHourView weekDays={weekDays} blocks={blocks} onBlockClick={onBlockClick} activeBlock={activeBlock} />
          ) : (
            <MobileUserView weekDays={weekDays} blocks={blocks} calendars={calendars} onBlockClick={onBlockClick} />
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeBlock ? (
            <div className="opacity-90">
              <EventCard block={activeBlock} onClick={() => {}} compact={true} fillHeight={false} />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
