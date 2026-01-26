use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkill {
    pub id: String,
    pub name: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub github_url: Option<String>,
    pub stars: i64,
    pub forks: i64,
    pub updated_at: i64,
    pub tags: Option<String>, // JSON serialized array
    pub security_score: Option<i32>,
    pub compatibility: Option<String>, // JSON serialized object
    pub data: Option<String>, // Full JSON blob
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkillDTO {
    pub id: String,
    pub name: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub github_url: Option<String>,
    pub stars: i64,
    pub forks: i64,
    pub updated_at: i64,
    pub tags: Vec<String>,
    pub security_score: Option<i32>,
    pub compatibility: Option<serde_json::Value>,
}

impl From<MarketplaceSkill> for MarketplaceSkillDTO {
    fn from(skill: MarketplaceSkill) -> Self {
        let tags: Vec<String> = skill.tags
            .as_ref()
            .and_then(|t| serde_json::from_str(t).ok())
            .unwrap_or_default();

        let compatibility: Option<serde_json::Value> = skill.compatibility
            .as_ref()
            .and_then(|c| serde_json::from_str(c).ok());

        MarketplaceSkillDTO {
            id: skill.id,
            name: skill.name,
            author: skill.author,
            description: skill.description,
            github_url: skill.github_url,
            stars: skill.stars,
            forks: skill.forks,
            updated_at: skill.updated_at,
            tags,
            security_score: skill.security_score,
            compatibility,
        }
    }
}
