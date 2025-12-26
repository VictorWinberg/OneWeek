/**
 * Example Tasks Service with Metadata Support
 *
 * This shows how to use the taskMetadata utilities to store
 * user assignments and other metadata in tasks.
 */

import { google, tasks_v1 } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Task, TaskMetadata } from '../types/index.js';
import {
  encodeTaskMetadata,
  decodeTaskMetadata,
  extractTaskMetadata,
  updateTaskMetadata,
} from '../utils/taskMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tasksClient: tasks_v1.Tasks | null = null;

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
 * Create a task with metadata (including assigned user)
 */
export async function createTaskWithMetadata(
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string;
    parent?: string;
    metadata?: TaskMetadata;
  }
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();

  // Encode metadata into notes field
  const notesWithMetadata = task.metadata
    ? encodeTaskMetadata(task.notes, task.metadata)
    : task.notes;

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
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

/**
 * Update task metadata (preserves existing notes)
 */
export async function updateTaskMetadataField(
  taskListId: string,
  taskId: string,
  metadataUpdates: Partial<TaskMetadata>
): Promise<tasks_v1.Schema$Task | null> {
  const tasks = getTasksClient();

  try {
    // Get current task
    const currentTask = await tasks.tasks.get({
      tasklist: taskListId,
      task: taskId,
    });

    if (!currentTask.data) {
      return null;
    }

    // Update metadata in notes
    const updatedNotes = updateTaskMetadata(
      currentTask.data.notes || undefined,
      metadataUpdates
    );

    // Update task with new notes
    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        notes: updatedNotes,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error updating task metadata:', error);
    return null;
  }
}

/**
 * Assign a task to a user
 */
export async function assignTaskToUser(
  taskListId: string,
  taskId: string,
  userId: string,
  userEmail?: string
): Promise<tasks_v1.Schema$Task | null> {
  return updateTaskMetadataField(taskListId, taskId, {
    assignedUser: userId,
    assignedUserEmail: userEmail,
  });
}

/**
 * Convert Google Task to internal Task format with metadata
 */
export function normalizeTaskToInternal(
  task: tasks_v1.Schema$Task,
  taskListId: string
): Task {
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
 * List tasks and filter by assigned user
 */
export async function listTasksByAssignedUser(
  taskListId: string,
  userId: string
): Promise<Task[]> {
  const tasks = getTasksClient();

  try {
    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
    });

    const allTasks = response.data.items || [];

    // Filter by assigned user
    return allTasks
      .map((task) => normalizeTaskToInternal(task, taskListId))
      .filter((task) => task.metadata.assignedUser === userId);
  } catch (error) {
    console.error('Error listing tasks by user:', error);
    return [];
  }
}

/**
 * Example usage:
 *
 * // Create a task assigned to Victor
 * await createTaskWithMetadata('@default', {
 *   title: 'Buy groceries',
 *   notes: 'Remember to get milk and eggs',
 *   due: '2025-12-31T00:00:00.000Z',
 *   metadata: {
 *     assignedUser: 'victor',
 *     assignedUserEmail: 'victor.m.winberg@gmail.com',
 *     category: 'shopping'
 *   }
 * });
 *
 * // Assign an existing task to Annie
 * await assignTaskToUser(
 *   '@default',
 *   'task-id-here',
 *   'annie',
 *   'annie.onnered@gmail.com'
 * );
 *
 * // Get all tasks assigned to Victor
 * const victorTasks = await listTasksByAssignedUser('@default', 'victor');
 */

