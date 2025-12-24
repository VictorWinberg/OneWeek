export interface BlockMetadata {
  category?: string;
  energy?: number;
  originalCalendarId?: string;
}

export interface Block {
  id: string; // Google event ID
  calendarId: string; // Google calendar ID - also serves as person/entity identifier
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  responsiblePersonId: string; // Calendar ID of responsible person
  metadata: BlockMetadata;
}

export interface BlockCreateInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  personId: string; // Calendar ID
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
  targetPersonId: string; // Calendar ID
}

