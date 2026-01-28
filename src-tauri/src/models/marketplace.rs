use serde::{Deserialize, Serialize};

/// Marketplace skill with repository association (v2.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkill {
    // Primary key (new format: {repository_id}_{skill_path_hash})
    pub id: String,

    // Basic information
    pub name: String,
    pub author: Option<String>,
    pub description: Option<String>,

    // Repository association (new fields)
    #[serde(rename = "skillPath")]
    pub skill_path: String,  // Path within repository
    #[serde(rename = "repositoryId")]
    pub repository_id: String,  // Foreign key to repositories

    // Metadata
    pub github_url: Option<String>,
    pub version: Option<String>,  // Skill version (e.g., "1.0.0")
    pub stars: i64,
    pub forks: i64,
    pub updated_at: i64,

    // Extended information
    pub tags: Option<String>, // JSON serialized array
    pub security_score: Option<i32>,
    pub compatibility: Option<String>, // JSON serialized object
    pub config_schema: Option<String>, // JSON serialized object

    // Sync information (new fields)
    #[serde(rename = "discoveredAt")]
    pub discovered_at: i64,
    #[serde(rename = "syncedAt")]
    pub synced_at: i64,

    // Full data blob (legacy)
    pub data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillManifest {
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub url: Option<String>, // This usually maps to github_url
    pub stars: Option<i64>,
    pub forks: Option<i64>,
    pub updated_at: Option<String>, // Usually string in JSON, needs parsing
    pub tags: Option<Vec<String>>,
    // Add other fields from the raw JSON as needed
}

/// MarketplaceSkill DTO with repository information (v2.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSkillDTO {
    // Basic information
    pub id: String,
    pub name: String,
    pub author: Option<String>,
    pub description: Option<String>,

    // Metadata
    pub github_url: Option<String>,
    pub version: Option<String>,  // Skill version (e.g., "1.0.0")
    pub stars: i64,
    pub forks: i64,
    pub updated_at: i64,

    // Tags (parsed as array)
    pub tags: Vec<String>,
    pub security_score: Option<i32>,
    pub compatibility: Option<serde_json::Value>,

    // Source information (new fields)
    #[serde(rename = "repositoryId")]
    pub repository_id: String,
    #[serde(rename = "repositoryName")]
    pub repository_name: String,
    #[serde(rename = "sourceType")]
    pub source_type: String,  // 'featured' | 'user'
    pub priority: i32,
    #[serde(rename = "skillPath")]
    pub skill_path: String,

    // Sync information (new fields)
    #[serde(rename = "discoveredAt")]
    pub discovered_at: i64,
    #[serde(rename = "syncedAt")]
    pub synced_at: i64,
}

impl MarketplaceSkill {
    /// Create a new MarketplaceSkill with default values (for backwards compatibility)
    pub fn new_legacy(
        id: String,
        name: String,
        author: Option<String>,
        description: Option<String>,
        github_url: Option<String>,
        stars: i64,
        forks: i64,
        updated_at: i64,
    ) -> Self {
        Self {
            id,
            name,
            author,
            description,
            skill_path: String::new(),  // Empty for legacy
            repository_id: String::new(),  // Empty for legacy
            github_url,
            version: None,
            stars,
            forks,
            updated_at,
            tags: None,
            security_score: None,
            compatibility: None,
            config_schema: None,
            discovered_at: updated_at,
            synced_at: chrono::Utc::now().timestamp(),
            data: None,
        }
    }

    /// Create from row (for v10 compatibility - missing new fields)
    pub fn from_row_legacy(
        id: String,
        name: String,
        author: Option<String>,
        description: Option<String>,
        github_url: Option<String>,
        version: Option<String>,
        stars: i64,
        forks: i64,
        updated_at: i64,
        tags: Option<String>,
        security_score: Option<i32>,
        compatibility: Option<String>,
    ) -> Self {
        Self {
            id,
            name,
            author,
            description,
            skill_path: String::new(),
            repository_id: String::new(),
            github_url,
            version,
            stars,
            forks,
            updated_at,
            tags,
            security_score,
            compatibility,
            config_schema: None,
            discovered_at: updated_at,
            synced_at: chrono::Utc::now().timestamp(),
            data: None,
        }
    }
}

impl MarketplaceSkillDTO {
    /// Create DTO from skill with repository information
    pub fn from_skill_with_repository(
        skill: MarketplaceSkill,
        repository_name: String,
        source_type: String,
        priority: i32,
    ) -> Self {
        let tags: Vec<String> = skill.tags
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default();

        let compatibility: Option<serde_json::Value> = skill.compatibility
            .and_then(|c| serde_json::from_str(&c).ok());

        Self {
            id: skill.id,
            name: skill.name,
            author: skill.author,
            description: skill.description,
            github_url: skill.github_url,
            version: skill.version,
            stars: skill.stars,
            forks: skill.forks,
            updated_at: skill.updated_at,
            tags,
            security_score: skill.security_score,
            compatibility,
            repository_id: skill.repository_id,
            repository_name,
            source_type,
            priority,
            skill_path: skill.skill_path,
            discovered_at: skill.discovered_at,
            synced_at: skill.synced_at,
        }
    }
}

// Legacy conversion (backwards compatible)
impl From<MarketplaceSkill> for MarketplaceSkillDTO {
    fn from(skill: MarketplaceSkill) -> Self {
        let tags: Vec<String> = skill.tags
            .as_ref()
            .and_then(|t| serde_json::from_str(t).ok())
            .unwrap_or_default();

        let compatibility: Option<serde_json::Value> = skill.compatibility
            .as_ref()
            .and_then(|c| serde_json::from_str(c).ok());

        Self {
            id: skill.id,
            name: skill.name,
            author: skill.author,
            description: skill.description,
            github_url: skill.github_url,
            version: skill.version,
            stars: skill.stars,
            forks: skill.forks,
            updated_at: skill.updated_at,
            tags,
            security_score: skill.security_score,
            compatibility,
            repository_id: skill.repository_id,
            repository_name: String::new(), // Empty for legacy
            source_type: String::new(),     // Empty for legacy
            priority: 100,
            skill_path: skill.skill_path,
            discovered_at: skill.discovered_at,
            synced_at: skill.synced_at,
        }
    }
}
