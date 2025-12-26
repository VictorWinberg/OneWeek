/**
 * Example routes for Google Tasks API
 *
 * This file demonstrates how to add Tasks API routes to your Express server.
 * Copy this to tasks.ts and adapt as needed.
 *
 * To use:
 * 1. Copy tasksService.example.ts to tasksService.ts
 * 2. Copy this file to tasks.ts
 * 3. Add to server.ts: import tasksRoutes from './routes/tasks.js';
 * 4. Add to server.ts: app.use('/api/tasks', tasksRoutes);
 */

import { Router } from 'express';
import {
  listTaskLists,
  getTaskList,
  createTaskList,
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  getTasksForDateRange,
} from '../services/tasksService.js';
import { requireAuth, getUserEmail } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/tasks/tasklists
 * List all task lists
 */
router.get(
  '/tasklists',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskLists = await listTaskLists();
    res.json(taskLists);
  })
);

/**
 * GET /api/tasks/tasklists/:taskListId
 * Get a specific task list
 */
router.get(
  '/tasklists/:taskListId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId } = req.params;
    const taskList = await getTaskList(taskListId);

    if (!taskList) {
      throw new NotFoundError('Task list not found');
    }

    res.json(taskList);
  })
);

/**
 * POST /api/tasks/tasklists
 * Create a new task list
 * Body: { title: string }
 */
router.post(
  '/tasklists',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      throw new ValidationError('Title is required');
    }

    const taskList = await createTaskList(title);

    if (!taskList) {
      throw new ValidationError('Failed to create task list');
    }

    res.status(201).json(taskList);
  })
);

/**
 * GET /api/tasks/tasklists/:taskListId/tasks
 * List tasks in a task list
 * Query params: showCompleted (boolean), showHidden (boolean)
 */
router.get(
  '/tasklists/:taskListId/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId } = req.params;
    const { showCompleted, showHidden } = req.query;

    const tasks = await listTasks(taskListId, {
      showCompleted: showCompleted === 'true',
      showHidden: showHidden === 'true',
    });

    res.json(tasks);
  })
);

/**
 * GET /api/tasks/tasklists/:taskListId/tasks/range
 * Get tasks within a date range
 * Query params: startDate (ISO string), endDate (ISO string)
 */
router.get(
  '/tasklists/:taskListId/tasks/range',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required');
    }

    const tasks = await getTasksForDateRange(
      taskListId,
      startDate as string,
      endDate as string
    );

    res.json(tasks);
  })
);

/**
 * GET /api/tasks/tasklists/:taskListId/tasks/:taskId
 * Get a specific task
 */
router.get(
  '/tasklists/:taskListId/tasks/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId, taskId } = req.params;
    const task = await getTask(taskListId, taskId);

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    res.json(task);
  })
);

/**
 * POST /api/tasks/tasklists/:taskListId/tasks
 * Create a new task
 * Body: { title: string, notes?: string, due?: string, parent?: string }
 */
router.post(
  '/tasklists/:taskListId/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId } = req.params;
    const { title, notes, due, parent } = req.body;

    if (!title || typeof title !== 'string') {
      throw new ValidationError('Title is required');
    }

    const task = await createTask(taskListId, {
      title,
      notes,
      due,
      parent,
    });

    if (!task) {
      throw new ValidationError('Failed to create task');
    }

    res.status(201).json(task);
  })
);

/**
 * PATCH /api/tasks/tasklists/:taskListId/tasks/:taskId
 * Update a task
 * Body: { title?: string, notes?: string, due?: string, status?: 'needsAction' | 'completed', parent?: string }
 */
router.patch(
  '/tasklists/:taskListId/tasks/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId, taskId } = req.params;
    const updates = req.body;

    const task = await updateTask(taskListId, taskId, updates);

    if (!task) {
      throw new NotFoundError('Task not found or update failed');
    }

    res.json(task);
  })
);

/**
 * POST /api/tasks/tasklists/:taskListId/tasks/:taskId/complete
 * Mark a task as completed
 */
router.post(
  '/tasklists/:taskListId/tasks/:taskId/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId, taskId } = req.params;
    const task = await completeTask(taskListId, taskId);

    if (!task) {
      throw new NotFoundError('Task not found or update failed');
    }

    res.json(task);
  })
);

/**
 * POST /api/tasks/tasklists/:taskListId/tasks/:taskId/uncomplete
 * Mark a task as incomplete
 */
router.post(
  '/tasklists/:taskListId/tasks/:taskId/uncomplete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId, taskId } = req.params;
    const task = await uncompleteTask(taskListId, taskId);

    if (!task) {
      throw new NotFoundError('Task not found or update failed');
    }

    res.json(task);
  })
);

/**
 * DELETE /api/tasks/tasklists/:taskListId/tasks/:taskId
 * Delete a task
 */
router.delete(
  '/tasklists/:taskListId/tasks/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskListId, taskId } = req.params;
    const success = await deleteTask(taskListId, taskId);

    if (!success) {
      throw new NotFoundError('Task not found or delete failed');
    }

    res.json({ success: true });
  })
);

export default router;

