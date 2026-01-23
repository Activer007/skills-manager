use serde::{Deserialize, Serialize};

/// Skill 合集
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_public: bool,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(default)]
    pub items_count: i32, // 计算字段
}

/// 合集条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionItem {
    pub id: i64,
    pub collection_id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub skill_path: Option<String>,
    pub skill_identifier: Option<String>,
    pub added_at: i64,
    pub note: Option<String>,
    pub sort_order: i32,
}

/// 创建合集请求
#[derive(Debug, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

/// 更新合集请求
#[derive(Debug, Deserialize)]
pub struct UpdateCollectionRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_public: Option<bool>,
}

/// 添加条目请求
#[derive(Debug, Deserialize)]
pub struct AddItemRequest {
    pub collection_id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub skill_path: Option<String>,
    pub skill_identifier: Option<String>,
    pub note: Option<String>,
}

/// 移除条目请求
#[derive(Debug, Deserialize)]
pub struct RemoveItemRequest {
    pub collection_id: String,
    pub skill_id: String,
}

/// 排序请求
#[derive(Debug, Deserialize)]
pub struct ReorderItemsRequest {
    pub collection_id: String,
    pub item_ids: Vec<i64>, // 按新顺序排列的 ID 列表
}
