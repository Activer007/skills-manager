use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use super::progress::ProgressEvent;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskType {
    ImportSkill,
    ScanSkill,
    ScanRepository,
    Download,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundTask {
    pub id: String,
    pub task_type: TaskType,
    pub status: TaskStatus,
    pub title: String,
    pub progress: Option<ProgressEvent>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}

impl BackgroundTask {
    pub fn new(task_type: TaskType, title: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            task_type,
            status: TaskStatus::Pending,
            title,
            progress: None,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            error: None,
        }
    }
}
