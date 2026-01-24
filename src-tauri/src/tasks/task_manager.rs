use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use tauri::{AppHandle, Emitter};
use once_cell::sync::Lazy;
use chrono::{Utc, DateTime};

use super::task::{BackgroundTask, TaskStatus, TaskType};
use super::progress::ProgressEvent;
use super::cancellation::TaskCancellationToken;

// Global singleton instance
pub static TASK_MANAGER: Lazy<TaskManager> = Lazy::new(TaskManager::new);

pub struct TaskManager {
    tasks: Arc<RwLock<HashMap<String, BackgroundTask>>>,
    cancellation_tokens: Arc<Mutex<HashMap<String, TaskCancellationToken>>>,
    // Concurrency semaphores
    global_semaphore: Arc<tokio::sync::Semaphore>,
    download_semaphore: Arc<tokio::sync::Semaphore>,
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            cancellation_tokens: Arc::new(Mutex::new(HashMap::new())),
            // Limit global concurrent tasks to 3
            global_semaphore: Arc::new(tokio::sync::Semaphore::new(3)),
            // Limit download tasks to 2
            download_semaphore: Arc::new(tokio::sync::Semaphore::new(2)),
        }
    }
}

impl Default for TaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskManager {
    pub async fn add_task(&self, task: BackgroundTask) -> String {
        let id = task.id.clone();

        // Initialize cancellation token
        let token = TaskCancellationToken::new();
        self.cancellation_tokens.lock().unwrap().insert(id.clone(), token);

        // Add task to store
        let mut tasks = self.tasks.write().await;
        tasks.insert(id.clone(), task);

        id
    }

    pub async fn get_task(&self, id: &str) -> Option<BackgroundTask> {
        let tasks = self.tasks.read().await;
        tasks.get(id).cloned()
    }

    pub async fn get_all_tasks(&self) -> Vec<BackgroundTask> {
        let tasks = self.tasks.read().await;
        let mut task_list: Vec<BackgroundTask> = tasks.values().cloned().collect();
        // Sort by creation time desc
        task_list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        task_list
    }

    pub async fn update_progress(&self, app: &AppHandle, event: ProgressEvent) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(&event.task_id) {
            task.progress = Some(event.clone());

            // Emit event to frontend
            let _ = app.emit("task-progress", &event);

            // Update status based on progress stage if needed
            // This is just a helper, the explicit update_status is authoritative
        }
    }

    pub async fn update_status(&self, app: &AppHandle, task_id: &str, status: TaskStatus) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = status.clone();

            match status {
                TaskStatus::Running => {
                    if task.started_at.is_none() {
                        task.started_at = Some(Utc::now());
                    }
                },
                TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled => {
                    task.completed_at = Some(Utc::now());
                    // Remove cancellation token when done
                    self.cancellation_tokens.lock().unwrap().remove(task_id);
                },
                _ => {}
            }

            // Emit update to frontend
            let _ = app.emit("task-update", task.clone());
        }
    }

    pub async fn update_error(&self, app: &AppHandle, task_id: &str, error: String) {
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.error = Some(error);
            task.status = TaskStatus::Failed;
            task.completed_at = Some(Utc::now());

            // Emit update to frontend
            let _ = app.emit("task-update", task.clone());
        }
    }

    pub fn cancel_task(&self, task_id: &str) -> bool {
        let tokens = self.cancellation_tokens.lock().unwrap();
        if let Some(token) = tokens.get(task_id) {
            token.cancel();
            return true;
        }
        false
    }

    pub async fn cleanup_old_tasks(&self, keep_count: usize) {
        let mut tasks = self.tasks.write().await;

        // Find completed tasks
        let mut completed_tasks: Vec<(String, DateTime<Utc>)> = tasks.iter()
            .filter(|(_, t)| matches!(t.status, TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled))
            .map(|(id, t)| (id.clone(), t.completed_at.unwrap_or(t.created_at)))
            .collect();

        // Sort by time (oldest first)
        completed_tasks.sort_by(|a, b| a.1.cmp(&b.1));

        // Remove oldest if we have more than keep_count
        if completed_tasks.len() > keep_count {
            let remove_count = completed_tasks.len() - keep_count;
            for (task_id, _) in completed_tasks.iter().take(remove_count) {
                tasks.remove(task_id);
            }
        }
    }

    pub async fn acquire_permit(&self, task_type: &TaskType) -> (tokio::sync::OwnedSemaphorePermit, Option<tokio::sync::OwnedSemaphorePermit>) {
        let global_permit = self.global_semaphore.clone().acquire_owned().await.unwrap();

        let specific_permit = match task_type {
            TaskType::Download => {
                Some(self.download_semaphore.clone().acquire_owned().await.unwrap())
            },
            _ => None
        };

        (global_permit, specific_permit)
    }

    pub fn get_cancellation_token(&self, task_id: &str) -> Option<TaskCancellationToken> {
        let tokens = self.cancellation_tokens.lock().unwrap();
        tokens.get(task_id).cloned()
    }
}
