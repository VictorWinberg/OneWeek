import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useConfigStore } from './stores/configStore';
import { useCalendarStore } from './stores/calendarStore';
import { WeekView } from './components/WeekView/WeekView';
import { MobileView } from './components/WeekView/MobileView';
import { EventDetailPanel } from './components/EventDetail/EventDetailPanel';
import { CalendarSetup } from './components/CalendarConfig/CalendarSetup';
import { LoginButton, LogoutButton } from './components/Auth/LoginButton';
import { useIsMobile } from './hooks/useMediaQuery';
import type { Block } from './types';
import './index.css';

function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const { isConfigured } = useConfigStore();
  const { selectBlock, selectedBlock } = useCalendarStore();
  const [showSetup, setShowSetup] = useState(false);
  const isMobile = useIsMobile();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show setup if authenticated but not configured
  useEffect(() => {
    if (isAuthenticated && !isConfigured) {
      setShowSetup(true);
    }
  }, [isAuthenticated, isConfigured]);

  const handleBlockClick = (block: Block) => {
    selectBlock(block);
  };

  const handleCloseDetail = () => {
    selectBlock(null);
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  // Loading state
  if (authLoading) {
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
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            OneWeek
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Familjekalendern för veckofokus
          </p>
        </div>

        <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 text-center">
            Kom igång
          </h2>
          <p className="text-[var(--color-text-secondary)] text-center mb-6">
            Logga in med Google för att ansluta dina kalendrar.
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
          <FeatureCard
            icon="📅"
            title="Veckovy"
            description="Se hela familjens vecka"
          />
          <FeatureCard
            icon="🎯"
            title="Ansvar"
            description="Tydligt vem som äger vad"
          />
          <FeatureCard
            icon="⚡"
            title="Snabbt"
            description="Byt ansvar med ett klick"
          />
        </div>
      </div>
    );
  }

  // Show calendar setup
  if (showSetup) {
    return (
      <div className="min-h-screen">
        <header className="flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)]">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            OneWeek
          </h1>
          <LogoutButton />
        </header>
        <CalendarSetup onComplete={handleSetupComplete} />
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <nav className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)]">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          OneWeek
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSetup(true)}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="Inställningar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <LogoutButton />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isMobile ? (
          <MobileView onBlockClick={handleBlockClick} />
        ) : (
          <WeekView onBlockClick={handleBlockClick} />
        )}
      </main>

      {/* Event detail panel */}
      <EventDetailPanel block={selectedBlock} onClose={handleCloseDetail} />
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
