import { DragOverlay } from '@dnd-kit/core';
import { EventCard } from '@/components/WeekView/EventCard';
import { useAppContext } from '@/contexts/AppContext';

interface WeekViewDragOverlayProps {
  /**
   * Whether to use compact event card styling
   * @default false
   */
  compact?: boolean;
  /**
   * Whether to hide the time on the event card
   * @default false
   */
  hideTime?: boolean;
}

/**
 * Shared DragOverlay component for week views
 * Renders a semi-transparent EventCard while dragging
 */
export function WeekViewDragOverlay({ compact = false, hideTime = false }: WeekViewDragOverlayProps) {
  const { activeBlock } = useAppContext();

  return (
    <DragOverlay>
      {activeBlock ? (
        <div className="opacity-90">
          <EventCard
            block={activeBlock}
            compact={compact}
            fillHeight={false}
            isAllDay={activeBlock.allDay}
            hideTime={hideTime}
          />
        </div>
      ) : null}
    </DragOverlay>
  );
}

