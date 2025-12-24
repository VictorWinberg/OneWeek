import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
  addDays,
} from 'date-fns';
import { sv } from 'date-fns/locale';

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function formatWeekHeader(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  const startMonth = format(start, 'MMMM', { locale: sv });
  const endMonth = format(end, 'MMMM', { locale: sv });
  const year = format(start, 'yyyy');

  if (startMonth === endMonth) {
    return `${format(start, 'd')}–${format(end, 'd')} ${startMonth} ${year}`;
  }

  return `${format(start, 'd')} ${startMonth} – ${format(end, 'd')} ${endMonth} ${year}`;
}

export function formatDayHeader(date: Date): string {
  return format(date, 'EEEE d/M', { locale: sv });
}

export function formatDayShort(date: Date): string {
  return format(date, 'EEE', { locale: sv });
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDateFull(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: sv });
}

export function formatDateTime(date: Date): string {
  return format(date, 'd MMM HH:mm', { locale: sv });
}

export { isToday, isSameDay, addDays };

export function getTodayAndTomorrow(): { today: Date; tomorrow: Date } {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  return { today, tomorrow };
}

export function getWeekNumber(date: Date): number {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const firstDayOfYear = new Date(start.getFullYear(), 0, 1);
  const pastDaysOfYear = (start.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

