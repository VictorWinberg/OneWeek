import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useWeekEvents, usePrefetchAdjacentWeeks, useUpdateEvent, useMoveEvent } from '@/hooks/useCalendarQueries';
import { getWeekDays, formatWeekHeader, getWeekNumber } from '@/utils/dateUtils';
import { EventCard } from './EventCard';
import { MobileListView } from './MobileListView';
import { MobileGridView } from './MobileGridView';
import { MobileUserView } from './MobileUserView';
import { MobileHourView } from './MobileHourView';
import type { Block } from '@/types';

type MobileViewMode = 'list' | 'calendar' | 'grid' | 'hour';
type UrlViewMode = 'day' | 'grid' | 'user' | 'hour';

interface MobileViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  viewMode?: UrlViewMode;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
  onViewModeChange?: (mode: UrlViewMode) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

// Map URL view modes to mobile view modes
function urlToMobileViewMode(urlMode: UrlViewMode | undefined, localMode: MobileViewMode): MobileViewMode {
  if (!urlMode) return localMode;
  switch (urlMode) {
    case 'day':
      return 'list';
    case 'grid':
      return 'grid';
    case 'user':
      return 'calendar';
    case 'hour':
      return 'hour';
    default:
      return 'list';
  }
}

// Map mobile view modes to URL view modes
function mobileToUrlViewMode(mobileMode: MobileViewMode): UrlViewMode {
  switch (mobileMode) {
    case 'list':
      return 'day';
    case 'grid':
      return 'grid';
    case 'calendar':
      return 'user';
    case 'hour':
      return 'hour';
    default:
      return 'day';
  }
}

export function MobileView({
  onBlockClick,
  onCreateEvent,
  viewMode: urlViewMode,
  onNextWeek,
  onPrevWeek,
  onGoToToday,
  onViewModeChange,
  onCreateEventForDate,
}: MobileViewProps) {
  const { selectedDate } = useCalendarStore();
  const { config } = useConfigStore();

  // Fetch events using React Query
  const { data: blocks = [], isLoading, error } = useWeekEvents(selectedDate);
  const { prefetch } = usePrefetchAdjacentWeeks(selectedDate);
  const updateEventTime = useUpdateEvent();
  const moveEvent = useMoveEvent();

  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);
  const calendars = config.calendars;

  // Compute current mobile view mode from URL mode
  const mobileViewMode = urlToMobileViewMode(urlViewMode, 'list');

  // Handle view mode changes - all modes now map directly to URL
  const handleViewModeChange = (newMobileMode: MobileViewMode) => {
    const newUrlMode = mobileToUrlViewMode(newMobileMode);
    if (onViewModeChange) {
      onViewModeChange(newUrlMode);
    }
  };
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  // Configure drag sensors for mobile - use separate mouse and touch sensors
  // PointerSensor with low distance for mouse/trackpad on tablets
  // TouchSensor with delay to prevent accidental drags and allow scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Delay before drag activates, allows scroll to work
        tolerance: 5, // Movement tolerance during delay
      },
    })
  );

  // Prefetch adjacent weeks when data loads
  useEffect(() => {
    if (!isLoading && blocks.length >= 0) {
      prefetch();
    }
  }, [isLoading, prefetch, blocks.length]);

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
        await updateEventTime.mutateAsync({
          blockId: block.id,
          calendarId: block.calendarId,
          startTime: newStartTime,
          endTime: newEndTime,
        });
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
          await moveEvent.mutateAsync({
            blockId: block.id,
            calendarId: block.calendarId,
            targetCalendarId: dropData.calendarId,
            startTime: block.startTime,
          });
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
          await updateEventTime.mutateAsync({
            blockId: block.id,
            calendarId: needsMove ? dropData.calendarId : block.calendarId,
            startTime: newStartTime,
            endTime: newEndTime,
          });
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
        await updateEventTime.mutateAsync({
          blockId: block.id,
          calendarId: block.calendarId,
          startTime: newStartTime,
          endTime: newEndTime,
        });
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
          {/* Week header with navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevWeek}
              className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-col items-center">
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{formatWeekHeader(selectedDate)}</h1>
              <span className="text-xs text-[var(--color-text-secondary)]">v.{weekNumber}</span>
            </div>

            <button
              onClick={onNextWeek}
              className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={onCreateEvent}
              className="p-1.5 rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors"
              aria-label="Skapa event"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={onGoToToday}
              className="px-3 py-1 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium text-sm"
            >
              Idag
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mobileViewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mobileViewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Översikt
            </button>
            <button
              onClick={() => handleViewModeChange('calendar')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mobileViewMode === 'calendar'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Användarvy
            </button>
            <button
              onClick={() => handleViewModeChange('hour')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mobileViewMode === 'hour'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Timvy
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200 text-sm">
            {error instanceof Error ? error.message : 'Failed to load events'}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mobileViewMode === 'list' ? (
            <MobileListView weekDays={weekDays} blocks={blocks} onBlockClick={onBlockClick} activeBlock={activeBlock} />
          ) : mobileViewMode === 'grid' ? (
            <MobileGridView weekDays={weekDays} blocks={blocks} onBlockClick={onBlockClick} activeBlock={activeBlock} />
          ) : mobileViewMode === 'hour' ? (
            <MobileHourView
              weekDays={weekDays}
              blocks={blocks}
              onBlockClick={onBlockClick}
              activeBlock={activeBlock}
              onCreateEventForDate={onCreateEventForDate}
            />
          ) : (
            <MobileUserView
              weekDays={weekDays}
              blocks={blocks}
              calendars={calendars}
              onBlockClick={onBlockClick}
              activeBlock={activeBlock}
            />
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeBlock ? (
            <div className="opacity-90">
              <EventCard
                block={activeBlock}
                onClick={() => {}}
                compact={true}
                fillHeight={false}
                hideTime={mobileViewMode === 'hour'}
                isAllDay={activeBlock.allDay}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
