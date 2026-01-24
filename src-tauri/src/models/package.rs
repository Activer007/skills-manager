use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillPackageMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportSkillPackageRequest {
    #[serde(rename = "skillPath")]
    pub skill_path: String,
    #[serde(rename = "outputDir")]
    pub output_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExportCollectionPackageRequest {
    #[serde(rename = "collectionId")]
    pub collection_id: String,
    #[serde(rename = "outputDir")]
    pub output_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportPackageRequest {
    #[serde(rename = "packagePath")]
    pub package_path: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
}
