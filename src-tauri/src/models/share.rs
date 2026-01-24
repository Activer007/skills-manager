use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareImageQrData {
    pub url: String,
    pub source: String,
    #[serde(rename = "shareId")]
    pub share_id: Option<String>,
}
