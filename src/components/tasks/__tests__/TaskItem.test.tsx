import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskItem } from '../TaskItem';
import { Task, TaskStatus, TaskType } from '../../../types/task';
import { invoke } from '@tauri-apps/api/core';

// Mock tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('TaskItem', () => {
  const mockTask: Task = {
    id: '123',
    task_type: 'Download' as TaskType,
    status: TaskStatus.Pending,
    title: 'Test Task',
    created_at: new Date().toISOString(),
  };

  it('renders task title', () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders cancel button for pending tasks', () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByTitle('Cancel Task')).toBeInTheDocument();
  });

  it('renders cancel button for running tasks', () => {
    const runningTask = { ...mockTask, status: TaskStatus.Running };
    render(<TaskItem task={runningTask} />);
    expect(screen.getByTitle('Cancel Task')).toBeInTheDocument();
  });

  it('does not render cancel button for completed tasks', () => {
    const completedTask = { ...mockTask, status: TaskStatus.Completed };
    render(<TaskItem task={completedTask} />);
    expect(screen.queryByTitle('Cancel Task')).not.toBeInTheDocument();
  });

  it('calls cancel_task when cancel button is clicked', () => {
    render(<TaskItem task={mockTask} />);
    fireEvent.click(screen.getByTitle('Cancel Task'));
    expect(invoke).toHaveBeenCalledWith('cancel_task', { taskId: '123' });
  });

  it('displays progress bar when running with progress', () => {
    const progressTask: Task = {
      ...mockTask,
      status: TaskStatus.Running,
      progress: {
        task_id: '123',
        stage: 'Downloading' as any,
        message: 'Downloading...',
        progress: 50
      }
    };
    render(<TaskItem task={progressTask} />);
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when failed', () => {
    const failedTask: Task = {
      ...mockTask,
      status: TaskStatus.Failed,
      error: 'Network error'
    };
    render(<TaskItem task={failedTask} />);
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();
  });
});
