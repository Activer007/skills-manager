use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillConfig {
    #[serde(flatten)]
    pub settings: Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CacheConfig {
    pub max_capacity: usize,
    pub ttl_seconds: u64,
    pub enable_db_sync: bool,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            max_capacity: 100,
            ttl_seconds: 300, // 5 minutes
            enable_db_sync: true,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SavePathsRequest {
    pub paths: Vec<String>,
}

