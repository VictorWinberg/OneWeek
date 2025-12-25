import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { getWeekDays, formatWeekHeader, getWeekNumber, formatDayShort, isToday } from '@/utils/dateUtils';
import { EventCard } from './EventCard';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import type { Block } from '@/types';

interface DroppableCellProps {
  id: string;
  date: Date;
  calendarId: string;
  children: React.ReactNode;
  onClick: () => void;
  isToday: boolean;
}

function DroppableCell({ id, date, calendarId, children, onClick, isToday }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, calendarId },
  });

  return (
    <td
      ref={setNodeRef}
      onClick={onClick}
      className={`
        p-2 border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0 align-top cursor-pointer transition-colors
        ${isToday ? 'bg-[var(--color-accent)]/5' : ''}
        ${isOver ? 'bg-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)] ring-inset' : 'hover:bg-[var(--color-bg-tertiary)]/20'}
      `}
    >
      {children}
    </td>
  );
}

interface CalendarViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate?: (date: Date, calendarId?: string) => void;
}

export function CalendarView({ onBlockClick, onCreateEvent, onCreateEventForDate }: CalendarViewProps) {
  const { blocks, selectedDate, isLoading, error, fetchBlocks, prefetchAdjacentWeeks, nextWeek, prevWeek, goToToday, updateBlockTime, moveBlock } = useCalendarStore();
  const { config, isConfigured } = useConfigStore();
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (isConfigured) {
      fetchBlocks().then(() => {
        // Prefetch adjacent weeks after initial load
        prefetchAdjacentWeeks();
      });
    }
  }, [isConfigured, fetchBlocks, prefetchAdjacentWeeks]);

  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);
  const calendars = config.calendars;

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-secondary)]">Konfigurera kalendrar för att se events</p>
      </div>
    );
  }

  // Get blocks for a specific day and calendar
  const getBlocksForDayAndCalendar = (date: Date, calendarId: string) => {
    const dayBlocks = getBlocksForDay(blocks, date);
    return sortBlocksByTime(dayBlocks.filter((b) => b.calendarId === calendarId));
  };

  const handleEmptySpaceClick = (date: Date, calendarId: string) => {
    if (onCreateEventForDate) {
      onCreateEventForDate(date, calendarId);
    }
  };

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
    const dropData = event.over.data.current as { date: Date; calendarId: string } | undefined;

    if (!dropData) return;

    const block = blocks.find((b) => `${b.calendarId}-${b.id}` === blockId);
    if (!block) return;

    const needsMove = block.calendarId !== dropData.calendarId;
    const needsTimeUpdate = block.startTime.toDateString() !== dropData.date.toDateString();

    // If calendar changed, move the event
    if (needsMove) {
      try {
        await moveBlock(block.id, block.calendarId, dropData.calendarId);
      } catch (error) {
        console.error('Failed to move block:', error);
        return;
      }
    }

    // If day changed, update the time
    if (needsTimeUpdate) {
      const newStartTime = new Date(dropData.date);
      newStartTime.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);

      const duration = block.endTime.getTime() - block.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      try {
        // Use the new calendar ID if moved
        await updateBlockTime(block.id, needsMove ? dropData.calendarId : block.calendarId, newStartTime, newEndTime);
      } catch (error) {
        console.error('Failed to update block time:', error);
      }
    }
  };

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

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-[var(--color-text-primary)] border-b border-r border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] min-w-[100px]">
                  Dag
                </th>
                {calendars.map((calendar) => (
                  <th
                    key={calendar.id}
                    className="p-3 text-center text-sm font-semibold text-[var(--color-text-primary)] border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0 min-w-[200px]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                      {calendar.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map((date) => {
                const today = isToday(date);
                return (
                  <tr key={date.toISOString()} className={today ? 'bg-[var(--color-accent)]/5' : ''}>
                    <td
                      className={`p-3 text-left font-medium border-b border-r border-[var(--color-bg-tertiary)] ${
                        today ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <div
                            className={`text-sm ${
                              today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                            }`}
                          >
                            {formatDayShort(date)}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">
                            {date.getDate()}/{date.getMonth() + 1}
                          </div>
                        </div>
                        {today && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />}
                      </div>
                    </td>
                    {calendars.map((calendar) => {
                      const dayCalendarBlocks = getBlocksForDayAndCalendar(date, calendar.id);
                      return (
                        <DroppableCell
                          key={`${date.toISOString()}-${calendar.id}`}
                          id={`${date.toISOString()}-${calendar.id}`}
                          date={date}
                          calendarId={calendar.id}
                          onClick={() => handleEmptySpaceClick(date, calendar.id)}
                          isToday={today}
                        >
                          <div className="space-y-2 min-h-[80px]">
                            {dayCalendarBlocks.length === 0 ? (
                              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm opacity-50 pointer-events-none">
                                —
                              </div>
                            ) : (
                              dayCalendarBlocks.map((block) => (
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
                        </DroppableCell>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
