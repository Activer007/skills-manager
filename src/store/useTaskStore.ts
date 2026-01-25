import { create } from 'zustand';
import { TaskStatus } from '../types/task';
import type { Task, ProgressEvent } from '../types/task';

interface TaskStore {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;
  updateTaskProgress: (progress: ProgressEvent) => void;

  // Selectors
  getActiveTasks: () => Task[];
  getHistoryTasks: () => Task[];
  getTask: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  upsertTask: (updatedTask) => set((state) => {
    const exists = state.tasks.some(t => t.id === updatedTask.id);
    if (exists) {
      return {
        tasks: state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      };
    } else {
      // Add new task at the beginning
      return {
        tasks: [updatedTask, ...state.tasks]
      };
    }
  }),

  updateTaskProgress: (progress) => set((state) => ({
    tasks: state.tasks.map(t => {
      if (t.id === progress.task_id) {
        return { ...t, progress };
      }
      return t;
    })
  })),

  getActiveTasks: () => {
    return get().tasks.filter(t =>
      t.status === TaskStatus.Pending ||
      t.status === TaskStatus.Running
    );
  },

  getHistoryTasks: () => {
    return get().tasks.filter(t =>
      t.status === TaskStatus.Completed ||
      t.status === TaskStatus.Failed ||
      t.status === TaskStatus.Cancelled
    );
  },

  getTask: (id) => get().tasks.find(t => t.id === id)
}));
