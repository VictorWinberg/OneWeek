import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { startOfWeek, addWeeks, subWeeks, format, parseISO, isValid, isSameDay } from 'date-fns';
import { useAuthStore } from './stores/authStore';
import { useConfigStore } from './stores/configStore';
import { useCalendarStore } from './stores/calendarStore';
import { DayView } from './components/WeekView/DayView';
import { GridView } from './components/WeekView/GridView';
import { UserView } from './components/WeekView/UserView';
import { HourView } from './components/WeekView/HourView';
import { MobileView } from './components/WeekView/MobileView';
import { EventDetailPanel } from './components/EventDetail/EventDetailPanel';
import { EventCreatePanel } from './components/EventDetail/EventCreatePanel';
import { LoginButton, LogoutButton } from './components/Auth/LoginButton';
import { useIsMobile } from './hooks/useMediaQuery';
import type { Block } from './types';
import './index.css';

type ViewMode = 'day' | 'grid' | 'user' | 'hour';

// Helper to get Monday of the week for a given date
function getWeekMonday(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

// Helper to parse date from URL parameter
function parseDateParam(dateParam: string | undefined): Date | null {
  if (!dateParam) return null;
  try {
    const parsed = parseISO(dateParam);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid date format
  }
  return null;
}

function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const { isConfigured, isLoading: configLoading, error: configError, loadConfig } = useConfigStore();
  const { selectBlock, selectedBlock } = useCalendarStore();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | undefined>(undefined);
  const [createEventCalendarId, setCreateEventCalendarId] = useState<string | undefined>(undefined);
  const [createEventStartTime, setCreateEventStartTime] = useState<string | undefined>(undefined);
  const [createEventEndTime, setCreateEventEndTime] = useState<string | undefined>(undefined);

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
    setCreateEventCalendarId(undefined);
    setCreateEventStartTime(undefined);
    setCreateEventEndTime(undefined);
    setIsCreatePanelOpen(true);
  };

  const handleOpenCreatePanelWithDate = (date: Date, calendarId?: string, startTime?: string, endTime?: string) => {
    setCreateEventDate(date);
    setCreateEventCalendarId(calendarId);
    setCreateEventStartTime(startTime);
    setCreateEventEndTime(endTime);
    setIsCreatePanelOpen(true);
  };

  const handleCloseCreatePanel = () => {
    setIsCreatePanelOpen(false);
    setCreateEventDate(undefined);
    setCreateEventCalendarId(undefined);
    setCreateEventStartTime(undefined);
    setCreateEventEndTime(undefined);
  };

  // Render routes for authenticated users
  const renderAuthenticatedApp = () => (
    <Routes>
      <Route path="/" element={<Navigate to="/day" replace />} />
      <Route
        path="/day/:date?"
        element={
          <MainLayout
            viewMode="day"
            onBlockClick={handleBlockClick}
            onCreateEvent={handleOpenCreatePanel}
            onCreateEventForDate={handleOpenCreatePanelWithDate}
          />
        }
      />
      <Route
        path="/grid/:date?"
        element={
          <MainLayout
            viewMode="grid"
            onBlockClick={handleBlockClick}
            onCreateEvent={handleOpenCreatePanel}
            onCreateEventForDate={handleOpenCreatePanelWithDate}
          />
        }
      />
      <Route
        path="/user/:date?"
        element={
          <MainLayout
            viewMode="user"
            onBlockClick={handleBlockClick}
            onCreateEvent={handleOpenCreatePanel}
            onCreateEventForDate={handleOpenCreatePanelWithDate}
          />
        }
      />
      <Route
        path="/hour/:date?"
        element={
          <MainLayout
            viewMode="hour"
            onBlockClick={handleBlockClick}
            onCreateEvent={handleOpenCreatePanel}
            onCreateEventForDate={handleOpenCreatePanelWithDate}
          />
        }
      />
      <Route path="*" element={<Navigate to="/day" replace />} />
    </Routes>
  );

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
            <img src="/oneweek.svg" alt="Calendar" className="w-10 h-10" />
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

  // Main authenticated app with routing
  return (
    <>
      {renderAuthenticatedApp()}
      {/* Event detail panel */}
      <EventDetailPanel block={selectedBlock} onClose={handleCloseDetail} />
      {/* Event create panel */}
      <EventCreatePanel
        isOpen={isCreatePanelOpen}
        onClose={handleCloseCreatePanel}
        defaultDate={createEventDate}
        defaultCalendarId={createEventCalendarId}
        defaultStartTime={createEventStartTime}
        defaultEndTime={createEventEndTime}
      />
    </>
  );
}

// MainLayout component that handles URL-based navigation
interface MainLayoutProps {
  viewMode: ViewMode;
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

function MainLayout({ viewMode, onBlockClick, onCreateEvent, onCreateEventForDate }: MainLayoutProps) {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { selectedDate, setSelectedDate } = useCalendarStore();
  
  // Track if we're currently syncing from URL to prevent loops
  const isSyncingFromUrl = useRef(false);

  // Unified URL/store synchronization - URL is the source of truth
  useEffect(() => {
    const parsedDate = parseDateParam(date);
    
    if (parsedDate) {
      // URL has a valid date - sync to store if different
      if (!isSameDay(parsedDate, selectedDate)) {
        isSyncingFromUrl.current = true;
        setSelectedDate(parsedDate);
        // Reset flag after React processes the state update
        requestAnimationFrame(() => {
          isSyncingFromUrl.current = false;
        });
      }
    } else {
      // No date or invalid date in URL - redirect to current week's Monday
      // Use selectedDate if we have one, otherwise use today
      const targetDate = isSyncingFromUrl.current ? new Date() : selectedDate;
      const mondayStr = getWeekMonday(targetDate);
      navigate(`/${viewMode}/${mondayStr}`, { replace: true });
    }
  }, [date, viewMode, navigate, setSelectedDate, selectedDate]);

  // Navigation handlers that update URL
  const handleNextWeek = useCallback(() => {
    const nextWeekDate = addWeeks(selectedDate, 1);
    const mondayStr = getWeekMonday(nextWeekDate);
    navigate(`/${viewMode}/${mondayStr}`);
  }, [selectedDate, viewMode, navigate]);

  const handlePrevWeek = useCallback(() => {
    const prevWeekDate = subWeeks(selectedDate, 1);
    const mondayStr = getWeekMonday(prevWeekDate);
    navigate(`/${viewMode}/${mondayStr}`);
  }, [selectedDate, viewMode, navigate]);

  const handleGoToToday = useCallback(() => {
    const todayMonday = getWeekMonday(new Date());
    navigate(`/${viewMode}/${todayMonday}`);
  }, [viewMode, navigate]);

  // View mode change handler
  const handleViewModeChange = useCallback(
    (newMode: ViewMode) => {
      const mondayStr = getWeekMonday(selectedDate);
      navigate(`/${newMode}/${mondayStr}`);
    },
    [selectedDate, navigate]
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top navigation */}
      <nav className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] flex-shrink-0">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-baseline">
          <img src="/oneweek.svg" alt="Calendar" className="w-6 h-6" />
          <span>
            <span className="text-[#ef4136]">One</span>Week
          </span>
        </h1>
        <div className="flex items-center gap-4">
          {!isMobile && (
            <div className="flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('day')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Dagvy
              </button>
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Översikt
              </button>
              <button
                onClick={() => handleViewModeChange('user')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'user'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Användarvy
              </button>
              <button
                onClick={() => handleViewModeChange('hour')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'hour'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Timvy
              </button>
            </div>
          )}
          <LogoutButton />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-h-0">
        {isMobile ? (
          <MobileView
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
            viewMode={viewMode}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
            onGoToToday={handleGoToToday}
            onViewModeChange={handleViewModeChange}
          />
        ) : viewMode === 'day' ? (
          <DayView
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
            onGoToToday={handleGoToToday}
          />
        ) : viewMode === 'grid' ? (
          <GridView
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
            onGoToToday={handleGoToToday}
          />
        ) : viewMode === 'hour' ? (
          <HourView
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
            onGoToToday={handleGoToToday}
          />
        ) : (
          <UserView
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
            onGoToToday={handleGoToToday}
          />
        )}
      </main>
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
