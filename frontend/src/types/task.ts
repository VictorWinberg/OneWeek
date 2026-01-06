export interface TaskMetadata {
  assignedUser?: string; // User ID from config (e.g., "victor", "annie")
  assignedUserEmail?: string; // User email for reference
  category?: string;
  originalTaskListId?: string;
  [key: string]: string | undefined;
}

export interface Task {
  id: string;
  taskListId: string;
  title: string;
  notes?: string;
  due?: string; // ISO 8601 date
  status: 'needsAction' | 'completed';
  completed?: string; // ISO 8601 datetime when completed
  parent?: string; // Parent task ID for subtasks
  metadata: TaskMetadata;
}

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
}
