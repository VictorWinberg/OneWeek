import { LogoutButton } from '../Auth/LoginButton';
import { ViewModeSelector } from './ViewModeSelector';
import { NavigationIcons } from './NavigationIcons';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { ViewMode } from '../../types/viewMode';

interface NavigationBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function NavigationBar({ viewMode, onViewModeChange }: NavigationBarProps) {
  const isMobile = useIsMobile();

  return (
    <nav className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-tertiary)] flex-shrink-0">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-baseline">
        <img src="/oneweek.svg" alt="Calendar" className="w-6 h-6" />
        <span>
          <span className="text-[#ef4136]">One</span>Week
        </span>
      </h1>
      <div className="flex items-center gap-4">
        {!isMobile && <ViewModeSelector currentViewMode={viewMode} onViewModeChange={onViewModeChange} />}
        <NavigationIcons viewMode={viewMode} />
        <LogoutButton />
      </div>
    </nav>
  );
}
