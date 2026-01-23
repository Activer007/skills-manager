use serde::{Deserialize, Serialize};

/// 创作者信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Creator {
    pub id: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub github_url: Option<String>,
    pub website_url: Option<String>,
    pub skill_count: i32,
    pub verified: bool,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(default)]
    pub is_followed: bool, // 虚拟字段，用于前端显示
}

/// 创建/更新创作者请求
#[derive(Debug, Deserialize)]
pub struct UpdateCreatorRequest {
    pub id: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub github_url: Option<String>,
    pub website_url: Option<String>,
}
