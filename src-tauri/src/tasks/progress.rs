use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProgressStage {
    Queued,
    Preparing,
    Downloading,
    Scanning,
    Installing,
    Finalizing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub task_id: String,
    pub stage: ProgressStage,
    pub message: String,
    pub progress: u8, // 0-100
    pub total: Option<u64>,
    pub current: Option<u64>,
}

impl ProgressEvent {
    pub fn new(task_id: &str, stage: ProgressStage, message: &str, progress: u8) -> Self {
        Self {
            task_id: task_id.to_string(),
            stage,
            message: message.to_string(),
            progress,
            total: None,
            current: None,
        }
    }
}
