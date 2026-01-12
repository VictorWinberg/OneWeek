import { useNavigate, useLocation } from 'react-router-dom';

export function NavigationIcons() {
  const navigate = useNavigate();
  const location = useLocation();

  const isOnTasksPage = location.pathname === '/tasks';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          navigate('/');
        }}
        className={`p-2 rounded-lg transition-colors ${
          !isOnTasksPage
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
        aria-label="Kalender"
      >
        <img src="/icons/calendar.svg" alt="Kalender" className="w-5 h-5" />
      </button>
      <button
        onClick={() => navigate('/tasks')}
        className={`p-2 rounded-lg transition-colors ${
          isOnTasksPage
            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
            : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
        aria-label="Uppgifter"
      >
        <img src="/icons/tasks.svg" alt="Uppgifter" className="w-5 h-5" />
      </button>
    </div>
  );
}
