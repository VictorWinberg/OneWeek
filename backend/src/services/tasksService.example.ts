/**
 * Example implementation of Google Tasks API service
 *
 * This file demonstrates how to integrate Google Tasks API into your existing codebase.
 * Copy this to tasksService.ts and adapt as needed.
 *
 * Prerequisites:
 * 1. Enable Google Tasks API in Google Cloud Console
 * 2. Add 'https://www.googleapis.com/auth/tasks' to your OAuth scopes
 * 3. Update your service account credentials if needed
 */

import { google, tasks_v1 } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tasksClient: tasks_v1.Tasks | null = null;

/**
 * Initialize and return the service account tasks client.
 * Follows the same pattern as getServiceAccountClient() in calendarService.ts
 */
function getTasksClient(): tasks_v1.Tasks {
  if (!tasksClient) {
    const credentialsPath = path.resolve(__dirname, '../../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks', // Add Tasks API scope
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
 * List tasks in a specific task list
 */
export async function listTasks(
  taskListId: string,
  options?: {
    showCompleted?: boolean;
    showHidden?: boolean;
    maxResults?: number;
  }
): Promise<tasks_v1.Schema$Task[]> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: options?.showCompleted ?? false,
      showHidden: options?.showHidden ?? false,
      maxResults: options?.maxResults ?? 100,
    });
    return response.data.items || [];
  } catch (error) {
    console.error('Error listing tasks:', error);
    return [];
  }
}

/**
 * Get a single task by ID
 */
export async function getTask(
  taskListId: string,
  taskId: string
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.get({
      tasklist: taskListId,
      task: taskId,
    });
    return response.data;
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

/**
 * Create a new task
 */
export async function createTask(
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string; // ISO 8601 date format: "2025-12-31T00:00:00.000Z"
    parent?: string; // Parent task ID for subtasks
  }
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title: task.title,
        ...(task.notes && { notes: task.notes }),
        ...(task.due && { due: task.due }),
        ...(task.parent && { parent: task.parent }),
      },
    });
    return response.data;
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
  }
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: updates,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
}

/**
 * Mark a task as completed
 */
export async function completeTask(
  taskListId: string,
  taskId: string
): Promise<tasks_v1.Schema$Task | null> {
  return updateTask(taskListId, taskId, { status: 'completed' });
}

/**
 * Mark a task as incomplete
 */
export async function uncompleteTask(
  taskListId: string,
  taskId: string
): Promise<tasks_v1.Schema$Task | null> {
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
 * Get tasks with due dates within a specific date range
 * Useful for displaying tasks alongside calendar events
 */
export async function getTasksForDateRange(
  taskListId: string,
  startDate: string,
  endDate: string
): Promise<tasks_v1.Schema$Task[]> {
  const allTasks = await listTasks(taskListId, { showCompleted: false });
  const start = new Date(startDate);
  const end = new Date(endDate);

  return allTasks.filter((task) => {
    if (!task.due) return false;
    const dueDate = new Date(task.due);
    return dueDate >= start && dueDate <= end;
  });
}

/**
 * Move a task to a different position in the list
 */
export async function moveTask(
  taskListId: string,
  taskId: string,
  previousTaskId?: string // Insert after this task, or at the top if undefined
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();
  try {
    const response = await tasks.tasks.move({
      tasklist: taskListId,
      task: taskId,
      ...(previousTaskId && { previous: previousTaskId }),
    });
    return response.data;
  } catch (error) {
    console.error('Error moving task:', error);
    return null;
  }
}

