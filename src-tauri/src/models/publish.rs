use serde::{Deserialize, Serialize};

/// 发布历史记录
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PublishRecord {
    pub id: String,
    pub skill_name: String,
    pub skill_version: String,
    pub skill_id: String,
    pub listing_id: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub published_at: i64,      // Unix timestamp (milliseconds)
    pub status: PublishStatus,   // published, failed, pending
    pub error_message: Option<String>,
}

/// 发布状态
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PublishStatus {
    Published,
    Failed,
    Pending,
}
