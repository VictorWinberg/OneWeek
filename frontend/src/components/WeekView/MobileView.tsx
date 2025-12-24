import { useCalendarStore } from '../../stores/calendarStore';
import { getWeekDays, formatDayHeader, isToday, formatWeekHeader, getWeekNumber } from '../../utils/dateUtils';
import { getBlocksForDay, sortBlocksByTime } from '../../services/calendarNormalizer';
import { EventCard } from './EventCard';
import type { Block } from '../../types';

interface MobileViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
}

export function MobileView({ onBlockClick, onCreateEvent }: MobileViewProps) {
  const { blocks, selectedDate, isLoading, error, goToToday, nextWeek, prevWeek } = useCalendarStore();
  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);

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
      </header>

      {/* Error */}
      {error && <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200 text-sm">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {weekDays.map((date) => {
          const dayBlocks = sortBlocksByTime(getBlocksForDay(blocks, date));
          const isCurrentDay = isToday(date);

          return (
            <DaySection
              key={date.toISOString()}
              title={formatDayHeader(date)}
              blocks={dayBlocks}
              onBlockClick={onBlockClick}
              isToday={isCurrentDay}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DaySectionProps {
  title: string;
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  isToday: boolean;
}

function DaySection({ title, blocks, onBlockClick, isToday }: DaySectionProps) {
  return (
    <section className="border-b border-[var(--color-bg-tertiary)] last:border-b-0">
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
            <EventCard key={`${block.calendarId}-${block.id}`} block={block} onClick={() => onBlockClick(block)} />
          ))
        )}
      </div>
    </section>
  );
}
