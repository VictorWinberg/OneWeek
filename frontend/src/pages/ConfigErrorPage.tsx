interface ConfigErrorPageProps {
  error: string;
  onRetry: () => void;
}

export function ConfigErrorPage({ error, onRetry }: ConfigErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-red-400 mb-4">Konfigurationsfel</h2>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Kontrollera att config.json finns i projektroten och innehåller korrekta kalender-ID:n.
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Försök igen
        </button>
      </div>
    </div>
  );
}
