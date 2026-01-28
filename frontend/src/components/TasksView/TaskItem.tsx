import { useState, useRef, useEffect } from 'react';
import type { Task } from '@/types';
import CalendarIcon from '@/assets/icons/calendar.svg?react';
import CheckmarkIcon from '@/assets/icons/checkmark.svg?react';
import CloseIcon from '@/assets/icons/close.svg?react';

export interface TaskItemProps {
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
  onUpdateTask: (taskId: string, updates: { due?: string | null; assignedUser?: string }) => void;
  getUserColor: (assignedUser?: string) => string;
  formatDueDate: (dueString?: string) => string | null;
}

export function TaskItem({
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
  const [isCompleted, setIsCompleted] = useState(task.status === 'completed');
  const dueDate = formatDueDate(task.due);
  const isOverdue = task.due && !isCompleted && new Date(task.due) < new Date();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggleClick = async () => {
    setIsCompleted(!isCompleted);
    try {
      await onToggleComplete(task);
    } catch {
      setIsCompleted(isCompleted);
    }
  };

  const handleDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDue = e.target.value ? new Date(e.target.value).toISOString() : null;
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
      <button
        onClick={handleToggleClick}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
            : 'border-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
        }`}
      >
        {isCompleted && <CheckmarkIcon className="w-3 h-3 text-white" aria-hidden="true" />}
      </button>

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

      <label className="flex-shrink-0 relative cursor-pointer flex items-center">
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
          <CalendarIcon
            className="w-4 h-4 opacity-30 hover:opacity-60 transition-opacity text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
        )}
      </label>

      <label className="flex-shrink-0 relative cursor-pointer min-w-[50px] sm:min-w-0 max-w-[80px] flex items-center">
        <select
          value={task.metadata.assignedUser || ''}
          onChange={handleAssigneeChange}
          className="absolute inset-0 w-full h-full bg-transparent text-sm focus:outline-none cursor-pointer appearance-none opacity-0 z-20"
          style={{
            color: task.metadata.assignedUser
              ? getUserColor(task.metadata.assignedUser)
              : 'var(--color-text-secondary)',
          }}
        >
          <option value="">–</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <span
          className="text-xs truncate pointer-events-none"
          style={{
            color: task.metadata.assignedUser
              ? getUserColor(task.metadata.assignedUser)
              : 'var(--color-text-secondary)',
          }}
        >
          {task.metadata.assignedUser ? users.find((u) => u.id === task.metadata.assignedUser)?.name || '–' : '–'}
        </span>
      </label>

      {!isEditing && (
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 p-1 rounded opacity-50 hover:opacity-100 text-[var(--color-text-secondary)] hover:text-red-400 transition-all"
          title="Ta bort"
        >
          <CloseIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
