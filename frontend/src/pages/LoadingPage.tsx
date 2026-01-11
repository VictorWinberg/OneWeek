export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)]">Laddar...</p>
      </div>
    </div>
  );
}
