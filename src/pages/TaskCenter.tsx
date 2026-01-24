import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskItem } from '../components/tasks/TaskItem';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, Activity, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TaskCenter() {
  const { getActiveTasks, getHistoryTasks } = useTaskStore();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const { t } = useTranslation();

  const activeTasks = getActiveTasks();
  const historyTasks = getHistoryTasks();

  const handleClearHistory = async () => {
    try {
      await invoke('cleanup_tasks', { keepCount: 0 });
      // The store will be updated via the listener or we can manually refresh if needed
      // But usually cleanup sends updates or we might need to refetch
      const tasks = await invoke('get_tasks');
      useTaskStore.getState().setTasks(tasks as any);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

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
          {activeTasks.length > 0 && (
            <span className="ml-2 badge badge-sm badge-primary">{activeTasks.length}</span>
          )}
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-4 h-4 mr-2" />
          {t('tasks.history', 'History')}
          {historyTasks.length > 0 && (
            <span className="ml-2 badge badge-sm badge-ghost">{historyTasks.length}</span>
          )}
        </a>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeTasks.length === 0 ? (
              <div className="text-center py-12 text-base-content/50 bg-base-200/50 rounded-lg">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('tasks.noActiveTasks', 'No active tasks running')}</p>
              </div>
            ) : (
              activeTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleClearHistory}
                className="btn btn-sm btn-ghost text-error hover:bg-error/10"
                disabled={historyTasks.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('tasks.clearHistory', 'Clear History')}
              </button>
            </div>

            {historyTasks.length === 0 ? (
              <div className="text-center py-12 text-base-content/50 bg-base-200/50 rounded-lg">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('tasks.noHistory', 'No task history available')}</p>
              </div>
            ) : (
              historyTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
