/**
 * Shared state components for week views
 * These components handle the common loading, error, and not configured states
 */

interface NotConfiguredStateProps {
  message?: string;
}

/**
 * Displays a message when the calendar is not configured
 */
export function NotConfiguredState({ message = 'Konfigurera kalendrar för att se events' }: NotConfiguredStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

/**
 * Displays a loading spinner with an optional message
 */
export function LoadingState({ message = 'Laddar events...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)]">{message}</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: Error | unknown;
  fallbackMessage?: string;
}

/**
 * Displays an error message
 */
export function ErrorState({ error, fallbackMessage = 'Failed to load events' }: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;

  return (
    <div className="p-4 bg-red-900/30 border-b border-red-700 text-red-200">
      {errorMessage}
    </div>
  );
}

