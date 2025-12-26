import { useDroppable } from '@dnd-kit/core';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '@/services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '@/types';
import type { Calendar } from '@/types/calendar';

interface DroppableTimeSlotProps {
  id: string;
  date: Date;
  hour: number;
  minute: number;
  calendarId: string;
  children: React.ReactNode;
  activeBlockDuration?: number;
}

function DroppableTimeSlot({ id, date, hour, minute, calendarId, children, activeBlockDuration }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      hour,
      minute,
      calendarId,
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

interface DroppableMobileCellProps {
  id: string;
  date: Date;
  calendarId: string;
  children: React.ReactNode;
  isToday: boolean;
  activeBlock: Block | null;
}

function DroppableMobileCell({ id, date, calendarId, children, isToday, activeBlock }: DroppableMobileCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, calendarId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`
        p-0.5 border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0 align-top h-full flex-1 relative
        ${isToday ? 'bg-[var(--color-accent)]/5' : ''}
        ${isOver ? 'bg-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)] ring-inset' : ''}
      `}
    >
      {/* Time slot overlay for vertical dragging */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 24 }, (_, i) => i).map((hour) =>
          [0, 15, 30, 45].map((minute) => (
            <DroppableTimeSlot
              key={`${date.toISOString()}-${calendarId}-${hour}-${minute}`}
              id={`user-${date.toISOString()}-${calendarId}-${hour}-${minute}`}
              date={date}
              hour={hour}
              minute={minute}
              calendarId={calendarId}
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
      <div className="relative z-10">
        {children}
      </div>
    </td>
  );
}

interface MobileUserViewProps {
  weekDays: Date[];
  blocks: Block[];
  calendars: Calendar[];
  onBlockClick: (block: Block) => void;
  activeBlock?: Block | null;
}

export function MobileUserView({ weekDays, blocks, calendars, onBlockClick, activeBlock }: MobileUserViewProps) {
  // Get blocks for a specific day and calendar
  const getBlocksForDayAndCalendar = (date: Date, calendarId: string) => {
    const dayBlocks = getBlocksForDay(blocks, date);
    return sortBlocksByTime(dayBlocks.filter((b) => b.calendarId === calendarId));
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="overflow-x-auto h-full flex flex-col">
        <table className="w-full flex-1 border-collapse text-xs flex flex-col" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)] block w-full">
            <tr className="flex w-full">
              <th className="flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)] border-b border-r border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] w-12 flex-shrink-0 px-2">
                <span>Dag</span>
              </th>
              {calendars.map((calendar) => (
                <th
                  key={calendar.id}
                  className="p-1 text-center text-sm font-semibold text-[var(--color-text-primary)] border-b border-r border-[var(--color-bg-tertiary)] last:border-r-0 flex-1"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: calendar.color }}
                      title={calendar.name}
                    />
                    <span className="truncate text-xs">{calendar.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="flex-1 flex flex-col w-full">
            {weekDays.map((date) => {
              const today = isToday(date);
              return (
                <tr key={date.toISOString()} className={`flex w-full ${today ? 'bg-[var(--color-accent)]/5' : ''}`}>
                  <td
                    className={`flex flex-col items-center justify-center border-b border-r border-[var(--color-bg-tertiary)] h-full w-12 flex-shrink-0 relative bg-[var(--color-bg-secondary)] ${
                      today ? 'before:absolute before:inset-0 before:bg-[var(--color-accent)]/10' : ''
                    }`}
                  >
                    <div
                      className={`uppercase tracking-wide text-xs relative ${
                        today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {formatDayShort(date).substring(0, 2)}
                    </div>
                    <div
                      className={`font-bold text-lg relative ${
                        today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {date.getDate()}
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
                        activeBlock={activeBlock || null}
                      >
                        <div className="space-y-0.5 h-full flex flex-col">
                          {dayCalendarBlocks.length === 0 ? (
                            <div className="flex items-center justify-center flex-1 text-[var(--color-text-secondary)] text-[9px] opacity-50">
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
    </div>
  );
}
