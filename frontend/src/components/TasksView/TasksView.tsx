import { useState, useCallback, useRef, useEffect } from 'react';
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
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const newTaskInputRef = useRef<HTMLInputElement>(null);

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

  // Filter tasks by assigned user
  const filteredTasks = filterUser ? tasks.filter((task) => task.metadata.assignedUser === filterUser) : tasks;

  // Sort tasks: overdue first, then by due date ascending, tasks without due date last
  const sortTasks = (taskList: Task[]): Task[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return [...taskList].sort((a, b) => {
      const aDate = a.due ? new Date(a.due) : null;
      const bDate = b.due ? new Date(b.due) : null;
      const aOverdue = aDate && aDate < now;
      const bOverdue = bDate && bDate < now;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      return 0;
    });
  };

  const activeTasks = sortTasks(filteredTasks.filter((t) => t.status === 'needsAction'));
  const completedTasks = sortTasks(filteredTasks.filter((t) => t.status === 'completed'));

  // Handle filter change - also update default assignee
  const handleFilterChange = useCallback((userId: string | null) => {
    setFilterUser(userId);
    setNewTaskAssignee(userId || '');
  }, []);

  // Create new task on Enter
  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || createTask.isPending) return;

    await createTask.mutateAsync({
      title: newTaskTitle.trim(),
      due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
      assignedUser: newTaskAssignee || undefined,
    });

    setNewTaskTitle('');
    setNewTaskDue('');
    // Keep assignee for quick entry of multiple tasks with same assignee
    newTaskInputRef.current?.focus();
  }, [newTaskTitle, newTaskDue, newTaskAssignee, createTask]);

  const handleNewTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTask();
    }
  };

  // Start inline editing (title only)
  const handleStartEdit = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }, []);

  // Save inline edit (title only)
  const handleSaveEdit = useCallback(async () => {
    if (!editingTaskId || !editingTitle.trim() || updateTask.isPending) return;

    await updateTask.mutateAsync({
      taskId: editingTaskId,
      updates: { title: editingTitle.trim() },
    });

    setEditingTaskId(null);
    setEditingTitle('');
  }, [editingTaskId, editingTitle, updateTask]);

  // Cancel inline edit
  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditingTitle('');
  }, []);

  // Direct update for due date and assignee
  const handleUpdateTask = useCallback(
    async (taskId: string, updates: { due?: string; assignedUser?: string }) => {
      await updateTask.mutateAsync({ taskId, updates });
    },
    [updateTask]
  );

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

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
      await deleteTask.mutateAsync(taskId);
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

        {onGoToToday && (
          <button
            onClick={onGoToToday}
            className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium"
          >
            Idag
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-bg-tertiary)]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Visa:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleFilterChange(null)}
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
                onClick={() => handleFilterChange(user.id)}
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
        {/* Inline new task input */}
        <div className="flex items-center gap-2 p-3 mb-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] border-dashed">
          <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-[var(--color-text-secondary)]/30" />
          <input
            ref={newTaskInputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleNewTaskKeyDown}
            placeholder="Lägg till uppgift... (tryck Enter)"
            className="flex-1 min-w-0 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none"
          />
          <label className="flex-shrink-0 relative cursor-pointer">
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Välj datum"
            />
            {newTaskDue ? (
              <span className="text-xs text-[var(--color-text-primary)] pointer-events-none">
                {formatDueDate(newTaskDue) || newTaskDue}
              </span>
            ) : (
              <svg
                className="w-4 h-4 text-[var(--color-text-secondary)] opacity-50 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </label>
          <select
            value={newTaskAssignee}
            onChange={(e) => setNewTaskAssignee(e.target.value)}
            className="flex-shrink-0 bg-transparent text-[var(--color-text-secondary)] text-sm focus:outline-none cursor-pointer max-w-[100px] appearance-none"
            style={newTaskAssignee ? { color: getUserColor(newTaskAssignee) } : undefined}
          >
            <option value="">Ingen</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Active Tasks */}
        {activeTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--color-text-secondary)]">Inga aktiva uppgifter</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                users={users}
                isEditing={editingTaskId === task.id}
                editingTitle={editingTitle}
                onEditingTitleChange={setEditingTitle}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onEditKeyDown={handleEditKeyDown}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onUpdateTask={handleUpdateTask}
                getUserColor={getUserColor}
                formatDueDate={formatDueDate}
              />
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">
              Färdiga ({completedTasks.length})
            </h3>
            <div className="space-y-1 opacity-60">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  users={users}
                  isEditing={editingTaskId === task.id}
                  editingTitle={editingTitle}
                  onEditingTitleChange={setEditingTitle}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditKeyDown={handleEditKeyDown}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onUpdateTask={handleUpdateTask}
                  getUserColor={getUserColor}
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
  users: { id: string; name: string; email?: string; color?: string }[];
  isEditing: boolean;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onStartEdit: (task: Task) => void;
  onSaveEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: { due?: string; assignedUser?: string }) => void;
  getUserColor: (assignedUser?: string) => string;
  formatDueDate: (dueString?: string) => string | null;
}

function TaskItem({
  task,
  users,
  isEditing,
  editingTitle,
  onEditingTitleChange,
  onStartEdit,
  onSaveEdit,
  onEditKeyDown,
  onToggleComplete,
  onDelete,
  onUpdateTask,
  getUserColor,
  formatDueDate,
}: TaskItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompleted = task.status === 'completed';
  const dueDate = formatDueDate(task.due);
  const isOverdue = task.due && !isCompleted && new Date(task.due) < new Date();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDue = e.target.value ? new Date(e.target.value).toISOString() : undefined;
    onUpdateTask(task.id, { due: newDue });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask(task.id, { assignedUser: e.target.value || undefined });
  };

  return (
    <div
      className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors ${
        isEditing ? 'bg-[var(--color-bg-secondary)]' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
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

      {/* Title - inline editable */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            onBlur={onSaveEdit}
            className="w-full bg-transparent text-[var(--color-text-primary)] focus:outline-none"
          />
        ) : (
          <button
            onClick={() => onStartEdit(task)}
            className={`text-left w-full text-[var(--color-text-primary)] ${
              isCompleted ? 'line-through opacity-60' : ''
            }`}
          >
            {task.title}
          </button>
        )}
      </div>

      {/* Due date - always editable */}
      <label className="flex-shrink-0 relative cursor-pointer">
        <input
          type="date"
          value={task.due ? task.due.split('T')[0] : ''}
          onChange={handleDueChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {dueDate ? (
          <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-[var(--color-text-secondary)]'}`}>
            {dueDate}
          </span>
        ) : (
          <svg
            className="w-4 h-4 text-[var(--color-text-secondary)] opacity-30 hover:opacity-60 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </label>

      {/* Assignee - always editable */}
      <select
        value={task.metadata.assignedUser || ''}
        onChange={handleAssigneeChange}
        className="flex-shrink-0 bg-transparent text-sm focus:outline-none cursor-pointer max-w-[80px] truncate appearance-none"
        style={{
          color: task.metadata.assignedUser ? getUserColor(task.metadata.assignedUser) : 'var(--color-text-secondary)',
        }}
      >
        <option value="">–</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      {/* Delete button */}
      {!isEditing && (
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-[var(--color-text-secondary)] hover:text-red-400 transition-all"
          title="Ta bort"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
