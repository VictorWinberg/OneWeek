# Task Metadata Guide

## Overview

Google Tasks API doesn't support custom metadata fields like Calendar API's `extendedProperties`. However, we can store structured metadata in the `notes` field using a special format.

## How It Works

Metadata is stored as JSON at the end of the task's `notes` field, prefixed with a special marker (`---ONEWEEK_METADATA---`). This allows us to:

1. Store user assignments
2. Store categories and other custom fields
3. Preserve the original notes content
4. Extract metadata programmatically

## Format

```
[Original notes content]

---ONEWEEK_METADATA---{"assignedUser":"victor","category":"shopping"}
```

## Usage Examples

### Creating a Task with Metadata

```typescript
import { createTaskWithMetadata } from './services/tasksService.withMetadata.example.js';

await createTaskWithMetadata('@default', {
  title: 'Buy groceries',
  notes: 'Remember to get milk and eggs',
  due: '2025-12-31T00:00:00.000Z',
  metadata: {
    assignedUser: 'victor',
    assignedUserEmail: 'victor.m.winberg@gmail.com',
    category: 'shopping'
  }
});
```

### Assigning a Task to a User

```typescript
import { assignTaskToUser } from './services/tasksService.withMetadata.example.js';

await assignTaskToUser(
  '@default',
  'task-id-here',
  'annie',
  'annie.onnered@gmail.com'
);
```

### Reading Task Metadata

```typescript
import { normalizeTaskToInternal } from './services/tasksService.withMetadata.example.js';
import { extractTaskMetadata } from './utils/taskMetadata.js';

// From a Google Task object
const task = await getTask('@default', 'task-id');
const internalTask = normalizeTaskToInternal(task, '@default');

console.log(internalTask.metadata.assignedUser); // 'victor'
console.log(internalTask.notes); // Clean notes without metadata

// Or extract directly from notes string
const metadata = extractTaskMetadata(task.notes);
console.log(metadata.assignedUser);
```

### Filtering Tasks by Assigned User

```typescript
import { listTasksByAssignedUser } from './services/tasksService.withMetadata.example.js';

const victorTasks = await listTasksByAssignedUser('@default', 'victor');
```

## Metadata Fields

The `TaskMetadata` interface supports:

```typescript
interface TaskMetadata {
  assignedUser?: string;        // User ID from config (e.g., "victor", "annie")
  assignedUserEmail?: string;   // User email for reference
  category?: string;            // Task category
  originalTaskListId?: string; // Original task list if moved
  [key: string]: string | undefined; // Additional custom fields
}
```

## Utility Functions

### `encodeTaskMetadata(notes, metadata)`
Encodes metadata into notes field, preserving existing notes.

### `decodeTaskMetadata(notes)`
Extracts metadata and returns clean notes separately.

```typescript
const { notes, metadata } = decodeTaskMetadata(task.notes);
// notes: "Remember to get milk and eggs"
// metadata: { assignedUser: "victor", category: "shopping" }
```

### `extractTaskMetadata(notes)`
Quick way to get just the metadata without the clean notes.

### `updateTaskMetadata(notes, updates)`
Updates metadata in existing notes, merging with existing metadata.

## Important Notes

1. **Metadata is Hidden**: The metadata marker and JSON are stored in notes but won't be visible to users in Google Tasks UI (it's at the end).

2. **Backward Compatible**: Tasks without metadata will work fine - the functions handle missing metadata gracefully.

3. **Notes Preservation**: Original notes are preserved - metadata is appended, not replaced.

4. **User Assignment**: Use the `assignedUser` field with user IDs from your `config.json` (e.g., "victor", "annie").

5. **Service Account Limitation**: Remember that tasks created via service account belong to the service account, not individual users. To assign tasks to users, you'll need to either:
   - Use OAuth to create tasks in each user's account
   - Use domain-wide delegation (Google Workspace only)
   - Store assignments as metadata and filter/display accordingly

## Integration with Your App

To integrate this into your existing app:

1. Copy `tasksService.withMetadata.example.ts` to `tasksService.ts`
2. Update your routes to use the metadata-aware functions
3. Add UI to assign tasks to users
4. Filter tasks by assigned user in your frontend

Example route:

```typescript
router.post('/tasklists/:taskListId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { taskListId } = req.params;
  const { title, notes, due, assignedUser, assignedUserEmail } = req.body;

  const task = await createTaskWithMetadata(taskListId, {
    title,
    notes,
    due,
    metadata: {
      assignedUser,
      assignedUserEmail,
    },
  });

  res.status(201).json(task);
}));
```

