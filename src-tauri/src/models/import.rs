use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Clone)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub blocked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skill_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skill_name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct OriginRecord {
    pub skill_path: String,
    pub origin: Value,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ImportGithubRequest {
    #[serde(rename = "repoUrl")]
    pub repo_url: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

#[derive(Debug, Deserialize)]
pub struct ImportLocalRequest {
    #[serde(rename = "sourcePath")]
    pub source_path: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skillName")]
    pub skill_name: String,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

#[derive(Debug, Deserialize)]
pub struct UninstallRequest {
    #[serde(rename = "skillPath")]
    pub skill_path: String,
}
