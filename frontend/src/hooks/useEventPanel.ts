import { useState } from 'react';

interface UseEventPanelReturn {
  isOpen: boolean;
  date: Date | undefined;
  calendarId: string | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
  openPanel: () => void;
  openPanelWithDate: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  closePanel: () => void;
}

export function useEventPanel(): UseEventPanelReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [calendarId, setCalendarId] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState<string | undefined>(undefined);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);

  const openPanel = () => {
    setDate(undefined);
    setCalendarId(undefined);
    setStartTime(undefined);
    setEndTime(undefined);
    setIsOpen(true);
  };

  const openPanelWithDate = (date: Date, calendarId?: string, startTime?: string, endTime?: string) => {
    setDate(date);
    setCalendarId(calendarId);
    setStartTime(startTime);
    setEndTime(endTime);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setDate(undefined);
    setCalendarId(undefined);
    setStartTime(undefined);
    setEndTime(undefined);
  };

  return {
    isOpen,
    date,
    calendarId,
    startTime,
    endTime,
    openPanel,
    openPanelWithDate,
    closePanel,
  };
}
