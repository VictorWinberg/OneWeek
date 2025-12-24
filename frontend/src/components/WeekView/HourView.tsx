import { useEffect, useRef } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import { useConfigStore } from '../../stores/configStore';
import { getWeekDays, formatWeekHeader, getWeekNumber, formatDayShort, isToday } from '../../utils/dateUtils';
import { getBlocksForDay } from '../../services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '../../types';

interface HourViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate?: (date: Date) => void;
}

export function HourView({ onBlockClick, onCreateEvent, onCreateEventForDate }: HourViewProps) {
  const { blocks, selectedDate, isLoading, error, fetchBlocks, prefetchAdjacentWeeks, nextWeek, prevWeek, goToToday } = useCalendarStore();
  const { isConfigured } = useConfigStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConfigured) {
      fetchBlocks().then(() => {
        // Prefetch adjacent weeks after initial load
        prefetchAdjacentWeeks();
      });
    }
  }, [isConfigured, fetchBlocks, prefetchAdjacentWeeks]);

  // Auto-scroll to hour 8 (8am) on mount and when changing views
  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      // Calculate position for hour 8: 8 hours * 60px per hour = 480px
      // Subtract day header height (60px) to account for the sticky header
      const targetScrollPosition = 8 * 60;
      scrollContainerRef.current.scrollTop = targetScrollPosition;
    }
  }, [isLoading]);

  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);

  // Generate hours array (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-secondary)]">Konfigurera kalendrar för att se events</p>
      </div>
    );
  }

  // Calculate position and size for a block
  const getBlockPosition = (block: Block) => {
    const startHour = block.startTime.getHours();
    const startMinute = block.startTime.getMinutes();
    const endHour = block.endTime.getHours();
    const endMinute = block.endTime.getMinutes();

    const top = (startHour + startMinute / 60) * 60; // 60px per hour
    const duration = (endHour - startHour) + (endMinute - startMinute) / 60;
    const height = Math.max(duration * 60, 30); // Minimum 30px height

    return { top, height };
  };

  const handleEmptySpaceClick = (date: Date) => {
    if (onCreateEventForDate) {
      onCreateEventForDate(date);
    }
  };

  return (
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
            onClick={prevWeek}
            className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
            aria-label="Föregående vecka"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Idag
          </button>

          <button
            onClick={nextWeek}
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
      {error && <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200">{error}</div>}

      {/* Hour Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-max">
            {/* Time column */}
            <div className="sticky left-0 z-20 bg-[var(--color-bg-secondary)] border-r border-[var(--color-bg-tertiary)]">
              <div className="h-[60px] border-b border-[var(--color-bg-tertiary)] flex items-center justify-center px-4">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Tid</span>
              </div>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-[var(--color-bg-tertiary)] flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((date) => {
              const today = isToday(date);
              const dayBlocks = getBlocksForDay(blocks, date).filter(block => !block.allDay);

              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 min-w-[150px] border-r border-[var(--color-bg-tertiary)] last:border-r-0 ${
                    today ? 'bg-[var(--color-accent)]/5' : ''
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`sticky top-0 z-10 h-[60px] border-b border-[var(--color-bg-tertiary)] flex flex-col items-center justify-center ${
                      today ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'
                    }`}
                  >
                    <div
                      className={`text-xs uppercase tracking-wide ${
                        today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {formatDayShort(date)}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Hour grid and events */}
                  <div
                    className="relative cursor-pointer hover:bg-[var(--color-bg-tertiary)]/10 transition-colors"
                    onClick={() => handleEmptySpaceClick(date)}
                  >
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-[var(--color-bg-tertiary)]"
                      />
                    ))}

                    {/* Events overlay */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-none">
                      {dayBlocks.map((block) => {
                        const { top, height } = getBlockPosition(block);
                        return (
                          <div
                            key={`${block.calendarId}-${block.id}`}
                            className="absolute left-1 right-1 pointer-events-auto"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                          >
                            <EventCard
                              block={block}
                              onClick={() => onBlockClick(block)}
                              compact={height < 60}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

