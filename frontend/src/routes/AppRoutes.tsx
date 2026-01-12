import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Block } from '@/types';
import type { ViewMode } from '@/types/viewMode';

interface AppRoutesProps {
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

function RedirectToLastViewMode() {
  const [lastViewMode] = useLocalStorage<ViewMode>('lastViewMode', 'day');
  return <Navigate to={`/${lastViewMode}`} replace />;
}

export function AppRoutes({ onBlockClick, onCreateEvent, onCreateEventForDate }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<RedirectToLastViewMode />} />
      <Route
        path="/day/:date?"
        element={
          <MainLayout
            viewMode="day"
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
          />
        }
      />
      <Route
        path="/grid/:date?"
        element={
          <MainLayout
            viewMode="grid"
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
          />
        }
      />
      <Route
        path="/user/:date?"
        element={
          <MainLayout
            viewMode="user"
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
          />
        }
      />
      <Route
        path="/hour/:date?"
        element={
          <MainLayout
            viewMode="hour"
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
          />
        }
      />
      <Route
        path="/tasks"
        element={
          <MainLayout
            onBlockClick={onBlockClick}
            onCreateEvent={onCreateEvent}
            onCreateEventForDate={onCreateEventForDate}
          />
        }
      />
      <Route path="*" element={<RedirectToLastViewMode />} />
    </Routes>
  );
}
