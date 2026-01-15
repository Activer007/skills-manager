use serde::{Deserialize, Serialize};

/// 白名单条目类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WhitelistType {
    Skill,
    Rule,
}

impl AsRef<str> for WhitelistType {
    fn as_ref(&self) -> &str {
        match self {
            Self::Skill => "skill",
            Self::Rule => "rule",
        }
    }
}

impl std::fmt::Display for WhitelistType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

impl From<String> for WhitelistType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "skill" => Self::Skill,
            "rule" => Self::Rule,
            _ => Self::Skill, // Default fallback
        }
    }
}

/// 白名单条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhitelistEntry {
    pub id: String,
    pub entry_type: WhitelistType,
    pub target: String,
    pub reason: Option<String>,
    pub added_at: String,
}
