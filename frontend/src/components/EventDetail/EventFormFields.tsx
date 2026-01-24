interface EventFormFieldsProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  allDay: boolean;
  onAllDayChange: (checked: boolean) => void;
  allDayId?: string;
  error?: string | null;
}

export function EventFormFields({
  description,
  onDescriptionChange,
  allDay,
  onAllDayChange,
  allDayId = 'allDay',
  error,
}: EventFormFieldsProps) {
  return (
    <>
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Beskrivning</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Valfri beskrivning..."
          rows={3}
          className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
        />
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center gap-2">
        <input
          id={allDayId}
          type="checkbox"
          checked={allDay}
          onChange={(e) => onAllDayChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
        />
        <label htmlFor={allDayId} className="text-sm text-[var(--color-text-primary)]">
          Heldag
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
      )}
    </>
  );
}

