import { formatWeekHeader, getWeekNumber, isCurrentWeek } from '@/utils/dateUtils';
import ChevronLeftIcon from '@/assets/icons/chevron-left.svg?react';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react';

interface WeekViewHeaderProps {
  selectedDate: Date;
  onGoToToday?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  className?: string;
}

export function WeekViewHeader({
  selectedDate,
  onGoToToday,
  onPrevWeek,
  onNextWeek,
  className = '',
}: WeekViewHeaderProps) {
  const weekNumber = getWeekNumber(selectedDate);
  const isCurrentWeekDisplayed = isCurrentWeek(selectedDate);

  return (
    <header
      className={`flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)] ${className}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
          v.{weekNumber}
        </span>
        <h1
          onClick={onGoToToday}
          className={`text-xl font-bold cursor-pointer transition-colors ${
            isCurrentWeekDisplayed
              ? 'text-[var(--color-accent)]'
              : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
          }`}
        >
          {formatWeekHeader(selectedDate)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
          aria-label="Föregående vecka"
        >
          <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={onGoToToday}
          className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Idag
        </button>

        <button
          onClick={onNextWeek}
          className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
          aria-label="Nästa vecka"
        >
          <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

