use crate::services::db::get_connection;
use crate::models::collection::{
    AddItemRequest, Collection, CollectionItem, CreateCollectionRequest, RemoveItemRequest,
    ReorderItemsRequest, UpdateCollectionRequest,
};
use anyhow::Result;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

pub struct CollectionService;

impl CollectionService {
    fn now_millis() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }

    /// 创建新合集
    pub fn create_collection(request: CreateCollectionRequest) -> Result<Collection> {
        let conn = get_connection()?;
        let id = Uuid::new_v4().to_string();
        let now = Self::now_millis();

        conn.execute(
            "INSERT INTO collections (id, name, description, author, icon, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                request.name,
                request.description,
                request.author,
                request.icon,
                request.color,
                now,
                now
            ],
        )?;

        Ok(Collection {
            id,
            name: request.name,
            description: request.description,
            author: request.author,
            icon: request.icon,
            color: request.color,
            is_public: false,
            created_at: now,
            updated_at: now,
            items_count: 0,
        })
    }

    /// 获取所有合集
    pub fn get_collections() -> Result<Vec<Collection>> {
        let conn = get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT c.id, c.name, c.description, c.author, c.icon, c.color, c.is_public, c.created_at, c.updated_at,
             (SELECT COUNT(*) FROM collection_items WHERE collection_id = c.id) as items_count
             FROM collections c
             ORDER BY c.updated_at DESC",
        )?;

        let collections = stmt
            .query_map([], |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    author: row.get(3)?,
                    icon: row.get(4)?,
                    color: row.get(5)?,
                    is_public: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    items_count: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(collections)
    }

    /// 获取单个合集详情
    pub fn get_collection(id: &str) -> Result<Option<Collection>> {
        let conn = get_connection()?;

        let collection = conn.query_row(
            "SELECT c.id, c.name, c.description, c.author, c.icon, c.color, c.is_public, c.created_at, c.updated_at,
             (SELECT COUNT(*) FROM collection_items WHERE collection_id = c.id) as items_count
             FROM collections c
             WHERE c.id = ?1",
            params![id],
            |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    author: row.get(3)?,
                    icon: row.get(4)?,
                    color: row.get(5)?,
                    is_public: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    items_count: row.get(9)?,
                })
            },
        ).optional()?;

        Ok(collection)
    }

    /// 获取合集的所有条目
    pub fn get_collection_items(collection_id: &str) -> Result<Vec<CollectionItem>> {
        let conn = get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, skill_id, skill_name, skill_path, skill_identifier, added_at, note, sort_order
             FROM collection_items
             WHERE collection_id = ?1
             ORDER BY sort_order ASC, added_at DESC",
        )?;

        let items = stmt
            .query_map(params![collection_id], |row| {
                Ok(CollectionItem {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    skill_id: row.get(2)?,
                    skill_name: row.get(3)?,
                    skill_path: row.get(4)?,
                    skill_identifier: row.get(5)?,
                    added_at: row.get(6)?,
                    note: row.get(7)?,
                    sort_order: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    /// 更新合集
    pub fn update_collection(request: UpdateCollectionRequest) -> Result<()> {
        let conn = get_connection()?;

        // 构建动态更新 SQL
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        updates.push("updated_at = ?");
        params.push(Box::new(Self::now_millis()));

        if let Some(name) = &request.name {
            updates.push("name = ?");
            params.push(Box::new(name));
        }
        if let Some(description) = &request.description {
            updates.push("description = ?");
            params.push(Box::new(description));
        }
        if let Some(icon) = &request.icon {
            updates.push("icon = ?");
            params.push(Box::new(icon));
        }
        if let Some(color) = &request.color {
            updates.push("color = ?");
            params.push(Box::new(color));
        }
        if let Some(is_public) = request.is_public {
            updates.push("is_public = ?");
            params.push(Box::new(is_public));
        }

        // Add ID as the last parameter
        params.push(Box::new(request.id.clone()));

        let query = format!(
            "UPDATE collections SET {} WHERE id = ?",
            updates.join(", ")
        );

        // Convert params to slice of references for execute
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, &params_refs[..])?;

        Ok(())
    }

    /// 删除合集
    pub fn delete_collection(id: &str) -> Result<()> {
        let conn = get_connection()?;
        // 由于设置了 ON DELETE CASCADE，collection_items 会自动删除
        conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// 添加条目
    pub fn add_item(request: AddItemRequest) -> Result<()> {
        let conn = get_connection()?;

        // 检查是否已存在
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM collection_items WHERE collection_id = ?1 AND skill_id = ?2)",
            params![request.collection_id, request.skill_id],
            |row| row.get(0),
        )?;

        if exists {
            anyhow::bail!("Skill already exists in this collection");
        }

        // 获取最大排序值
        let max_order: i32 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM collection_items WHERE collection_id = ?1",
            params![request.collection_id],
            |row| row.get(0),
        ).unwrap_or(0);

        conn.execute(
            "INSERT INTO collection_items (collection_id, skill_id, skill_name, skill_path, skill_identifier, added_at, note, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                request.collection_id,
                request.skill_id,
                request.skill_name,
                request.skill_path,
                request.skill_identifier,
                Self::now_millis(),
                request.note,
                max_order + 1
            ],
        )?;

        // 更新合集修改时间
        Self::touch_collection(&request.collection_id)?;

        Ok(())
    }

    /// 移除条目
    pub fn remove_item(request: RemoveItemRequest) -> Result<()> {
        let conn = get_connection()?;
        conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ?1 AND skill_id = ?2",
            params![request.collection_id, request.skill_id],
        )?;

        // 更新合集修改时间
        Self::touch_collection(&request.collection_id)?;

        Ok(())
    }

    /// 重新排序条目
    pub fn reorder_items(request: ReorderItemsRequest) -> Result<()> {
        let conn = get_connection()?;
        let mut stmt = conn.prepare("UPDATE collection_items SET sort_order = ?1 WHERE collection_id = ?2 AND id = ?3")?;

        for (index, item_id) in request.item_ids.iter().enumerate() {
            stmt.execute(params![index as i32, request.collection_id, item_id])?;
        }

        // 更新合集修改时间
        Self::touch_collection(&request.collection_id)?;

        Ok(())
    }

    /// 更新合集时间戳
    fn touch_collection(id: &str) -> Result<()> {
        let conn = get_connection()?;
        conn.execute(
            "UPDATE collections SET updated_at = ?1 WHERE id = ?2",
            params![Self::now_millis(), id],
        )?;
        Ok(())
    }
}
