import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '../store/useTaskStore';
import { useToastStore } from '../store/useToastStore';
import { TaskStatus } from '../types/task';
import type { Task, ProgressEvent } from '../types/task';

export function useTaskListener() {
  const { setTasks, upsertTask, updateTaskProgress } = useTaskStore();
  const { addToast } = useToastStore();

  // Use a ref to track if we've already set up listeners to avoid duplicates in strict mode
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let unlistenUpdate: UnlistenFn | undefined;
    let unlistenProgress: UnlistenFn | undefined;

    const setupListeners = async () => {
      // Initial fetch of tasks
      try {
        const tasks = await invoke<Task[]>('get_tasks');
        setTasks(tasks);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }

      // Listen for task updates (creation, status change, completion)
      unlistenUpdate = await listen<Task>('task-update', (event) => {
        const task = event.payload;
        upsertTask(task);

        // Show toast on completion/failure
        if (task.status === TaskStatus.Completed) {
          addToast(`Task completed: ${task.title}`, 'success');
        } else if (task.status === TaskStatus.Failed) {
          addToast(`Task failed: ${task.title}: ${task.error || 'Unknown error'}`, 'error');
        }
      });

      // Listen for progress updates
      unlistenProgress = await listen<ProgressEvent>('task-progress', (event) => {
        updateTaskProgress(event.payload);
      });
    };

    setupListeners();

    return () => {
      if (unlistenUpdate) unlistenUpdate();
      if (unlistenProgress) unlistenProgress();
      initialized.current = false;
    };
  }, [setTasks, upsertTask, updateTaskProgress, addToast]);
}
