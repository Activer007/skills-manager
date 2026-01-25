import { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskItem } from '../components/tasks/TaskItem';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, Activity, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../types/task';
import { TaskStatus } from '../types/task';

// Component for Active Tasks List
const ActiveTasksList = () => {
  const { t } = useTranslation();
  // Using selector to only subscribe to active tasks
  const activeTasks = useTaskStore(state =>
    state.tasks.filter(t =>
      t.status === TaskStatus.Pending ||
      t.status === TaskStatus.Running
    )
  );

  if (activeTasks.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/50 bg-base-200/50 rounded-lg" data-testid="active-empty-state">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{t('tasks.noActiveTasks', 'No active tasks running')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="active-task-list">
      {activeTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
};

// Component for History Tasks List
const HistoryTasksList = () => {
  const { t } = useTranslation();
  // Using selector to only subscribe to history tasks
  const historyTasks = useTaskStore(state =>
    state.tasks.filter(t =>
      t.status === TaskStatus.Completed ||
      t.status === TaskStatus.Failed ||
      t.status === TaskStatus.Cancelled
    )
  );

  const handleClearHistory = async () => {
    try {
      await invoke('cleanup_tasks', { keepCount: 0 });
      // Refetch tasks to update the UI
      const tasks = await invoke<Task[]>('get_tasks');
      useTaskStore.getState().setTasks(tasks);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  if (historyTasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end mb-2">
          <button
            className="btn btn-sm btn-ghost text-error hover:bg-error/10"
            disabled
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('tasks.clearHistory', 'Clear History')}
          </button>
        </div>
        <div className="text-center py-12 text-base-content/50 bg-base-200/50 rounded-lg" data-testid="history-empty-state">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('tasks.noHistory', 'No task history available')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="history-task-list">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleClearHistory}
          className="btn btn-sm btn-ghost text-error hover:bg-error/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('tasks.clearHistory', 'Clear History')}
        </button>
      </div>

      {historyTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
};

export default function TaskCenter() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const { t } = useTranslation();

  // These are lightweight selectors just for counts, could be optimized further if needed
  const activeCount = useTaskStore(state =>
    state.tasks.filter(t => t.status === TaskStatus.Pending || t.status === TaskStatus.Running).length
  );

  const historyCount = useTaskStore(state =>
    state.tasks.filter(t => t.status !== TaskStatus.Pending && t.status !== TaskStatus.Running).length
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          {t('tasks.title', 'Task Center')}
        </h1>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-200 p-1 rounded-lg inline-flex">
        <a
          role="tab"
          className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Activity className="w-4 h-4 mr-2" />
          {t('tasks.active', 'Active')}
          {activeCount > 0 && (
            <span className="ml-2 badge badge-sm badge-primary">{activeCount}</span>
          )}
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-4 h-4 mr-2" />
          {t('tasks.history', 'History')}
          {historyCount > 0 && (
            <span className="ml-2 badge badge-sm badge-ghost">{historyCount}</span>
          )}
        </a>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'active' && <ActiveTasksList />}
        {activeTab === 'history' && <HistoryTasksList />}
      </div>
    </div>
  );
}
