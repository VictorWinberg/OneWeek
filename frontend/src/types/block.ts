import type { PersonId } from './person';

export interface BlockMetadata {
  category?: string;
  energy?: number;
  originalCalendarId?: string;
}

export interface Block {
  id: string; // Google event ID
  calendarId: string; // Google calendar ID
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  responsiblePersonId: PersonId;
  metadata: BlockMetadata;
}

export interface BlockCreateInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  personId: PersonId;
  metadata?: BlockMetadata;
}

export interface BlockUpdateInput {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface MoveBlockInput {
  blockId: string;
  sourceCalendarId: string;
  targetPersonId: PersonId;
}

