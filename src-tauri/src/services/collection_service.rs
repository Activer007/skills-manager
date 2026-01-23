use crate::models::collection::{
    AddItemRequest, Collection, CollectionItem, CreateCollectionRequest, RemoveItemRequest,
    UpdateCollectionRequest,
};
use crate::services::db::get_connection;
use anyhow::Result;
use rusqlite::{params, OptionalExtension};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct CollectionService;

impl CollectionService {
    fn now_millis() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }

    pub fn create_collection(request: CreateCollectionRequest) -> Result<Collection> {
        let conn = get_connection()?;
        let id = Uuid::new_v4().to_string();
        let now = Self::now_millis();

        conn.execute(
            "INSERT INTO collections (id, name, description, icon, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![
                id,
                request.name,
                request.description,
                request.icon,
                request.color,
                now
            ],
        )?;

        Ok(Collection {
            id,
            name: request.name,
            description: request.description,
            icon: request.icon,
            color: request.color,
            created_at: now,
            updated_at: now,
            items: Some(vec![]),
            items_count: Some(0),
        })
    }

    pub fn get_collections() -> Result<Vec<Collection>> {
        let conn = get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT
                c.id, c.name, c.description, c.icon, c.color, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM collection_items WHERE collection_id = c.id) as items_count
             FROM collections c
             ORDER BY c.updated_at DESC",
        )?;

        let collections_iter = stmt.query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                items: None, // Don't load items for list view
                items_count: Some(row.get(7)?),
            })
        })?;

        let mut collections = Vec::new();
        for collection in collections_iter {
            collections.push(collection?);
        }

        Ok(collections)
    }

    pub fn get_collection(id: &str) -> Result<Option<Collection>> {
        let conn = get_connection()?;

        // Get collection details
        let collection: Option<Collection> = conn.query_row(
            "SELECT id, name, description, icon, color, created_at, updated_at
             FROM collections WHERE id = ?1",
            params![id],
            |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    icon: row.get(3)?,
                    color: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    items: Some(vec![]), // Initialize with empty vector
                    items_count: Some(0), // Will be updated
                })
            },
        ).optional()?;

        if let Some(mut col) = collection {
            // Get items
            let mut stmt = conn.prepare(
                "SELECT collection_id, skill_identifier, added_at, note
                 FROM collection_items
                 WHERE collection_id = ?1
                 ORDER BY added_at DESC",
            )?;

            let items_iter = stmt.query_map(params![id], |row| {
                Ok(CollectionItem {
                    collection_id: row.get(0)?,
                    skill_identifier: row.get(1)?,
                    added_at: row.get(2)?,
                    note: row.get(3)?,
                })
            })?;

            let mut items = Vec::new();
            for item in items_iter {
                items.push(item?);
            }

            col.items_count = Some(items.len());
            col.items = Some(items);

            return Ok(Some(col));
        }

        Ok(None)
    }

    pub fn update_collection(request: UpdateCollectionRequest) -> Result<()> {
        let conn = get_connection()?;
        let now = Self::now_millis();

        // Build dynamic update query
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        updates.push("updated_at = ?");
        params.push(Box::new(now));

        if let Some(name) = request.name {
            updates.push("name = ?");
            params.push(Box::new(name));
        }
        if let Some(description) = request.description {
            updates.push("description = ?");
            params.push(Box::new(description));
        }
        if let Some(icon) = request.icon {
            updates.push("icon = ?");
            params.push(Box::new(icon));
        }
        if let Some(color) = request.color {
            updates.push("color = ?");
            params.push(Box::new(color));
        }

        // Add ID as the last parameter
        params.push(Box::new(request.id));

        let query = format!(
            "UPDATE collections SET {} WHERE id = ?",
            updates.join(", ")
        );

        // Convert params to slice of references for execute
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, &params_refs[..])?;

        Ok(())
    }

    pub fn delete_collection(id: &str) -> Result<()> {
        let conn = get_connection()?;
        // Cascade delete is handled by database schema, but explicit deletion is safer
        conn.execute("DELETE FROM collection_items WHERE collection_id = ?1", params![id])?;
        conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn add_item(request: AddItemRequest) -> Result<()> {
        let conn = get_connection()?;
        let now = Self::now_millis();

        conn.execute(
            "INSERT OR REPLACE INTO collection_items (collection_id, skill_identifier, added_at, note)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                request.collection_id,
                request.skill_identifier,
                now,
                request.note
            ],
        )?;

        // Update collection updated_at
        conn.execute(
            "UPDATE collections SET updated_at = ?1 WHERE id = ?2",
            params![now, request.collection_id],
        )?;

        Ok(())
    }

    pub fn remove_item(request: RemoveItemRequest) -> Result<()> {
        let conn = get_connection()?;
        let now = Self::now_millis();

        conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ?1 AND skill_identifier = ?2",
            params![request.collection_id, request.skill_identifier],
        )?;

        // Update collection updated_at
        conn.execute(
            "UPDATE collections SET updated_at = ?1 WHERE id = ?2",
            params![now, request.collection_id],
        )?;

        Ok(())
    }
}
