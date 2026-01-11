import { LogoutButton } from '../components/Auth/LoginButton';

export function NotConfiguredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Inga kalendrar konfigurerade</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Lägg till kalender-ID:n i config.json (projektroten) och starta om servern.
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
