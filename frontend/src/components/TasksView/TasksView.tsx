import { useState, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useConfigStore } from '@/stores/configStore';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useUncompleteTask,
  useDeleteTask,
  DEFAULT_TASK_LIST_ID,
} from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TasksViewProps {
  onGoToToday?: () => void;
}

export function TasksView({ onGoToToday }: TasksViewProps) {
  const { config } = useConfigStore();
  const calendars = config.calendars;

  const [showCompleted, setShowCompleted] = useState(false);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');

  // Edit state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  const { data: tasks = [], isLoading, error } = useTasks(DEFAULT_TASK_LIST_ID, showCompleted);
  const createTask = useCreateTask(DEFAULT_TASK_LIST_ID);
  const updateTask = useUpdateTask(DEFAULT_TASK_LIST_ID);
  const completeTask = useCompleteTask(DEFAULT_TASK_LIST_ID);
  const uncompleteTask = useUncompleteTask(DEFAULT_TASK_LIST_ID);
  const deleteTask = useDeleteTask(DEFAULT_TASK_LIST_ID);

  // Extract unique users from calendars config for assignment
  const users = calendars.map((cal) => ({
    id: cal.name.toLowerCase().replace(/\s+/g, ''),
    name: cal.name,
    color: cal.color,
  }));

  // Open create form with default assignee from filter
  const handleOpenCreateForm = useCallback(() => {
    setNewTaskAssignee(filterUser || '');
    setIsCreating(true);
  }, [filterUser]);

  // Filter tasks by assigned user
  const filteredTasks = filterUser ? tasks.filter((task) => task.metadata.assignedUser === filterUser) : tasks;

  // Sort tasks: overdue first, then by due date ascending, tasks without due date last
  const sortTasks = (taskList: Task[]): Task[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates only, not time

    return [...taskList].sort((a, b) => {
      const aDate = a.due ? new Date(a.due) : null;
      const bDate = b.due ? new Date(b.due) : null;
      const aOverdue = aDate && aDate < now;
      const bOverdue = bDate && bDate < now;

      // Overdue tasks first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Tasks with due dates before tasks without
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;

      // Both have due dates: sort by date ascending
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }

      // Both without due dates: keep original order
      return 0;
    });
  };

  // Separate active and completed tasks, then sort
  const activeTasks = sortTasks(filteredTasks.filter((t) => t.status === 'needsAction'));
  const completedTasks = sortTasks(filteredTasks.filter((t) => t.status === 'completed'));

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;

    const assignedUser = newTaskAssignee || undefined;
    const assignedCalendar = calendars.find((cal) => cal.name.toLowerCase().replace(/\s+/g, '') === assignedUser);

    await createTask.mutateAsync({
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim() || undefined,
      due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
      assignedUser,
      assignedUserEmail: assignedCalendar ? undefined : undefined,
    });

    // Reset form
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskDue('');
    setNewTaskAssignee('');
    setIsCreating(false);
  }, [newTaskTitle, newTaskNotes, newTaskDue, newTaskAssignee, calendars, createTask]);

  // Open edit form with task data
  const handleOpenEditForm = useCallback((task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    // Convert ISO date to YYYY-MM-DD for input
    setEditDue(task.due ? task.due.split('T')[0] : '');
    setEditAssignee(task.metadata.assignedUser || '');
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setEditingTask(null);
    setEditTitle('');
    setEditNotes('');
    setEditDue('');
    setEditAssignee('');
  }, []);

  const handleUpdateTask = useCallback(async () => {
    if (!editingTask || !editTitle.trim()) return;

    await updateTask.mutateAsync({
      taskId: editingTask.id,
      updates: {
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        due: editDue ? new Date(editDue).toISOString() : undefined,
        assignedUser: editAssignee || undefined,
      },
    });

    handleCloseEditForm();
  }, [editingTask, editTitle, editNotes, editDue, editAssignee, updateTask, handleCloseEditForm]);

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      if (task.status === 'completed') {
        await uncompleteTask.mutateAsync(task.id);
      } else {
        await completeTask.mutateAsync(task.id);
      }
    },
    [completeTask, uncompleteTask]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      if (confirm('Är du säker på att du vill ta bort denna uppgift?')) {
        await deleteTask.mutateAsync(taskId);
      }
    },
    [deleteTask]
  );

  const formatDueDate = (dueString?: string) => {
    if (!dueString) return null;
    try {
      const date = parseISO(dueString);
      if (!isValid(date)) return null;
      return format(date, 'd MMM', { locale: sv });
    } catch {
      return null;
    }
  };

  const getUserColor = (assignedUser?: string): string => {
    if (!assignedUser) return 'var(--color-text-secondary)';
    const calendar = calendars.find((cal) => cal.name.toLowerCase().replace(/\s+/g, '') === assignedUser);
    return calendar?.color || 'var(--color-text-secondary)';
  };

  const getUserName = (assignedUser?: string): string => {
    if (!assignedUser) return 'Ej tilldelad';
    const calendar = calendars.find((cal) => cal.name.toLowerCase().replace(/\s+/g, '') === assignedUser);
    return calendar?.name || assignedUser;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Laddar uppgifter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-400 mb-2">Kunde inte ladda uppgifter</p>
          <p className="text-[var(--color-text-secondary)] text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)]">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Uppgifter</h1>
          <span className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
            {activeTasks.length} aktiva
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateForm}
            className="px-3 py-2 rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors flex items-center gap-2"
            aria-label="Skapa uppgift"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Ny uppgift</span>
          </button>

          {onGoToToday && (
            <button
              onClick={onGoToToday}
              className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium"
            >
              Idag
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-bg-tertiary)]">
        {/* User filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Visa:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterUser(null)}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                filterUser === null
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Alla
            </button>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setFilterUser(user.id)}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  filterUser === user.id
                    ? 'text-[var(--color-bg-primary)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                style={filterUser === user.id ? { backgroundColor: user.color } : undefined}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>

        {/* Show completed toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">Visa färdiga</span>
        </label>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Edit Task Form */}
        {editingTask && (
          <div className="mb-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-accent)]/50">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Redigera uppgift</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Uppgiftens titel..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                autoFocus
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Anteckningar (valfritt)..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">Ingen tilldelning</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCloseEditForm}
                  className="px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleUpdateTask}
                  disabled={!editTitle.trim() || updateTask.isPending}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateTask.isPending ? 'Sparar...' : 'Spara'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Form */}
        {isCreating && !editingTask && (
          <div className="mb-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-bg-tertiary)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Ny uppgift</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Uppgiftens titel..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                autoFocus
              />
              <textarea
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                placeholder="Anteckningar (valfritt)..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">Ingen tilldelning</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim() || createTask.isPending}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createTask.isPending ? 'Skapar...' : 'Skapa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {activeTasks.length === 0 && !isCreating ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--color-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <p className="text-[var(--color-text-secondary)]">Inga aktiva uppgifter</p>
            <button
              onClick={handleOpenCreateForm}
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium"
            >
              Skapa första uppgiften
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleOpenEditForm}
                onDelete={handleDelete}
                getUserColor={getUserColor}
                getUserName={getUserName}
                formatDueDate={formatDueDate}
              />
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
              Färdiga ({completedTasks.length})
            </h3>
            <div className="space-y-2 opacity-60">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleOpenEditForm}
                  onDelete={handleDelete}
                  getUserColor={getUserColor}
                  getUserName={getUserName}
                  formatDueDate={formatDueDate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  getUserColor: (assignedUser?: string) => string;
  getUserName: (assignedUser?: string) => string;
  formatDueDate: (dueString?: string) => string | null;
}

function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  getUserColor,
  getUserName,
  formatDueDate,
}: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const dueDate = formatDueDate(task.due);
  const isOverdue = task.due && !isCompleted && new Date(task.due) < new Date();

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/30 transition-colors ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
            : 'border-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
        }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-[var(--color-bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-[var(--color-text-primary)] ${isCompleted ? 'line-through' : ''}`}>
            {task.title}
          </p>

          {/* Assignee badge */}
          {task.metadata.assignedUser && (
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: getUserColor(task.metadata.assignedUser) }}
            >
              {getUserName(task.metadata.assignedUser)}
            </span>
          )}
        </div>

        {task.notes && <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">{task.notes}</p>}

        <div className="mt-2 flex items-center gap-3 text-sm">
          {dueDate && (
            <span
              className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-[var(--color-text-secondary)]'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {/* Edit button */}
        <button
          onClick={() => onEdit(task)}
          className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          title="Redigera"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-400/10"
          title="Ta bort"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
