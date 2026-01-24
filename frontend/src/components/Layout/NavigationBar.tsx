import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogoutButton } from '@/components/Auth/LoginButton';
import { ViewModeSelector } from '@/components/Layout/ViewModeSelector';
import { NavigationIcons } from '@/components/Layout/NavigationIcons';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuthStore } from '@/stores/authStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { formatWeekHeaderShort, getWeekNumber, getWeekYear, isCurrentWeek } from '@/utils/dateUtils';
import { urlToMobileViewMode, mobileToUrlViewMode, type MobileViewMode, type UrlViewMode } from '@/utils/viewModeUtils';
import type { ViewMode } from '@/types/viewMode';
import CloseIcon from '@/assets/icons/close.svg?react';
import MenuIcon from '@/assets/icons/menu.svg?react';
import CalendarIcon from '@/assets/icons/calendar.svg?react';
import TasksIcon from '@/assets/icons/tasks.svg?react';
import PlusIcon from '@/assets/icons/plus.svg?react';
import TodayIcon from '@/assets/icons/today.svg?react';
import ViewModeIcon from '@/assets/icons/view-mode.svg?react';

interface NavigationBarProps {
  viewMode?: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onGoToToday?: () => void;
  mobileViewMode?: UrlViewMode;
  onMobileViewModeChange?: (mode: UrlViewMode) => void;
}

export function NavigationBar({
  viewMode,
  onViewModeChange,
  onCreateEventForDate,
  onGoToToday,
  mobileViewMode,
  onMobileViewModeChange
}: NavigationBarProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { selectedDate } = useCalendarStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isViewModeDropdownOpen, setIsViewModeDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewModeDropdownRef = useRef<HTMLDivElement>(null);

  const isOnTasksPage = location.pathname === '/tasks';
  const weekNumber = viewMode ? getWeekNumber(selectedDate) : null;
  const shortDate = viewMode ? formatWeekHeaderShort(selectedDate) : null;
  const weekYear = viewMode ? getWeekYear(selectedDate) : null;
  const currentYear = new Date().getFullYear().toString();
  const showYear = weekYear && weekYear !== currentYear;
  const isCurrentWeekDisplayed = viewMode ? isCurrentWeek(selectedDate) : false;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (viewModeDropdownRef.current && !viewModeDropdownRef.current.contains(event.target as Node)) {
        setIsViewModeDropdownOpen(false);
      }
    }

    if (isMenuOpen || isViewModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isViewModeDropdownOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  if (isMobile) {
    return (
      <nav className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] flex-shrink-0 relative">
        {/* Hamburger menu and date */}
        <div className="flex items-center gap-3 flex-1">
          {/* Hamburger menu button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <CloseIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <MenuIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded-lg shadow-lg z-50 overflow-hidden">
                {/* OneWeek logo */}
                <div className="px-4 py-3 border-b border-[var(--color-bg-tertiary)]">
                  <div className="flex items-center gap-2">
                    <img src="/oneweek.svg" alt="OneWeek" className="w-5 h-5" />
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      <span className="text-[#ef4136]">One</span>Week
                    </span>
                  </div>
                </div>

                {/* User image */}
                {user?.picture && (
                  <div className="px-4 py-3 border-b border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                      <span className="text-sm text-[var(--color-text-primary)]">{user.name}</span>
                    </div>
                  </div>
                )}

                {/* Calendar */}
                <button
                  onClick={() => handleNavigate('/')}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)] ${
                    !isOnTasksPage ? 'bg-[var(--color-bg-tertiary)]' : ''
                  }`}
                >
                  <CalendarIcon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm">Kalender</span>
                </button>

                {/* Tasks */}
                <button
                  onClick={() => handleNavigate('/tasks')}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)] ${
                    isOnTasksPage ? 'bg-[var(--color-bg-tertiary)]' : ''
                  }`}
                >
                  <TasksIcon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm">Uppgifter</span>
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-sm text-[var(--color-text-primary)]"
                >
                  <span>Logga ut</span>
                </button>
              </div>
            )}
          </div>

          {/* Date display - only show on calendar views */}
          {shortDate && weekNumber !== null && (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col">
                <span className={`text-sm font-medium leading-tight ${
                  isCurrentWeekDisplayed ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                }`}>
                  {shortDate}
                </span>
                <span className={`text-xs leading-tight ${
                  isCurrentWeekDisplayed ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                }`}>
                  v.{weekNumber}{showYear ? ` · ${weekYear}` : ''}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 ml-auto">
                {/* Create event button */}
                {onCreateEventForDate && (
                  <button
                    onClick={() => onCreateEventForDate(selectedDate)}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
                    aria-label="Skapa event"
                  >
                    <PlusIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}

                {/* Go to today button */}
                {onGoToToday && (
                  <button
                    onClick={onGoToToday}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isCurrentWeekDisplayed
                        ? 'bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)]'
                        : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                    }`}
                    aria-label="Gå till idag"
                  >
                    <TodayIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}

                {/* View mode dropdown */}
                {mobileViewMode && onMobileViewModeChange && (
                  <div className="relative" ref={viewModeDropdownRef}>
                    <button
                      onClick={() => setIsViewModeDropdownOpen(!isViewModeDropdownOpen)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
                      aria-label="Visa läge"
                    >
                      <ViewModeIcon className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {/* Dropdown menu */}
                    {isViewModeDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-40 bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded-lg shadow-lg z-50 overflow-hidden">
                        {(['grid', 'list', 'calendar', 'hour'] as MobileViewMode[]).map((mode) => {
                          const currentMobileMode = urlToMobileViewMode(mobileViewMode, 'grid');
                          const label = {
                            grid: 'Översikt',
                            list: 'Agenda',
                            calendar: 'Personlig',
                            hour: 'Timvy',
                          }[mode];

                          return (
                            <button
                              key={mode}
                              onClick={() => {
                                const urlMode = mobileToUrlViewMode(mode);
                                onMobileViewModeChange(urlMode);
                                setIsViewModeDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                currentMobileMode === mode
                                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] flex-shrink-0">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-baseline">
        <img src="/oneweek.svg" alt="Calendar" className="w-6 h-6" />
        <span>
          <span className="text-[#ef4136]">One</span>Week
        </span>
      </h1>
      <div className="flex items-center gap-4">
        {viewMode && <ViewModeSelector currentViewMode={viewMode} onViewModeChange={onViewModeChange} />}
        <NavigationIcons />
        <LogoutButton />
      </div>
    </nav>
  );
}
