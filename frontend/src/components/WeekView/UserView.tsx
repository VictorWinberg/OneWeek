import { useDroppable } from '@dnd-kit/core';
import { useConfigStore } from '@/stores/configStore';
import { formatDayShort, isToday } from '@/utils/dateUtils';
import { EventCard } from '@/components/WeekView/EventCard';
import { DesktopView } from '@/components/WeekView/DesktopView';
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
        ${
          isOver
            ? 'bg-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)] ring-inset'
            : 'hover:bg-[var(--color-bg-tertiary)]/20'
        }
      `}
    >
      {children}
    </td>
  );
}

interface UserViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
}

export function UserView({ onBlockClick, onCreateEventForDate, onNextWeek, onPrevWeek, onGoToToday }: UserViewProps) {
  const { config } = useConfigStore();
  const calendars = config.calendars;

  // Get blocks for a specific day and calendar
  const getBlocksForDayAndCalendar = (blocks: Block[], date: Date, calendarId: string) => {
    const dayBlocks = getBlocksForDay(blocks, date);
    return sortBlocksByTime(dayBlocks.filter((b) => b.calendarId === calendarId));
  };

  return (
    <DesktopView
      onBlockClick={onBlockClick}
      onCreateEventForDate={onCreateEventForDate}
      onNextWeek={onNextWeek}
      onPrevWeek={onPrevWeek}
      onGoToToday={onGoToToday}
      dragOverlayProps={{ compact: true }}
    >
      {({ blocks, weekDays, onBlockClick, onCreateEventForDate }) => (
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
                    const dayCalendarBlocks = getBlocksForDayAndCalendar(blocks, date, calendar.id);
                    return (
                      <DroppableCell
                        key={`${date.toISOString()}-${calendar.id}`}
                        id={`${date.toISOString()}-${calendar.id}`}
                        date={date}
                        calendarId={calendar.id}
                        onClick={() => onCreateEventForDate?.(date, calendar.id)}
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
    </DesktopView>
  );
}
