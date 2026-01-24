use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareImageQrData {
    pub url: String,
    pub source: String,
    #[serde(rename = "shareId")]
    pub share_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareRecord {
    pub share_id: String,
    pub target_type: String, // 'skill', 'profile', 'collection'
    pub target_id: String,
    pub visibility: String, // 'unlisted', 'public'
    pub created_at: String, // ISO 8601 string
    pub expires_at: Option<String>,
    pub metadata: ShareMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: Option<String>,
    #[deprecated(note = "Use source_url instead")]
    pub url: Option<String>,
    /// Skill 源代码 URL (GitHub 仓库链接)
    pub source_url: Option<String>,
    pub security_score: Option<f64>,
    pub security_level: Option<String>,
}
