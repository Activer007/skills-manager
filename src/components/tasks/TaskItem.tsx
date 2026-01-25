import React, { useState, memo } from 'react';
import type { Task } from '../../types/task';
import { TaskStatus } from '../../types/task';
import { invoke } from '@tauri-apps/api/core';
import { format, isValid } from 'date-fns';
import { XCircle, CheckCircle, AlertCircle, Clock, Loader2, Ban } from 'lucide-react';

interface TaskItemProps {
  task: Task;
}

export const TaskItem: React.FC<TaskItemProps> = memo(({ task }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const isRunning = task.status === TaskStatus.Running;
  const isPending = task.status === TaskStatus.Pending;
  const isCancellable = isRunning || isPending;

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await invoke('cancel_task', { taskId: task.id });
      // Note: We don't reset isCancelling here because we expect the task status
      // to change to Cancelled/Failed via the event listener shortly.
    } catch (error) {
      console.error('Failed to cancel task:', error);
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'HH:mm:ss') : '-';
  };

  const getStatusIcon = () => {
    if (isCancelling) return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;

    switch (task.status) {
      case TaskStatus.Running:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case TaskStatus.Pending:
        return <Clock className="w-5 h-5 text-gray-400" />;
      case TaskStatus.Completed:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case TaskStatus.Failed:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case TaskStatus.Cancelled:
        return <Ban className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case TaskStatus.Running:
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
      case TaskStatus.Completed:
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10';
      case TaskStatus.Failed:
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case TaskStatus.Cancelled:
        return 'border-l-gray-500 bg-gray-50/50 dark:bg-gray-800/10';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <div
      className={`p-4 mb-3 bg-base-100 rounded-lg shadow-sm border border-base-200 border-l-4 ${getStatusColor()}`}
      data-testid="task-card"
      data-task-id={task.id}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <h3 className="font-medium text-base-content truncate" title={task.title}>
              {task.title}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content/70"
              data-testid={`task-status-${task.status.toLowerCase()}`}
            >
              {isCancelling ? 'Cancelling...' : task.status}
            </span>
          </div>

          <div className="text-sm text-base-content/60 flex items-center gap-3 mb-2">
            <span>Started: {formatDate(task.started_at)}</span>
            {task.completed_at && (
              <span>Ended: {formatDate(task.completed_at)}</span>
            )}
          </div>

          {task.error && (
            <div className="text-sm text-red-500 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              Error: {task.error}
            </div>
          )}

          {isRunning && task.progress && !isCancelling && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-base-content/70 mb-1">
                <span>{task.progress.message}</span>
                <span>{task.progress.progress}%</span>
              </div>
              <progress
                role="progressbar"
                aria-label="Task progress"
                aria-valuenow={task.progress.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="progress progress-primary w-full h-2"
                value={task.progress.progress}
                max="100"
              ></progress>
            </div>
          )}
        </div>

        {isCancellable && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="btn btn-ghost btn-sm btn-square text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:bg-transparent disabled:text-gray-400"
            title="Cancel Task"
          >
            {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';
