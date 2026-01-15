import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/services/api';
import type { Task } from '@/types';

// Default task list ID for the service account
export const DEFAULT_TASK_LIST_ID = '@default';

// Query key factory
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'lists'] as const,
  list: (taskListId: string) => [...taskKeys.all, 'list', taskListId] as const,
  tasks: (taskListId: string) => [...taskKeys.list(taskListId), 'tasks'] as const,
  task: (taskListId: string, taskId: string) => [...taskKeys.tasks(taskListId), taskId] as const,
};

/**
 * Hook to fetch all tasks from a task list
 */
export function useTasks(taskListId: string = DEFAULT_TASK_LIST_ID, showCompleted = false) {
  return useQuery({
    queryKey: [...taskKeys.tasks(taskListId), { showCompleted }],
    queryFn: () => tasksApi.listTasks(taskListId, { showCompleted }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch task lists
 */
export function useTaskLists() {
  return useQuery({
    queryKey: taskKeys.lists(),
    queryFn: () => tasksApi.listTaskLists(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new task
 */
export function useCreateTask(taskListId: string = DEFAULT_TASK_LIST_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: {
      title: string;
      notes?: string;
      due?: string;
      assignedUser?: string;
      assignedUserEmail?: string;
    }) => tasksApi.createTask(taskListId, task),
    onSuccess: () => {
      // Invalidate tasks list to refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.tasks(taskListId) });
    },
  });
}

/**
 * Hook to update a task
 */
export function useUpdateTask(taskListId: string = DEFAULT_TASK_LIST_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: {
        title?: string;
        notes?: string;
        due?: string | null;
        status?: 'needsAction' | 'completed';
        assignedUser?: string;
        assignedUserEmail?: string;
      };
    }) => tasksApi.updateTask(taskListId, taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.tasks(taskListId), exact: false });

      // Get all matching queries to restore them on error
      const previousQueries = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.tasks(taskListId),
        exact: false,
      });

      // Update all matching queries optimistically
      queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.tasks(taskListId), exact: false }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...(updates.title !== undefined && { title: updates.title }),
                ...(updates.notes !== undefined && { notes: updates.notes }),
                // Convert null to undefined for due field to match Task type
                ...(updates.due !== undefined && { due: updates.due === null ? undefined : updates.due }),
                ...(updates.status !== undefined && { status: updates.status }),
                metadata: {
                  ...task.metadata,
                  ...(updates.assignedUser !== undefined && { assignedUser: updates.assignedUser }),
                  ...(updates.assignedUserEmail !== undefined && { assignedUserEmail: updates.assignedUserEmail }),
                },
              }
            : task
        );
      });

      return { previousQueries };
    },
    onSuccess: () => {
      // Invalidate to refetch with latest data from server
      queryClient.invalidateQueries({ queryKey: taskKeys.tasks(taskListId), exact: false });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

/**
 * Hook to complete a task
 */
export function useCompleteTask(taskListId: string = DEFAULT_TASK_LIST_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.completeTask(taskListId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.tasks(taskListId) });

      const previousData = queryClient.getQueryData<Task[]>(taskKeys.tasks(taskListId));

      if (previousData) {
        queryClient.setQueryData<Task[]>(
          taskKeys.tasks(taskListId),
          previousData.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task))
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(taskKeys.tasks(taskListId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.tasks(taskListId) });
    },
  });
}

/**
 * Hook to uncomplete a task
 */
export function useUncompleteTask(taskListId: string = DEFAULT_TASK_LIST_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.uncompleteTask(taskListId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.tasks(taskListId) });

      const previousData = queryClient.getQueryData<Task[]>(taskKeys.tasks(taskListId));

      if (previousData) {
        queryClient.setQueryData<Task[]>(
          taskKeys.tasks(taskListId),
          previousData.map((task) => (task.id === taskId ? { ...task, status: 'needsAction' } : task))
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(taskKeys.tasks(taskListId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.tasks(taskListId) });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask(taskListId: string = DEFAULT_TASK_LIST_ID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.deleteTask(taskListId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.tasks(taskListId) });

      const previousData = queryClient.getQueryData<Task[]>(taskKeys.tasks(taskListId));

      if (previousData) {
        queryClient.setQueryData<Task[]>(
          taskKeys.tasks(taskListId),
          previousData.filter((task) => task.id !== taskId)
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(taskKeys.tasks(taskListId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.tasks(taskListId) });
    },
  });
}
