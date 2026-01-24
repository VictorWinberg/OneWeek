import type { Calendar } from '@/types';
import { getInitial } from '@/types/calendar';
import { useConfigStore } from '@/stores/configStore';
import { useIsMobile } from '@/hooks/useMediaQuery';
import CheckmarkFilledIcon from '@/assets/icons/checkmark-filled.svg?react';

interface ResponsibilitySelectorProps {
  currentCalendarId: string;
  onSelect: (calendarId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ResponsibilitySelector({
  currentCalendarId,
  onSelect,
  disabled = false,
  compact: forceCompact,
}: ResponsibilitySelectorProps) {
  const { persons } = useConfigStore();
  const isMobile = useIsMobile();
  const compact = forceCompact ?? isMobile;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Ansvarig</label>
      <div className={compact ? 'flex gap-2 overflow-x-auto' : 'grid grid-cols-2 gap-2'}>
        {persons.map((person) => (
          <CalendarButton
            key={person.id}
            person={person}
            isSelected={person.id === currentCalendarId}
            onClick={() => onSelect(person.id)}
            disabled={disabled || person.id === currentCalendarId}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface CalendarButtonProps {
  person: Calendar;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
}

function CalendarButton({ person, isSelected, onClick, disabled, compact = false }: CalendarButtonProps) {
  const initial = getInitial(person.name);

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={person.name}
        className={`
          flex items-center justify-center p-2 rounded-lg transition-all duration-200 flex-shrink-0
          ${
            isSelected
              ? 'bg-[var(--color-bg-tertiary)] ring-2 ring-white/30'
              : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]'
          }
          ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-white/50
        `}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm relative"
          style={{
            backgroundColor: person.color,
            color: 'var(--color-bg-primary)',
          }}
        >
          {initial.charAt(0)}
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
              <CheckmarkFilledIcon className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 p-3 rounded-lg transition-all duration-200
        ${
          isSelected
            ? 'bg-[var(--color-bg-tertiary)] ring-2 ring-white/30'
            : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]'
        }
        ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
        focus:outline-none focus:ring-2 focus:ring-white/50
      `}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
        style={{
          backgroundColor: person.color,
          color: 'var(--color-bg-primary)',
        }}
      >
        {initial.charAt(0)}
      </div>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">{person.name}</span>
      {isSelected && (
        <CheckmarkFilledIcon className="w-4 h-4 ml-auto text-[var(--color-accent)]" aria-hidden="true" />
      )}
    </button>
  );
}
