import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { EventDetailPanel } from '@/components/EventDetail/EventDetailPanel';
import { EventCreatePanel } from '@/components/EventDetail/EventCreatePanel';
import { LoadingPage } from '@/pages/LoadingPage';
import { LoginPage } from '@/pages/LoginPage';
import { ConfigErrorPage } from '@/pages/ConfigErrorPage';
import { NotConfiguredPage } from '@/pages/NotConfiguredPage';
import { AppRoutes } from '@/routes/AppRoutes';
import { useEventPanel } from '@/hooks/useEventPanel';
import type { Block } from '@/types';
import './index.css';

function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const { isConfigured, isLoading: configLoading, error: configError, loadConfig } = useConfigStore();
  const { selectBlock, selectedBlock } = useCalendarStore();
  const eventPanel = useEventPanel();

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

  // Loading state
  if (authLoading || configLoading) {
    return <LoadingPage />;
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Config error - show error message
  if (configError) {
    return <ConfigErrorPage error={configError} onRetry={loadConfig} />;
  }

  // Not configured - show message
  if (!isConfigured) {
    return <NotConfiguredPage />;
  }

  // Main authenticated app with routing
  return (
    <>
      <AppRoutes
        onBlockClick={handleBlockClick}
        onCreateEvent={eventPanel.openPanel}
        onCreateEventForDate={eventPanel.openPanelWithDate}
      />
      <EventDetailPanel block={selectedBlock} onClose={handleCloseDetail} />
      <EventCreatePanel
        isOpen={eventPanel.isOpen}
        onClose={eventPanel.closePanel}
        defaultDate={eventPanel.date}
        defaultCalendarId={eventPanel.calendarId}
        defaultStartTime={eventPanel.startTime}
        defaultEndTime={eventPanel.endTime}
      />
    </>
  );
}

export default App;
