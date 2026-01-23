use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items: Option<Vec<CollectionItem>>,
    #[serde(rename = "itemsCount", skip_deserializing)]
    pub items_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionItem {
    #[serde(rename = "collectionId")]
    pub collection_id: String,
    #[serde(rename = "skillIdentifier")]
    pub skill_identifier: String, // Can be skill ID or path
    #[serde(rename = "addedAt")]
    pub added_at: i64,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCollectionRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddItemRequest {
    #[serde(rename = "collectionId")]
    pub collection_id: String,
    #[serde(rename = "skillIdentifier")]
    pub skill_identifier: String,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RemoveItemRequest {
    #[serde(rename = "collectionId")]
    pub collection_id: String,
    #[serde(rename = "skillIdentifier")]
    pub skill_identifier: String,
}
