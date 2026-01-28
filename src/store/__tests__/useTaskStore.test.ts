import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskStore } from '../useTaskStore';
import { TaskStatus } from '../../types/task';
import type { Task, TaskType } from '../../types/task';

describe('useTaskStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useTaskStore.setState({ tasks: [] });
    });
  });

  const mockTask: Task = {
    id: '1',
    task_type: 'Download' as TaskType,
    status: TaskStatus.Pending,
    title: 'Test Task',
    created_at: new Date().toISOString(),
  };

  it('should initialize with empty tasks', () => {
    const { result } = renderHook(() => useTaskStore());
    expect(result.current.tasks).toEqual([]);
  });

  it('should set tasks', () => {
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.setTasks([mockTask]);
    });
    expect(result.current.tasks).toEqual([mockTask]);
  });

  it('should upsert a new task', () => {
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.upsertTask(mockTask);
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toEqual(mockTask);
  });

  it('should update an existing task', () => {
    const { result } = renderHook(() => useTaskStore());

    // Add initial task
    act(() => {
      result.current.upsertTask(mockTask);
    });

    // Update the task
    const updatedTask = { ...mockTask, status: TaskStatus.Running };
    act(() => {
      result.current.upsertTask(updatedTask);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].status).toBe(TaskStatus.Running);
  });

  it('should update task progress', () => {
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.upsertTask(mockTask);
    });

    const progressEvent = {
      task_id: mockTask.id,
      stage: 'Downloading' as any,
      message: 'Downloading...',
      progress: 50
    };

    act(() => {
      result.current.updateTaskProgress(progressEvent);
    });

    expect(result.current.tasks[0].progress).toEqual(progressEvent);
  });

  it('should filter active tasks', () => {
    const { result } = renderHook(() => useTaskStore());
    const completedTask = { ...mockTask, id: '2', status: TaskStatus.Completed };

    act(() => {
      result.current.setTasks([mockTask, completedTask]);
    });

    expect(result.current.getActiveTasks()).toHaveLength(1);
    expect(result.current.getActiveTasks()[0].id).toBe('1');
  });

  it('should filter history tasks', () => {
    const { result } = renderHook(() => useTaskStore());
    const completedTask = { ...mockTask, id: '2', status: TaskStatus.Completed };

    act(() => {
      result.current.setTasks([mockTask, completedTask]);
    });

    expect(result.current.getHistoryTasks()).toHaveLength(1);
    expect(result.current.getHistoryTasks()[0].id).toBe('2');
  });
});
