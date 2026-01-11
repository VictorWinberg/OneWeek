import { useNavigate } from 'react-router-dom';
import { getWeekMonday } from '../../utils/dateUtils';
import { useCalendarStore } from '../../stores/calendarStore';
import type { ViewMode } from '../../types/viewMode';

interface ViewModeSelectorProps {
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentViewMode, onViewModeChange }: ViewModeSelectorProps) {
  const navigate = useNavigate();
  const { selectedDate } = useCalendarStore();

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'tasks') {
      navigate('/tasks');
    } else {
      onViewModeChange(mode);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-1">
      <button
        onClick={() => handleViewModeChange('day')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentViewMode === 'day'
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        Dagvy
      </button>
      <button
        onClick={() => handleViewModeChange('grid')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentViewMode === 'grid'
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        Översikt
      </button>
      <button
        onClick={() => handleViewModeChange('user')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentViewMode === 'user'
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        Personlig
      </button>
      <button
        onClick={() => handleViewModeChange('hour')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentViewMode === 'hour'
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        Timvy
      </button>
      <button
        onClick={() => handleViewModeChange('tasks')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentViewMode === 'tasks'
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        Uppgifter
      </button>
    </div>
  );
}
