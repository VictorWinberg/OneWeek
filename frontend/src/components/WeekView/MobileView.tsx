import { useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useWeekEvents, usePrefetchAdjacentWeeks, useUpdateEvent, useMoveEvent } from '@/hooks/useCalendarQueries';
import { getWeekDays, formatWeekHeader, getWeekNumber } from '@/utils/dateUtils';
import { urlToMobileViewMode, mobileToUrlViewMode, type MobileViewMode, type UrlViewMode } from '@/utils/viewModeUtils';
import { useMobileDragAndDrop } from '@/hooks/useDragAndDrop';
import { EventCard } from '@/components/WeekView/EventCard';
import { MobileListView } from '@/components/WeekView/MobileListView';
import { MobileGridView } from '@/components/WeekView/MobileGridView';
import { MobileUserView } from '@/components/WeekView/MobileUserView';
import { MobileHourView } from '@/components/WeekView/MobileHourView';
import type { Block } from '@/types';

interface MobileViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  viewMode?: UrlViewMode;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onViewModeChange?: (mode: UrlViewMode) => void;
}

export function MobileView({
  onBlockClick,
  onCreateEventForDate,
  viewMode: urlViewMode,
  onNextWeek,
  onPrevWeek,
  onViewModeChange,
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

  // Use mobile drag and drop hook
  const { activeBlock, handleDragStart, handleDragEnd, sensors } = useMobileDragAndDrop(blocks, {
    updateEventTime,
    moveEvent,
  });

  // Prefetch adjacent weeks when data loads
  useEffect(() => {
    if (!isLoading && blocks.length >= 0) {
      prefetch();
    }
  }, [isLoading, prefetch, blocks.length]);

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
              Personlig
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
            <div
              className="opacity-90"
              style={
                mobileViewMode === 'hour' && !activeBlock.allDay
                  ? {
                      // Calculate height based on event duration to match the original size
                      height: `${Math.max(
                        ((activeBlock.endTime.getTime() - activeBlock.startTime.getTime()) / (1000 * 60 * 60)) * 50,
                        25
                      )}px`,
                      width: '100%',
                      minWidth: '42px',
                    }
                  : undefined
              }
            >
              <EventCard
                block={activeBlock}
                onClick={() => {}}
                compact={true}
                fillHeight={mobileViewMode === 'hour' ? true : false}
                hideTime={mobileViewMode === 'hour'}
                extraCompact={mobileViewMode === 'hour'}
                isAllDay={activeBlock.allDay}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
