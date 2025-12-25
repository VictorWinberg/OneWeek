import { useState } from 'react';
import type { RecurrenceRule, RecurrenceFrequency, RecurrenceDay } from '@/types/block';

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
  disabled?: boolean;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Dagligen' },
  { value: 'WEEKLY', label: 'Veckovis' },
  { value: 'MONTHLY', label: 'Månadsvis' },
  { value: 'YEARLY', label: 'Årligen' },
];

const WEEKDAY_OPTIONS: { value: RecurrenceDay; label: string }[] = [
  { value: 'MO', label: 'Mån' },
  { value: 'TU', label: 'Tis' },
  { value: 'WE', label: 'Ons' },
  { value: 'TH', label: 'Tor' },
  { value: 'FR', label: 'Fre' },
  { value: 'SA', label: 'Lör' },
  { value: 'SU', label: 'Sön' },
];

type EndType = 'never' | 'count' | 'until';

export function RecurrenceSelector({ value, onChange, disabled }: RecurrenceSelectorProps) {
  const [isRecurring, setIsRecurring] = useState<boolean>(!!value);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(value?.frequency || 'WEEKLY');
  const [interval, setInterval] = useState<number>(value?.interval || 1);
  const [selectedDays, setSelectedDays] = useState<RecurrenceDay[]>(value?.byDay || []);
  const [endType, setEndType] = useState<EndType>(
    value?.until ? 'until' : value?.count ? 'count' : 'never'
  );
  const [count, setCount] = useState<number>(value?.count || 10);
  const [until, setUntil] = useState<string>(
    value?.until ? new Intl.DateTimeFormat('sv-SE').format(value.until) : ''
  );

  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
    if (!checked) {
      onChange(null);
    } else {
      updateRecurrence();
    }
  };

  const updateRecurrence = () => {
    const rule: RecurrenceRule = {
      frequency,
      interval: interval > 1 ? interval : undefined,
      byDay: frequency === 'WEEKLY' && selectedDays.length > 0 ? selectedDays : undefined,
    };

    if (endType === 'count') {
      rule.count = count;
    } else if (endType === 'until' && until) {
      rule.until = new Date(until + 'T23:59:59');
    }

    onChange(rule);
  };

  const handleFrequencyChange = (newFrequency: RecurrenceFrequency) => {
    setFrequency(newFrequency);
    if (isRecurring) {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  const handleIntervalChange = (newInterval: number) => {
    setInterval(newInterval);
    if (isRecurring) {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  const handleDayToggle = (day: RecurrenceDay) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    if (isRecurring) {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  const handleEndTypeChange = (newEndType: EndType) => {
    setEndType(newEndType);
    if (isRecurring) {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  const handleCountChange = (newCount: number) => {
    setCount(newCount);
    if (isRecurring && endType === 'count') {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  const handleUntilChange = (newUntil: string) => {
    setUntil(newUntil);
    if (isRecurring && endType === 'until') {
      setTimeout(() => updateRecurrence(), 0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recurring Toggle */}
      <div className="flex items-center gap-2">
        <input
          id="recurring"
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => handleRecurringToggle(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
        />
        <label htmlFor="recurring" className="text-sm font-medium text-[var(--color-text-primary)]">
          Återkommande händelse
        </label>
      </div>

      {isRecurring && (
        <div className="ml-6 space-y-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Upprepa
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFrequencyChange(option.value)}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    frequency === option.value
                      ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label htmlFor="interval" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Varje
            </label>
            <div className="flex items-center gap-2">
              <input
                id="interval"
                type="number"
                min="1"
                max="100"
                value={interval}
                onChange={(e) => handleIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={disabled}
                className="w-20 px-3 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {frequency === 'DAILY' && (interval === 1 ? 'dag' : 'dagar')}
                {frequency === 'WEEKLY' && (interval === 1 ? 'vecka' : 'veckor')}
                {frequency === 'MONTHLY' && (interval === 1 ? 'månad' : 'månader')}
                {frequency === 'YEARLY' && (interval === 1 ? 'år' : 'år')}
              </span>
            </div>
          </div>

          {/* Weekly: Select days */}
          {frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Upprepa på
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    disabled={disabled}
                    className={`w-12 h-10 rounded-lg text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Slutar</label>
            <div className="space-y-2">
              {/* Never */}
              <div className="flex items-center gap-2">
                <input
                  id="endNever"
                  type="radio"
                  checked={endType === 'never'}
                  onChange={() => handleEndTypeChange('never')}
                  disabled={disabled}
                  className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="endNever" className="text-sm text-[var(--color-text-primary)]">
                  Aldrig
                </label>
              </div>

              {/* After count */}
              <div className="flex items-center gap-2">
                <input
                  id="endCount"
                  type="radio"
                  checked={endType === 'count'}
                  onChange={() => handleEndTypeChange('count')}
                  disabled={disabled}
                  className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="endCount" className="text-sm text-[var(--color-text-primary)]">
                  Efter
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={count}
                  onChange={(e) => handleCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={disabled || endType !== 'count'}
                  className="w-20 px-2 py-1 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">gånger</span>
              </div>

              {/* Until date */}
              <div className="flex items-center gap-2">
                <input
                  id="endUntil"
                  type="radio"
                  checked={endType === 'until'}
                  onChange={() => handleEndTypeChange('until')}
                  disabled={disabled}
                  className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="endUntil" className="text-sm text-[var(--color-text-primary)]">
                  Till
                </label>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => handleUntilChange(e.target.value)}
                  disabled={disabled || endType !== 'until'}
                  className="px-2 py-1 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
