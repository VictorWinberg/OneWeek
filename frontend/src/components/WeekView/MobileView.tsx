import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendarStore } from '../../stores/calendarStore';
import { useConfigStore } from '../../stores/configStore';
import {
  getWeekDays,
  formatDayHeader,
  isToday,
  formatWeekHeader,
  getWeekNumber,
  formatDayShort,
} from '../../utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '../../services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '../../types';

// Droppable components for different views
interface DroppableDaySectionProps {
  date: Date;
  title: string;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  isToday: boolean;
}

function DroppableDaySection({ date, title, blocks, onBlockClick, isToday }: DroppableDaySectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-section-${date.toISOString()}`,
    data: { date },
  });

  return (
    <section
      ref={setNodeRef}
      className={`
        border-b border-[var(--color-bg-tertiary)] last:border-b-0
        ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-inset' : ''}
      `}
    >
      <header
        className={`
          sticky top-0 z-10 px-4 py-3
          ${isToday ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'}
        `}
      >
        <div className="flex items-center gap-2">
          <h2
            className={`
              text-base font-bold
              ${isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}
            `}
          >
            {title}
          </h2>
          {isToday && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {blocks.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-8 opacity-60">Inga events</p>
        ) : (
          blocks.map((block) => (
            <EventCard
              key={`${block.calendarId}-${block.id}`}
              block={block}
              onClick={() => onBlockClick(block)}
              draggable={true}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface DroppableGridDayProps {
  date: Date;
  dayBlocks: Block[];
  onBlockClick: (block: Block) => void;
  isCurrentDay: boolean;
}

function DroppableGridDay({ date, dayBlocks, onBlockClick, isCurrentDay }: DroppableGridDayProps) {
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
      <div className="p-2 space-y-2 min-h-[120px] max-h-[200px] overflow-y-auto">
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
  );
}

interface DroppableMobileCellProps {
  id: string;
  date: Date;
  calendarId: string;
  children: React.ReactNode;
  isToday: boolean;
}

function DroppableMobileCell({ id, date, calendarId, children, isToday }: DroppableMobileCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, calendarId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`
        p-0.5 border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0 align-top
        ${isToday ? 'bg-[var(--color-accent)]/5' : ''}
        ${isOver ? 'bg-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)] ring-inset' : ''}
      `}
    >
      {children}
    </td>
  );
}

interface DroppableTimeSlotProps {
  id: string;
  date: Date;
  hour: number;
  minute: number;
  children: React.ReactNode;
  activeBlockDuration?: number; // Duration in milliseconds
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

  // Calculate the height of the outline based on the active block's duration
  const outlineHeight = activeBlockDuration ? Math.max((activeBlockDuration / (1000 * 60 * 60)) * 60, 30) : 0;

  return (
    <div ref={setNodeRef} className="relative">
      {children}
      {/* Show outline of full event when hovering */}
      {isOver && activeBlockDuration && (
        <div
          className="absolute left-0 right-0 border-2 border-[var(--color-accent)] bg-[var(--color-bg-secondary)] rounded pointer-events-none z-10 before:absolute before:inset-0 before:bg-[var(--color-accent)]/10 before:rounded"
          style={{
            top: 0,
            height: `${outlineHeight}px`,
          }}
        />
      )}
    </div>
  );
}

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

  // Get blocks for a specific day and calendar
  const getBlocksForDayAndCalendar = (date: Date, calendarId: string) => {
    const dayBlocks = getBlocksForDay(blocks, date);
    return sortBlocksByTime(dayBlocks.filter((b) => b.calendarId === calendarId));
  };

  // Calculate position and size for a block in hour view
  const getBlockPosition = (block: Block) => {
    const startHour = block.startTime.getHours();
    const startMinute = block.startTime.getMinutes();
    const endHour = block.endTime.getHours();
    const endMinute = block.endTime.getMinutes();

    const top = (startHour + startMinute / 60) * 60; // 60px per hour
    const duration = endHour - startHour + (endMinute - startMinute) / 60;
    const height = Math.max(duration * 60, 30); // Minimum 30px height

    return { top, height };
  };

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
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Rutnät
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Kalender
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
            // List View
            <>
              {weekDays.map((date) => {
                const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date));
                const isCurrentDay = isToday(date);

                return (
                  <DroppableDaySection
                    key={date.toISOString()}
                    date={date}
                    title={formatDayHeader(date)}
                    blocks={dayBlocks}
                    onBlockClick={onBlockClick}
                    isToday={isCurrentDay}
                  />
                );
              })}
            </>
          ) : viewMode === 'grid' ? (
            // Grid View (2x4)
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
                  />
                );
              })}
              {/* Empty cell for 8th position if needed */}
              {weekDays.length % 2 !== 0 && (
                <div className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/50" />
              )}
            </div>
          ) : viewMode === 'hour' ? (
            // Hour View
            <div className="flex min-w-max">
              {/* Time column */}
              <div className="sticky left-0 z-20 bg-[var(--color-bg-secondary)] border-r border-[var(--color-bg-tertiary)]">
                <div className="sticky top-0 z-30 bg-[var(--color-bg-secondary)] h-[50px] border-b border-[var(--color-bg-tertiary)] flex items-center justify-center px-2">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Tid</span>
                </div>
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-[var(--color-bg-tertiary)] flex items-start justify-end pr-1 pt-1"
                  >
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((date) => {
                const today = isToday(date);
                const dayBlocks = getBlocksForDay(blocks, date).filter((block) => !block.allDay);

                return (
                  <div
                    key={date.toISOString()}
                    className={`flex-1 min-w-[40px] border-r border-[var(--color-bg-tertiary)] last:border-r-0 ${
                      today ? 'bg-[var(--color-accent)]/5' : ''
                    }`}
                  >
                    {/* Day header */}
                    <div
                      className={`sticky top-0 z-10 h-[50px] border-b border-[var(--color-bg-tertiary)] flex flex-col items-center justify-center px-0.5 ${
                        today ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <div
                        className={`text-[9px] uppercase tracking-wide ${
                          today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {formatDayShort(date).substring(0, 2)}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Hour grid and events */}
                    <div className="relative">
                      {/* Hour grid lines */}
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <div key={hour} className="h-[60px] border-b border-[var(--color-bg-tertiary)]" />
                      ))}

                      {/* 15-minute droppable time slots overlay */}
                      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) =>
                          [0, 15, 30, 45].map((minute) => (
                            <DroppableTimeSlot
                              key={`${date.toISOString()}-${hour}-${minute}`}
                              id={`${date.toISOString()}-${hour}-${minute}`}
                              date={date}
                              hour={hour}
                              minute={minute}
                              activeBlockDuration={
                                activeBlock
                                  ? activeBlock.endTime.getTime() - activeBlock.startTime.getTime()
                                  : undefined
                              }
                            >
                              <div className="h-[15px] cursor-pointer hover:bg-[var(--color-bg-tertiary)]/10 transition-colors pointer-events-auto" />
                            </DroppableTimeSlot>
                          ))
                        )}
                      </div>

                      {/* Events overlay */}
                      <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                        {dayBlocks.map((block) => {
                          const { top, height } = getBlockPosition(block);
                          return (
                            <div
                              key={`${block.calendarId}-${block.id}`}
                              className="absolute left-0.5 right-0.5 pointer-events-auto"
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                              }}
                            >
                              <EventCard
                                block={block}
                                onClick={() => onBlockClick(block)}
                                compact={true}
                                fillHeight={true}
                                draggable={true}
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
          ) : (
            // Calendar View
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
                  <tr>
                    <th className="p-1 text-left text-[9px] font-semibold text-[var(--color-text-primary)] border-b border-r border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] w-12">
                      <div className="truncate">Dag</div>
                    </th>
                    {calendars.map((calendar) => (
                      <th
                        key={calendar.id}
                        className="p-1 text-center text-[9px] font-semibold text-[var(--color-text-primary)] border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0"
                        style={{ width: `${Math.max(60, (window.innerWidth - 48) / calendars.length)}px` }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: calendar.color }}
                            title={calendar.name}
                          />
                          <span className="truncate hidden sm:inline">{calendar.name}</span>
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
                          className={`p-1 text-left font-medium border-b border-r border-[var(--color-bg-tertiary)] ${
                            today ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bg-secondary)]'
                          }`}
                        >
                          <div className="flex flex-col text-[8px]">
                            <div className={today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}>
                              {formatDayShort(date).substring(0, 2)}
                            </div>
                            <div className="text-[var(--color-text-secondary)]">
                              {date.getDate()}/{date.getMonth() + 1}
                            </div>
                          </div>
                        </td>
                        {calendars.map((calendar) => {
                          const dayCalendarBlocks = getBlocksForDayAndCalendar(date, calendar.id);
                          return (
                            <DroppableMobileCell
                              key={`${date.toISOString()}-${calendar.id}`}
                              id={`mobile-${date.toISOString()}-${calendar.id}`}
                              date={date}
                              calendarId={calendar.id}
                              isToday={today}
                            >
                              <div className="space-y-0.5 min-h-[50px]">
                                {dayCalendarBlocks.length === 0 ? (
                                  <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-[9px] opacity-50">
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
                            </DroppableMobileCell>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

// Remove the old DaySection component as it's now replaced by DroppableDaySection
