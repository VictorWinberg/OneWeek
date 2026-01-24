import { DndContext } from '@dnd-kit/core';
import { useWeekViewData } from '@/hooks/useWeekViewData';
import { useDesktopDragAndDrop } from '@/hooks/useDragAndDrop';
import { WeekViewHeader } from '@/components/WeekView/WeekViewHeader';
import { WeekViewDragOverlay } from '@/components/WeekView/WeekViewDragOverlay';
import { NotConfiguredState, LoadingState, ErrorState } from '@/components/WeekView/WeekViewStates';
import { useAppContext } from '@/contexts/AppContext';
import type { Block } from '@/types';
import type { ViewMode } from '@/types/viewMode';

/**
 * Props passed to the render prop children function
 */
export interface DesktopViewRenderProps {
  blocks: Block[];
  weekDays: Date[];
  selectedDate: Date;
  activeBlock: Block | null;
}

/**
 * View-specific configuration for content container and drag overlay
 */
const VIEW_CONFIG: Record<ViewMode, { contentClassName: string; dragOverlayProps: { compact?: boolean; hideTime?: boolean } }> = {
  grid: {
    contentClassName: 'flex-1 overflow-auto p-4',
    dragOverlayProps: { compact: true },
  },
  day: {
    contentClassName: 'flex-1 flex flex-col overflow-hidden',
    dragOverlayProps: {},
  },
  hour: {
    contentClassName: 'flex-1 flex flex-col overflow-hidden min-h-0',
    dragOverlayProps: { hideTime: true },
  },
  user: {
    contentClassName: 'flex-1 overflow-auto',
    dragOverlayProps: { compact: true },
  },
};

interface DesktopViewProps {
  /**
   * The current view mode - determines content container styling and drag overlay props
   */
  viewMode: ViewMode;
  /**
   * Navigation callbacks
   */
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
  /**
   * Render prop that receives data and renders the view-specific content
   */
  children: (props: DesktopViewRenderProps) => React.ReactNode;
}

/**
 * Desktop view wrapper component that handles common boilerplate:
 * - Data fetching via useWeekViewData
 * - Drag and drop setup via useDesktopDragAndDrop
 * - NotConfigured/Loading/Error states
 * - WeekViewHeader and navigation
 * - DndContext wrapper
 * - WeekViewDragOverlay
 *
 * Individual views only need to provide their unique content via the render prop.
 */
export function DesktopView({
  viewMode,
  onNextWeek,
  onPrevWeek,
  onGoToToday,
  children,
}: DesktopViewProps) {
  const config = VIEW_CONFIG[viewMode];
  const { activeBlock } = useAppContext();

  // Shared data fetching
  const { blocks, weekDays, selectedDate, isLoading, error, isConfigured, updateEventTime, moveEvent } =
    useWeekViewData();

  // Shared drag and drop
  const { handleDragStart, handleDragEnd, sensors } = useDesktopDragAndDrop(blocks, {
    updateEventTime,
    moveEvent,
  });

  // Early return for not configured state
  if (!isConfigured) {
    return <NotConfiguredState />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        <WeekViewHeader
          selectedDate={selectedDate}
          onGoToToday={onGoToToday}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />

        {error && <ErrorState error={error} />}

        <div className={config.contentClassName}>
          {isLoading && blocks.length === 0 ? (
            <LoadingState />
          ) : (
            children({
              blocks,
              weekDays,
              selectedDate,
              activeBlock,
            })
          )}
        </div>
      </div>

      <WeekViewDragOverlay
        compact={config.dragOverlayProps.compact}
        hideTime={config.dragOverlayProps.hideTime}
      />
    </DndContext>
  );
}
