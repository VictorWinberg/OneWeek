import type { PersonId, Person } from '../../types';
import { PERSON_LIST } from '../../types';

interface ResponsibilitySelectorProps {
  currentPersonId: PersonId;
  onSelect: (personId: PersonId) => void;
  disabled?: boolean;
}

export function ResponsibilitySelector({
  currentPersonId,
  onSelect,
  disabled = false,
}: ResponsibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
        Ansvarig
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PERSON_LIST.map((person) => (
          <PersonButton
            key={person.id}
            person={person}
            isSelected={person.id === currentPersonId}
            onClick={() => onSelect(person.id)}
            disabled={disabled || person.id === currentPersonId}
          />
        ))}
      </div>
    </div>
  );
}

interface PersonButtonProps {
  person: Person;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function PersonButton({ person, isSelected, onClick, disabled }: PersonButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 p-3 rounded-lg transition-all duration-200
        ${isSelected
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
        {person.initial.charAt(0)}
      </div>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">
        {person.name}
      </span>
      {isSelected && (
        <svg className="w-4 h-4 ml-auto text-[var(--color-accent)]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

