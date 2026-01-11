import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addWeeks, subWeeks } from 'date-fns';
import { useCalendarStore } from '@/stores/calendarStore';
import { getWeekMonday, parseDateParam } from '@/utils/dateUtils';
import { NavigationBar } from '@/components/Layout/NavigationBar';
import { DayView } from '@/components/WeekView/DayView';
import { GridView } from '@/components/WeekView/GridView';
import { UserView } from '@/components/WeekView/UserView';
import { HourView } from '@/components/WeekView/HourView';
import { MobileView } from '@/components/WeekView/MobileView';
import { TasksView } from '@/components/TasksView/TasksView';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Block } from '@/types';
import type { ViewMode } from '@/types/viewMode';

interface MainLayoutProps {
  viewMode?: ViewMode;
  onBlockClick: (block: Block) => void;
  onCreateEvent: () => void;
  onCreateEventForDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

export function MainLayout({ viewMode, onBlockClick, onCreateEvent, onCreateEventForDate }: MainLayoutProps) {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { selectedDate, setSelectedDate } = useCalendarStore();
  const [, setLastViewMode] = useLocalStorage<ViewMode>('lastViewMode', 'day');

  // Save view mode to localStorage when it changes
  useEffect(() => {
    if (viewMode) {
      setLastViewMode(viewMode);
    }
  }, [viewMode, setLastViewMode]);

  // Sync URL date parameter with calendar store (skip when no viewMode - tasks page)
  useEffect(() => {
    if (!viewMode) return; // Tasks view doesn't use date parameter

    const parsedDate = parseDateParam(date);
    if (parsedDate) {
      // URL has a date, sync to store
      setSelectedDate(parsedDate);
    } else if (date) {
      // Invalid date in URL, redirect to current week
      navigate(`/${viewMode}/${getWeekMonday(new Date())}`, { replace: true });
    }
    // If no date in URL, we'll add it on first render below
  }, [date, viewMode, navigate, setSelectedDate]);

  // If no date in URL, add the current week's Monday (skip when no viewMode - tasks page)
  useEffect(() => {
    if (!viewMode) return; // Tasks view doesn't use date parameter

    if (!date) {
      const mondayStr = getWeekMonday(selectedDate);
      navigate(`/${viewMode}/${mondayStr}`, { replace: true });
    }
  }, [date, viewMode, selectedDate, navigate]);

  // Navigation handlers that update URL
  const handleNextWeek = useCallback(() => {
    if (!viewMode) return;
    const nextWeekDate = addWeeks(selectedDate, 1);
    const mondayStr = getWeekMonday(nextWeekDate);
    navigate(`/${viewMode}/${mondayStr}`);
  }, [selectedDate, viewMode, navigate]);

  const handlePrevWeek = useCallback(() => {
    if (!viewMode) return;
    const prevWeekDate = subWeeks(selectedDate, 1);
    const mondayStr = getWeekMonday(prevWeekDate);
    navigate(`/${viewMode}/${mondayStr}`);
  }, [selectedDate, viewMode, navigate]);

  const handleGoToToday = useCallback(() => {
    const todayMonday = getWeekMonday(new Date());
    if (viewMode) {
      navigate(`/${viewMode}/${todayMonday}`);
    } else {
      navigate(`/day/${todayMonday}`);
    }
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
      <NavigationBar viewMode={viewMode} onViewModeChange={handleViewModeChange} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-h-0">
        {!viewMode ? (
          <TasksView onGoToToday={handleGoToToday} />
        ) : isMobile ? (
          <MobileView
            onBlockClick={onBlockClick}
            onCreateEventForDate={onCreateEventForDate}
            viewMode={viewMode}
            onNextWeek={handleNextWeek}
            onPrevWeek={handlePrevWeek}
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
