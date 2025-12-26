# Google Tasks API Integration Guide

## Overview

The Google Tasks API allows you to manage tasks and task lists programmatically. Unlike calendar events, tasks are standalone items that can have due dates but don't have specific start/end times. Tasks are managed separately from calendar events.

## Key Differences: Tasks vs Calendar Events

- **Calendar Events**: Have specific start/end times, can be all-day, support recurrence, appear on calendar views
- **Tasks**: Have due dates (optional), can be completed, organized into task lists, don't appear on calendar views by default

## Setup Steps

### 1. Enable Google Tasks API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Tasks API"
5. Click **Enable**

### 2. Update OAuth Scopes

Add the Tasks API scope to your authentication. You'll need to add this scope to your OAuth configuration:

```
https://www.googleapis.com/auth/tasks
```

Or for read-only access:

```
https://www.googleapis.com/auth/tasks.readonly
```

### 3. Update Service Account Scopes

If using a service account (like in your current setup), update the scopes in `calendarService.ts`:

```typescript
scopes: [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks' // Add this
]
```

## Implementation Guide

### Basic Setup

The `googleapis` library you're already using supports the Tasks API. No additional packages needed!

### Initialize Tasks API Client

Similar to how you initialize the Calendar client, you can create a Tasks client:

```typescript
import { google, tasks_v1 } from 'googleapis';

let tasksClient: tasks_v1.Tasks | null = null;

function getTasksClient(): tasks_v1.Tasks {
  if (!tasksClient) {
    const credentialsPath = path.resolve(__dirname, '../../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks'
      ],
    });
    tasksClient = google.tasks({ version: 'v1', auth });
  }
  return tasksClient;
}
```

## Common Operations

### 1. List Task Lists

```typescript
export async function listTaskLists() {
  const tasks = getTasksClient();
  const response = await tasks.tasklists.list();
  return response.data.items || [];
}
```

### 2. Create a Task List

```typescript
export async function createTaskList(title: string) {
  const tasks = getTasksClient();
  const response = await tasks.tasklists.insert({
    requestBody: { title }
  });
  return response.data;
}
```

### 3. List Tasks in a Task List

```typescript
export async function listTasks(taskListId: string) {
  const tasks = getTasksClient();
  const response = await tasks.tasks.list({
    tasklist: taskListId,
    showCompleted: false, // Set to true to include completed tasks
    showHidden: false
  });
  return response.data.items || [];
}
```

### 4. Create a Task

```typescript
export async function createTask(
  taskListId: string,
  title: string,
  notes?: string,
  dueDate?: string // ISO 8601 format: "2025-12-31T00:00:00.000Z"
) {
  const tasks = getTasksClient();
  const task: tasks_v1.Schema$Task = {
    title,
    ...(notes && { notes }),
    ...(dueDate && { due: dueDate })
  };

  const response = await tasks.tasks.insert({
    tasklist: taskListId,
    requestBody: task
  });
  return response.data;
}
```

### 5. Update a Task

```typescript
export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: {
    title?: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
  }
) {
  const tasks = getTasksClient();
  const response = await tasks.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: updates
  });
  return response.data;
}
```

### 6. Complete a Task

```typescript
export async function completeTask(taskListId: string, taskId: string) {
  return updateTask(taskListId, taskId, { status: 'completed' });
}
```

### 7. Delete a Task

```typescript
export async function deleteTask(taskListId: string, taskId: string) {
  const tasks = getTasksClient();
  await tasks.tasks.delete({
    tasklist: taskListId,
    task: taskId
  });
  return true;
}
```

## Task List IDs

Google Tasks API uses special identifiers:

- `@default` - The default task list for a user
- `@default@group.v.calendar.google.com` - For Google Workspace users
- Specific task list IDs (UUIDs) for custom lists

## Task Properties

A task object (`tasks_v1.Schema$Task`) includes:

```typescript
{
  id?: string;              // Unique identifier
  title?: string;           // Task title
  notes?: string;           // Task description/notes
  status?: string;          // 'needsAction' or 'completed'
  due?: string;             // ISO 8601 date (date only, no time)
  completed?: string;       // ISO 8601 datetime when completed
  position?: string;        // Position in list
  parent?: string;          // Parent task ID (for subtasks)
  updated?: string;         // Last update timestamp
  selfLink?: string;        // API link to this task
  kind?: string;            // Always "tasks#task"
}
```

## Integration with Your Current Architecture

### Option 1: Separate Tasks Service

Create a new service file `backend/src/services/tasksService.ts` following the same pattern as `calendarService.ts`:

```typescript
import { google, tasks_v1 } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
        'https://www.googleapis.com/auth/tasks'
      ],
    });
    tasksClient = google.tasks({ version: 'v1', auth });
  }
  return tasksClient;
}

// Export your task management functions here
export async function listTaskLists() {
  const tasks = getTasksClient();
  const response = await tasks.tasklists.list();
  return response.data.items || [];
}

// ... other functions
```

### Option 2: Add Tasks Routes

Create `backend/src/routes/tasks.ts` similar to your `events.ts`:

```typescript
import { Router } from 'express';
import { listTaskLists, listTasks, createTask, updateTask, deleteTask } from '../services/tasksService.js';
import { requireAuth, getUserEmail } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/tasklists', requireAuth, asyncHandler(async (req, res) => {
  const taskLists = await listTaskLists();
  res.json(taskLists);
}));

router.get('/tasklists/:taskListId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { taskListId } = req.params;
  const tasks = await listTasks(taskListId);
  res.json(tasks);
}));

// ... more routes
```

## Important Notes

1. **Authentication**: Tasks API requires OAuth 2.0 authentication. Service accounts work, but users need to grant access.

2. **Default Task List**: Most users have a default task list accessible via `@default` ID.

3. **Due Dates**: Tasks use date-only format (no time component) in ISO 8601: `"2025-12-31T00:00:00.000Z"` or just `"2025-12-31"`.

4. **Subtasks**: Tasks can have parent tasks, creating a hierarchy. Use the `parent` field to link subtasks.

5. **Position**: Tasks have a `position` field that determines order. You can use this for custom sorting.

6. **Limits**: The API has rate limits. Check Google's documentation for current limits.

## Resources

- [Google Tasks API Documentation](https://developers.google.com/tasks)
- [Tasks API Reference](https://developers.google.com/tasks/reference/rest)
- [Node.js Client Library Docs](https://googleapis.dev/nodejs/googleapis/latest/Tasks.html)
- [Quickstart Guide](https://developers.google.com/tasks/quickstart)

## Example: Fetching Tasks for Calendar View

If you want to display tasks alongside calendar events, you could:

```typescript
export async function getTasksForDateRange(
  taskListId: string,
  startDate: string,
  endDate: string
) {
  const tasks = getTasksClient();
  const allTasks = await listTasks(taskListId);

  // Filter tasks by due date range
  return allTasks.filter(task => {
    if (!task.due) return false;
    const dueDate = new Date(task.due);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return dueDate >= start && dueDate <= end;
  });
}
```

This would allow you to show tasks with due dates in your week view alongside calendar events.
