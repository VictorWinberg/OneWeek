interface DateTimeFieldsProps {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  allDay: boolean;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  startDateId?: string;
  endDateId?: string;
  startTimeId?: string;
  endTimeId?: string;
}

export function DateTimeFields({
  startDate,
  endDate,
  startTime,
  endTime,
  allDay,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
  startDateId,
  endDateId,
  startTimeId,
  endTimeId,
}: DateTimeFieldsProps) {
  return (
    <>
      {/* Start Date and Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={startDateId}
            className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1"
          >
            Startdatum *
          </label>
          <input
            id={startDateId}
            type="date"
            value={new Intl.DateTimeFormat('sv-SE').format(startDate)}
            onChange={(e) => {
              const newStartDate = new Date(e.target.value + 'T12:00:00');
              onStartDateChange(newStartDate);
              // If end date is before start date, update it
              if (endDate < newStartDate) {
                onEndDateChange(newStartDate);
              }
            }}
            className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        {!allDay && (
          <div>
            <label
              htmlFor={startTimeId}
              className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1"
            >
              Starttid *
            </label>
            <input
              id={startTimeId}
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* End Date and Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={endDateId} className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Slutdatum *
          </label>
          <input
            id={endDateId}
            type="date"
            value={new Intl.DateTimeFormat('sv-SE').format(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value + 'T12:00:00'))}
            min={new Intl.DateTimeFormat('sv-SE').format(startDate)}
            className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        {!allDay && (
          <div>
            <label htmlFor={endTimeId} className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Sluttid *
            </label>
            <input
              id={endTimeId}
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        )}
      </div>
    </>
  );
}

