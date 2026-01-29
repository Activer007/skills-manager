use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub path: String,
    #[serde(rename = "skillType")]
    pub skill_type: String,
    #[serde(rename = "isMcp")]
    pub is_mcp: bool,
    pub tags: Vec<String>,
    #[serde(rename = "configSchema")]
    pub config_schema: Option<serde_json::Value>,
    pub author: Option<String>,
    #[serde(rename = "derivedFrom")]
    pub derived_from: Option<String>,
    #[serde(rename = "forkType")]
    pub fork_type: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScanResult {
    #[serde(rename = "systemSkills")]
    pub system_skills: Vec<SkillInfo>,
    #[serde(rename = "projectSkills")]
    pub project_skills: Vec<SkillInfo>,
}

/// Installed skill with snapshot pattern (v2.1)
///
/// This model represents an installed skill with snapshot data that ensures
/// data independence from marketplace changes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledSkill {
    // Primary key
    pub id: String,

    // Source association
    #[serde(rename = "marketplaceSkillId")]
    pub marketplace_skill_id: Option<String>,

    // Snapshot fields (data independence)
    #[serde(rename = "originalRepositoryId")]
    pub original_repository_id: Option<String>,
    #[serde(rename = "originalRepositoryName")]
    pub original_repository_name: Option<String>,
    #[serde(rename = "originalRepositoryUrl")]
    pub original_repository_url: Option<String>,
    #[serde(rename = "originalSkillPath")]
    pub original_skill_path: Option<String>,
    #[serde(rename = "originalAuthor")]
    pub original_author: Option<String>,
    #[serde(rename = "originalSourceType")]
    pub original_source_type: Option<String>,

    // Basic information
    pub name: String,
    #[serde(rename = "localPath")]
    pub local_path: String,

    // Installation information
    #[serde(rename = "installedAt")]
    pub installed_at: i64,
    pub enabled: bool,
}

impl InstalledSkill {
    /// Create an InstalledSkill from scan result
    pub fn from_scan_result(
        skill_info: SkillInfo,
        marketplace_skill_id: Option<String>,
    ) -> Self {
        Self {
            id: format!("installed-{}", uuid::Uuid::new_v4()),
            marketplace_skill_id: marketplace_skill_id.clone(),
            original_repository_id: None,
            original_repository_name: None,
            original_repository_url: None,
            original_skill_path: None,
            original_author: skill_info.author.clone(),
            original_source_type: None,
            name: skill_info.name,
            local_path: skill_info.path,
            installed_at: Utc::now().timestamp(),
            enabled: true,
        }
    }

    /// Populate snapshot data from marketplace skill and repository
    ///
    /// This method fills in the snapshot fields to ensure data independence.
    /// It should be called when the skill is first installed or when the
    /// marketplace association is established.
    pub fn populate_snapshot(&mut self, marketplace_skill: &crate::models::marketplace::MarketplaceSkill, repository: &crate::models::repository::Repository) {
        self.original_repository_id = Some(repository.id.clone());
        self.original_repository_name = Some(repository.name.clone());
        self.original_repository_url = Some(repository.url.clone());
        self.original_skill_path = Some(marketplace_skill.skill_path.clone());
        self.original_author = marketplace_skill.author.clone();
        self.original_source_type = Some(repository.source_type.clone());
    }

    /// Check if this skill has snapshot data
    pub fn has_snapshot(&self) -> bool {
        self.original_repository_id.is_some()
            && self.original_repository_name.is_some()
            && self.original_repository_url.is_some()
    }
}
