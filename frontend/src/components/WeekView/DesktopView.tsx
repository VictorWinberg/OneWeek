import { DndContext } from '@dnd-kit/core';
import { useWeekViewData } from '@/hooks/useWeekViewData';
import { useDesktopDragAndDrop } from '@/hooks/useDragAndDrop';
import { WeekViewHeader } from '@/components/WeekView/WeekViewHeader';
import { WeekViewDragOverlay } from '@/components/WeekView/WeekViewDragOverlay';
import { NotConfiguredState, LoadingState, ErrorState } from '@/components/WeekView/WeekViewStates';
import type { Block } from '@/types';

/**
 * Props passed to the render prop children function
 */
export interface DesktopViewRenderProps {
  blocks: Block[];
  weekDays: Date[];
  selectedDate: Date;
  activeBlock: Block | null;
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
}

interface DesktopViewProps {
  /**
   * Callback when a block/event is clicked
   */
  onBlockClick: (block: Block) => void;
  /**
   * Callback to create a new event for a specific date
   */
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  /**
   * Navigation callbacks
   */
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onGoToToday?: () => void;
  /**
   * Props for the drag overlay
   */
  dragOverlayProps?: {
    compact?: boolean;
    hideTime?: boolean;
  };
  /**
   * Additional class name for the content container
   */
  contentClassName?: string;
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
  onBlockClick,
  onCreateEventForDate,
  onNextWeek,
  onPrevWeek,
  onGoToToday,
  dragOverlayProps = {},
  contentClassName = 'flex-1 overflow-auto',
  children,
}: DesktopViewProps) {
  // Shared data fetching
  const { blocks, weekDays, selectedDate, isLoading, error, isConfigured, updateEventTime, moveEvent } =
    useWeekViewData();

  // Shared drag and drop
  const { activeBlock, handleDragStart, handleDragEnd, sensors } = useDesktopDragAndDrop(blocks, {
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

        <div className={contentClassName}>
          {isLoading ? (
            <LoadingState />
          ) : (
            children({
              blocks,
              weekDays,
              selectedDate,
              activeBlock,
              onBlockClick,
              onCreateEventForDate,
            })
          )}
        </div>
      </div>

      <WeekViewDragOverlay
        activeBlock={activeBlock}
        compact={dragOverlayProps.compact}
        hideTime={dragOverlayProps.hideTime}
      />
    </DndContext>
  );
}

