import { useState, useCallback, useRef } from 'react';
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
import EyeOpenIcon from '@/assets/icons/eye-open.svg?react';
import EyeClosedIcon from '@/assets/icons/eye-closed.svg?react';
import CalendarIcon from '@/assets/icons/calendar.svg?react';
import { TaskItem } from './TaskItem';

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

  const users = calendars.map((cal) => ({
    id: cal.name.toLowerCase().replace(/\s+/g, ''),
    name: cal.name,
    color: cal.color,
  }));

  // Filter tasks by user and search text
  const filteredTasks = tasks.filter((task) => {
    const matchesUser = !filterUser || task.metadata.assignedUser === filterUser;
    const matchesSearch = !newTaskTitle.trim() || task.title.toLowerCase().includes(newTaskTitle.toLowerCase().trim());
    return matchesUser && matchesSearch;
  });

  const sortTasks = (taskList: Task[]): Task[] => {
    const tasks = [...taskList];

    tasks.sort((a, b) => a.title.localeCompare(b.title));

    tasks.sort((a, b) => {
      const aAssignee = a.metadata.assignedUser || '';
      const bAssignee = b.metadata.assignedUser || '';
      return aAssignee.localeCompare(bAssignee);
    });

    tasks.sort((a, b) => {
      const aDate = a.due ? new Date(a.due) : null;
      const bDate = b.due ? new Date(b.due) : null;

      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();

      return 0;
    });

    return tasks;
  };

  const sortCompletedTasks = (taskList: Task[]): Task[] => {
    const tasks = [...taskList];

    // Sort by completion date (most recent first)
    tasks.sort((a, b) => {
      const aCompleted = a.completed ? new Date(a.completed) : null;
      const bCompleted = b.completed ? new Date(b.completed) : null;

      if (!aCompleted && !bCompleted) return 0;
      if (!aCompleted) return 1; // Tasks without completion date go to the end
      if (!bCompleted) return -1;

      // Most recent first (descending order)
      return bCompleted.getTime() - aCompleted.getTime();
    });

    return tasks;
  };

  const activeTasks = sortTasks(filteredTasks.filter((t) => t.status === 'needsAction'));
  const completedTasks = sortCompletedTasks(filteredTasks.filter((t) => t.status === 'completed'));

  const handleFilterChange = useCallback((userId: string | null) => {
    setFilterUser(userId);
    setNewTaskAssignee(userId || '');
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || createTask.isPending) return;

    await createTask.mutateAsync({
      title: newTaskTitle.trim(),
      due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
      assignedUser: newTaskAssignee || undefined,
    });

    setNewTaskTitle('');
    setNewTaskDue('');
    newTaskInputRef.current?.focus();
  }, [newTaskTitle, newTaskDue, newTaskAssignee, createTask]);

  const handleNewTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCreateTask();
    }
  };

  const handleNewTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleCreateTask();
  };

  const handleStartEdit = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTaskId || !editingTitle.trim() || updateTask.isPending) return;

    await updateTask.mutateAsync({
      taskId: editingTaskId,
      updates: { title: editingTitle.trim() },
    });

    setEditingTaskId(null);
    setEditingTitle('');
  }, [editingTaskId, editingTitle, updateTask]);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditingTitle('');
  }, []);

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: { due?: string | null; assignedUser?: string }) => {
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

        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="ml-auto p-1 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
          title="Visa färdiga uppgifter"
        >
          {showCompleted ? (
            <EyeOpenIcon className="w-5 h-5 text-[var(--color-accent)]" aria-hidden="true" />
          ) : (
            <EyeClosedIcon className="w-5 h-5 opacity-60 text-[var(--color-text-secondary)]" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 p-3 mb-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] border-dashed">
          <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-[var(--color-text-secondary)]/30" />
          <form onSubmit={handleNewTaskSubmit} className="flex-1 min-w-0">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleNewTaskKeyDown}
              enterKeyHint="done"
              placeholder="Lägg till uppgift..."
              className="w-full bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none"
            />
          </form>
          <label className="flex-shrink-0 relative cursor-pointer flex items-center">
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
              <CalendarIcon
                className="w-4 h-4 opacity-50 pointer-events-none text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
            )}
          </label>
          <label className="flex-shrink-0 relative cursor-pointer min-w-[60px] sm:min-w-0 max-w-[100px] flex items-center">
            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="absolute inset-0 w-full h-full bg-transparent text-[var(--color-text-secondary)] text-sm focus:outline-none cursor-pointer appearance-none opacity-0 z-20"
              style={newTaskAssignee ? { color: getUserColor(newTaskAssignee) } : undefined}
            >
              <option value="">Ingen</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <span
              className="text-xs pointer-events-none"
              style={
                newTaskAssignee ? { color: getUserColor(newTaskAssignee) } : { color: 'var(--color-text-secondary)' }
              }
            >
              {newTaskAssignee ? users.find((u) => u.id === newTaskAssignee)?.name || 'Ingen' : 'Ingen'}
            </span>
          </label>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--color-text-secondary)]">Inga aktiva uppgifter</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeTasks.map((task) => (
              <TaskItem
                key={`${task.id}-${task.status}`}
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

        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">
              Färdiga ({completedTasks.length})
            </h3>
            <div className="space-y-1 opacity-60">
              {completedTasks.map((task) => (
                <TaskItem
                  key={`${task.id}-${task.status}`}
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
