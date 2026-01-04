/**
 * Tasks Service with Metadata Support
 *
 * Provides Google Tasks API integration with user assignment metadata.
 * Tasks are created on the service account with metadata stored in the notes field.
 */

import { google, tasks_v1 } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Task, TaskMetadata } from '../types/index.js';
import { encodeTaskMetadata, decodeTaskMetadata, updateTaskMetadata } from '../utils/taskMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tasksClient: tasks_v1.Tasks | null = null;

/**
 * Initialize and return the service account tasks client.
 */
function getTasksClient(): tasks_v1.Tasks {
  if (!tasksClient) {
    const credentialsPath = path.resolve(__dirname, '../../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks',
      ],
    });
    tasksClient = google.tasks({ version: 'v1', auth });
  }
  return tasksClient;
}

/**
 * List all task lists accessible by the service account
 */
export async function listTaskLists(): Promise<tasks_v1.Schema$TaskList[]> {
  const tasks = getTasksClient();
  const response = await tasks.tasklists.list();
  return response.data.items || [];
}

/**
 * Get a specific task list by ID
 */
export async function getTaskList(taskListId: string): Promise<tasks_v1.Schema$TaskList | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasklists.get({ tasklist: taskListId });
    return response.data;
  } catch (error) {
    console.error('Error getting task list:', error);
    return null;
  }
}

/**
 * Create a new task list
 */
export async function createTaskList(title: string): Promise<tasks_v1.Schema$TaskList | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasklists.insert({
      requestBody: { title },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating task list:', error);
    return null;
  }
}

/**
 * Convert Google Task to internal Task format with metadata
 */
export function normalizeTaskToInternal(task: tasks_v1.Schema$Task, taskListId: string): Task {
  const { notes, metadata } = decodeTaskMetadata(task.notes || undefined);

  return {
    id: task.id || '',
    taskListId,
    title: task.title || 'Untitled',
    notes: notes || undefined,
    due: task.due || undefined,
    status: (task.status as 'needsAction' | 'completed') || 'needsAction',
    completed: task.completed || undefined,
    parent: task.parent || undefined,
    metadata,
  };
}

/**
 * List tasks in a specific task list (with metadata extracted)
 */
export async function listTasks(
  taskListId: string,
  options?: {
    showCompleted?: boolean;
    showHidden?: boolean;
    maxResults?: number;
  }
): Promise<Task[]> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: options?.showCompleted ?? false,
      showHidden: options?.showHidden ?? false,
      maxResults: options?.maxResults ?? 100,
    });
    const rawTasks = response.data.items || [];
    return rawTasks.map((task) => normalizeTaskToInternal(task, taskListId));
  } catch (error) {
    console.error('Error listing tasks:', error);
    return [];
  }
}

/**
 * Get a single task by ID (with metadata extracted)
 */
export async function getTask(taskListId: string, taskId: string): Promise<Task | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.get({
      tasklist: taskListId,
      task: taskId,
    });
    return normalizeTaskToInternal(response.data, taskListId);
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

/**
 * Create a task with metadata (including assigned user)
 */
export async function createTask(
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string;
    parent?: string;
    metadata?: TaskMetadata;
  }
): Promise<Task | null> {
  const tasks = getTasksClient();

  // Encode metadata into notes field
  const notesWithMetadata = task.metadata ? encodeTaskMetadata(task.notes, task.metadata) : task.notes;

  try {
    const response = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title: task.title,
        ...(notesWithMetadata && { notes: notesWithMetadata }),
        ...(task.due && { due: task.due }),
        ...(task.parent && { parent: task.parent }),
      },
    });
    return normalizeTaskToInternal(response.data, taskListId);
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: {
    title?: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
    parent?: string;
    metadata?: Partial<TaskMetadata>;
  }
): Promise<Task | null> {
  const tasks = getTasksClient();
  try {
    // If metadata updates are provided, we need to get current task first
    let notesToUpdate: string | undefined;

    if (updates.metadata) {
      const currentTask = await tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
      });

      if (currentTask.data) {
        notesToUpdate = updateTaskMetadata(currentTask.data.notes || undefined, updates.metadata);
      }
    } else if (updates.notes !== undefined) {
      // If just updating notes without metadata changes
      notesToUpdate = updates.notes;
    }

    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        ...(updates.title && { title: updates.title }),
        ...(notesToUpdate !== undefined && { notes: notesToUpdate }),
        ...(updates.due && { due: updates.due }),
        ...(updates.status && { status: updates.status }),
      },
    });
    return normalizeTaskToInternal(response.data, taskListId);
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
}

/**
 * Mark a task as completed
 */
export async function completeTask(taskListId: string, taskId: string): Promise<Task | null> {
  return updateTask(taskListId, taskId, { status: 'completed' });
}

/**
 * Mark a task as incomplete
 */
export async function uncompleteTask(taskListId: string, taskId: string): Promise<Task | null> {
  return updateTask(taskListId, taskId, { status: 'needsAction' });
}

/**
 * Delete a task
 */
export async function deleteTask(taskListId: string, taskId: string): Promise<boolean> {
  const tasks = getTasksClient();
  try {
    await tasks.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

/**
 * List tasks filtered by assigned user
 */
export async function listTasksByAssignedUser(taskListId: string, userId: string): Promise<Task[]> {
  const allTasks = await listTasks(taskListId, { showCompleted: false });
  return allTasks.filter((task) => task.metadata.assignedUser === userId);
}

/**
 * Get tasks with due dates within a specific date range
 */
export async function getTasksForDateRange(taskListId: string, startDate: string, endDate: string): Promise<Task[]> {
  const allTasks = await listTasks(taskListId, { showCompleted: false });
  const start = new Date(startDate);
  const end = new Date(endDate);

  return allTasks.filter((task) => {
    if (!task.due) return false;
    const dueDate = new Date(task.due);
    return dueDate >= start && dueDate <= end;
  });
}
