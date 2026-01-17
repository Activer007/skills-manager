use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillConfig {
    #[serde(flatten)]
    pub settings: Value,
}
