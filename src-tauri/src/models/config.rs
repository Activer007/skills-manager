use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillConfig {
    #[serde(flatten)]
    pub settings: Value,
}

#[derive(Debug, Deserialize)]
pub struct SavePathsRequest {
    pub paths: Vec<String>,
}

