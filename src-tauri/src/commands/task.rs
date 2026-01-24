use tauri::{AppHandle, command, State};
use super::task_manager::TASK_MANAGER;
use super::task::BackgroundTask;

#[command]
pub async fn get_tasks() -> Result<Vec<BackgroundTask>, String> {
    Ok(TASK_MANAGER.get_all_tasks().await)
}

#[command]
pub async fn get_task(task_id: String) -> Result<Option<BackgroundTask>, String> {
    Ok(TASK_MANAGER.get_task(&task_id).await)
}

#[command]
pub async fn cancel_task(app: AppHandle, task_id: String) -> Result<(), String> {
    if TASK_MANAGER.cancel_task(&task_id) {
        // We also manually update status to Cancelled immediately for UI responsiveness
        // The actual task loop should detect cancellation and stop
        TASK_MANAGER.update_status(&app, &task_id, super::task::TaskStatus::Cancelled).await;
        Ok(())
    } else {
        Err("Task not found or already completed".to_string())
    }
}

#[command]
pub async fn cleanup_tasks(keep_count: Option<usize>) -> Result<(), String> {
    let count = keep_count.unwrap_or(20);
    TASK_MANAGER.cleanup_old_tasks(count).await;
    Ok(())
}
