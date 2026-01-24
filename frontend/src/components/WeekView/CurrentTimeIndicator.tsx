import { useCurrentTimePosition } from '@/hooks/useCurrentTimePosition';

interface CurrentTimeIndicatorProps {
  date: Date;
  /**
   * Whether to show as a horizontal line (for hour views) or as an inline indicator (for list views)
   */
  variant?: 'line' | 'inline';
  /**
   * Pixels per hour for line variant (not used for inline variant)
   */
  pixelsPerHour?: number;
}

/**
 * Component that displays a current time indicator
 * For hour views: shows as a horizontal line at the current time position
 * For list views: shows as an inline indicator between events
 */
export function CurrentTimeIndicator({ date, variant = 'inline', pixelsPerHour = 60 }: CurrentTimeIndicatorProps) {
  const { topPosition, shouldShow } = useCurrentTimePosition(date, pixelsPerHour);

  if (!shouldShow) {
    return null;
  }

  if (variant === 'line' && topPosition !== null) {
    const isMobile = pixelsPerHour === 50;
    return (
      <div
        className="absolute left-0 right-0 z-20 pointer-events-none"
        style={{ top: `${topPosition}px` }}
      >
        <div className="relative">
          {/* Accent dot on the left */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 bg-[var(--color-accent)] rounded-full shadow-sm ${
              isMobile ? '-left-0.5 w-1.5 h-1.5' : '-left-1 w-2 h-2'
            }`}
          />
          {/* Accent line */}
          <div className="h-0.5 bg-[var(--color-accent)] w-full shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative my-1 pointer-events-none">
      <div className="flex items-center gap-0">
        {/* Accent dot */}
        <div className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full flex-shrink-0" />
        {/* Accent line */}
        <div className="h-0.5 bg-[var(--color-accent)] flex-1" />
      </div>
    </div>
  );
}

