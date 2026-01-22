import { MobileListView } from '@/components/WeekView/MobileListView';
import { MobileGridView } from '@/components/WeekView/MobileGridView';
import { MobileUserView } from '@/components/WeekView/MobileUserView';
import { MobileHourView } from '@/components/WeekView/MobileHourView';
import type { Block } from '@/types';
import type { MobileViewMode } from '@/utils/viewModeUtils';

interface MobileViewContentProps {
  weekDays: Date[];
  blocks: Block[];
  mobileViewMode: MobileViewMode;
  calendars: Array<{ id: string; name: string }>;
  activeBlock: Block | null;
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

export function MobileViewContent({
  weekDays,
  blocks,
  mobileViewMode,
  calendars,
  activeBlock,
  onBlockClick,
  onCreateEventForDate,
  onPrevWeek,
  onNextWeek,
}: MobileViewContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      {mobileViewMode === 'list' ? (
        <MobileListView
          weekDays={weekDays}
          blocks={blocks}
          onBlockClick={onBlockClick}
          onCreateEventForDate={onCreateEventForDate}
          activeBlock={activeBlock}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />
      ) : mobileViewMode === 'grid' ? (
        <MobileGridView
          weekDays={weekDays}
          blocks={blocks}
          onBlockClick={onBlockClick}
          onCreateEventForDate={onCreateEventForDate}
          activeBlock={activeBlock}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />
      ) : mobileViewMode === 'hour' ? (
        <MobileHourView
          weekDays={weekDays}
          blocks={blocks}
          onBlockClick={onBlockClick}
          activeBlock={activeBlock}
          onCreateEventForDate={onCreateEventForDate}
        />
      ) : (
        <MobileUserView
          weekDays={weekDays}
          blocks={blocks}
          calendars={calendars}
          onBlockClick={onBlockClick}
          onCreateEventForDate={onCreateEventForDate}
          activeBlock={activeBlock}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />
      )}
    </div>
  );
}

