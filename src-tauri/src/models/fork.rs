use serde::{Deserialize, Serialize};

/// 派生类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ForkType {
    /// Fork：完整复制，用于修复、定制、扩展
    Fork,
    /// Remix：混合创作，用于组合、创新
    Remix,
}

impl ForkType {
    pub fn as_str(&self) -> &str {
        match self {
            ForkType::Fork => "fork",
            ForkType::Remix => "remix",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "fork" => Ok(ForkType::Fork),
            "remix" => Ok(ForkType::Remix),
            _ => Err(format!("Invalid fork type: {}", s)),
        }
    }
}

/// Skill 派生关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFork {
    pub id: i64,
    pub child_skill_id: String,
    pub child_skill_name: String,
    pub child_skill_path: String,
    pub parent_skill_id: String,
    pub parent_skill_name: String,
    pub parent_skill_path: Option<String>,
    pub fork_type: ForkType,
    pub fork_reason: Option<String>,
    pub author: Option<String>,
    pub created_at: i64,
}

/// 派生请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForkRequest {
    pub parent_skill_id: String,
    pub parent_skill_name: String,
    pub parent_skill_path: String,
    pub new_skill_name: String,
    pub fork_type: ForkType,
    pub fork_reason: Option<String>,
    pub target_location: String, // "system" or project path
}

/// 谱系节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageNode {
    pub skill_id: String,
    pub skill_name: String,
    pub skill_path: Option<String>,
    pub author: Option<String>,
    pub fork_type: Option<ForkType>,
    pub created_at: Option<i64>,
    pub depth: i32,
    pub children: Vec<LineageNode>,
}

/// 谱系深度信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageDepth {
    pub skill_id: String,
    pub depth: i32,
    pub root_skill_id: Option<String>,
    pub updated_at: i64,
}

/// 派生统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForkStats {
    pub parent_skill_id: String,
    pub parent_skill_name: String,
    pub fork_count: i32,
    pub fork_count_only: i32,
    pub remix_count: i32,
    pub last_forked_at: Option<i64>,
}

/// 派生信息（用于前端显示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForkInfo {
    /// 是否为派生 Skill
    pub is_fork: bool,
    /// 父 Skill 信息
    pub parent: Option<ParentSkillInfo>,
    /// 派生类型
    pub fork_type: Option<ForkType>,
    /// 派生原因
    pub fork_reason: Option<String>,
    /// 当前 Skill 被派生次数
    pub fork_count: i32,
    /// 谱系深度
    pub depth: i32,
}

/// 父 Skill 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentSkillInfo {
    pub skill_id: String,
    pub skill_name: String,
    pub skill_path: Option<String>,
    pub author: Option<String>,
}

impl SkillFork {
    pub fn new(
        child_skill_id: String,
        child_skill_name: String,
        child_skill_path: String,
        parent_skill_id: String,
        parent_skill_name: String,
        parent_skill_path: Option<String>,
        fork_type: ForkType,
        fork_reason: Option<String>,
        author: Option<String>,
    ) -> Self {
        Self {
            id: 0, // Will be set by database
            child_skill_id,
            child_skill_name,
            child_skill_path,
            parent_skill_id,
            parent_skill_name,
            parent_skill_path,
            fork_type,
            fork_reason,
            author,
            created_at: chrono::Utc::now().timestamp_millis(),
        }
    }
}
