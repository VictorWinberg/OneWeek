import { useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { startOfWeek, format } from 'date-fns';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
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
  const { user } = useAuthStore();

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

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const mondayStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                  navigate(`/day/${mondayStr}`);
                }}
                className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
                aria-label="Kalender"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'User'}
                  className="w-6 h-6 rounded-full border border-[var(--color-bg-tertiary)]"
                />
              ) : (
                <button
                  className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
                  aria-label="Användare"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/tasks')}
                className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
                aria-label="Uppgifter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </button>
              <button
                onClick={onNextWeek}
                className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
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
            <MobileListView
              weekDays={weekDays}
              blocks={blocks}
              onBlockClick={onBlockClick}
              onCreateEventForDate={onCreateEventForDate}
              activeBlock={activeBlock}
            />
          ) : mobileViewMode === 'grid' ? (
            <MobileGridView
              weekDays={weekDays}
              blocks={blocks}
              onBlockClick={onBlockClick}
              onCreateEventForDate={onCreateEventForDate}
              activeBlock={activeBlock}
              onPrevWeek={onPrevWeek}
              onNextWeek={onNextWeek}
            />
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
              onCreateEventForDate={onCreateEventForDate}
              activeBlock={activeBlock}
              onPrevWeek={onPrevWeek}
              onNextWeek={onNextWeek}
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
