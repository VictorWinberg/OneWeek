import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { useCalendarStore } from '@/stores/calendarStore';
import { useEventPanel } from '@/hooks/useEventPanel';
import type { Block } from '@/types';

interface EventPanel {
  isOpen: boolean;
  date: Date | undefined;
  calendarId: string | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
  openPanel: () => void;
  openPanelWithDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  closePanel: () => void;
}

interface AppContextValue {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  onEmptyClick: (date: Date, calendarId?: string) => void;
  eventPanel: EventPanel;
  // WeekView-specific state
  setHolding: (blockId: string | null) => void;
  setActiveBlock: (block: Block | null) => void;
  activeBlock: Block | null;
  holdingBlockId: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Top-level app context provider that handles block clicks and event creation
 * This removes the need to pass these handlers through props
 */
export function AppProvider({ children }: AppProviderProps) {
  const { selectBlock } = useCalendarStore();
  const eventPanel = useEventPanel();
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [holdingBlockId, setHoldingBlockId] = useState<string | null>(null);

  const onBlockClick = useCallback(
    (block: Block) => {
      selectBlock(block);
    },
    [selectBlock]
  );

  const onCreateEventForDate = useCallback(
    (date: Date, calendarId?: string, startTime?: string, endTime?: string) => {
      eventPanel.openPanelWithDate(date, calendarId, startTime, endTime);
    },
    [eventPanel]
  );

  const onEmptyClick = useCallback(
    (date: Date, calendarId?: string) => {
      onCreateEventForDate(date, calendarId);
    },
    [onCreateEventForDate]
  );

  return (
    <AppContext.Provider
      value={{
        onBlockClick,
        onCreateEventForDate,
        onEmptyClick,
        eventPanel,
        setHolding: setHoldingBlockId,
        setActiveBlock,
        activeBlock,
        holdingBlockId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
