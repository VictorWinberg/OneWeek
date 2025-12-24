import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useConfigStore } from './stores/configStore';
import { useCalendarStore } from './stores/calendarStore';
import { WeekView } from './components/WeekView/WeekView';
import { MobileView } from './components/WeekView/MobileView';
import { EventDetailPanel } from './components/EventDetail/EventDetailPanel';
import { EventCreatePanel } from './components/EventDetail/EventCreatePanel';
import { LoginButton, LogoutButton } from './components/Auth/LoginButton';
import { useIsMobile } from './hooks/useMediaQuery';
import type { Block } from './types';
import './index.css';

function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const { isConfigured, isLoading: configLoading, error: configError, loadConfig } = useConfigStore();
  const { selectBlock, selectedBlock } = useCalendarStore();
  const isMobile = useIsMobile();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | undefined>(undefined);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load config from config.json when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [isAuthenticated, loadConfig]);

  const handleBlockClick = (block: Block) => {
    selectBlock(block);
  };

  const handleCloseDetail = () => {
    selectBlock(null);
  };

  const handleOpenCreatePanel = () => {
    setCreateEventDate(undefined);
    setIsCreatePanelOpen(true);
  };

  const handleOpenCreatePanelWithDate = (date: Date) => {
    setCreateEventDate(date);
    setIsCreatePanelOpen(true);
  };

  const handleCloseCreatePanel = () => {
    setIsCreatePanelOpen(false);
    setCreateEventDate(undefined);
  };

  // Loading state
  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Laddar...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2 flex items-baseline justify-center">
            <img src="/calendar.svg" alt="Calendar" className="w-10 h-10" />
            <span>
              <span className="text-[#ef4136]">One</span>Week
            </span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">Familjekalendern för veckofokus</p>
        </div>

        <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 text-center">Kom igång</h2>
          <p className="text-[var(--color-text-secondary)] text-center mb-6">
            Logga in med Google för att ansluta dina kalendrar.
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
          <FeatureCard icon="📅" title="Veckovy" description="Se hela familjens vecka" />
          <FeatureCard icon="🎯" title="Ansvar" description="Tydligt vem som äger vad" />
          <FeatureCard icon="⚡" title="Snabbt" description="Byt ansvar med ett klick" />
        </div>
      </div>
    );
  }

  // Config error - show error message
  if (configError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Konfigurationsfel</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">{configError}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Kontrollera att config.json finns i projektroten och innehåller korrekta kalender-ID:n.
          </p>
          <button
            onClick={() => loadConfig()}
            className="px-6 py-3 bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  // Not configured - show message
  if (!isConfigured) {
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

  // Main app
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <nav className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)]">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-baseline gap-2">
          <img src="/calendar.svg" alt="Calendar" className="w-6 h-6" />
          <span>
            <span className="text-[#ef4136]">One</span>Week
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <LogoutButton />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isMobile ? (
          <MobileView onBlockClick={handleBlockClick} onCreateEvent={handleOpenCreatePanel} />
        ) : (
          <WeekView
            onBlockClick={handleBlockClick}
            onCreateEvent={handleOpenCreatePanel}
            onCreateEventForDate={handleOpenCreatePanelWithDate}
          />
        )}
      </main>

      {/* Event detail panel */}
      <EventDetailPanel block={selectedBlock} onClose={handleCloseDetail} />

      {/* Event create panel */}
      <EventCreatePanel isOpen={isCreatePanelOpen} onClose={handleCloseCreatePanel} defaultDate={createEventDate} />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-medium text-[var(--color-text-primary)] text-sm">{title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>
    </div>
  );
}

export default App;
