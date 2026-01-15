use anyhow::{Result, Context};
use uuid::Uuid;
use chrono::Utc;
use std::sync::Arc;

use crate::models::whitelist::{WhitelistEntry, WhitelistType};
use crate::services::db::{self, DbPool};

pub struct WhitelistService {
    pool: Arc<DbPool>,
}

impl WhitelistService {
    pub fn new() -> Result<Self> {
        let pool = db::DB_POOL
            .get()
            .ok_or_else(|| anyhow::anyhow!("Database pool not initialized"))?;
        Ok(Self { pool: Arc::new(pool.clone()) })
    }

    /// Add a skill to the whitelist
    pub fn add_skill(&self, skill_id: String, reason: Option<String>) -> Result<WhitelistEntry> {
        self.add_entry(WhitelistType::Skill, skill_id, reason)
    }

    /// Add a rule to the whitelist
    pub fn add_rule(&self, rule_id: String, reason: Option<String>) -> Result<WhitelistEntry> {
        self.add_entry(WhitelistType::Rule, rule_id, reason)
    }

    /// Generic add entry method
    fn add_entry(&self, entry_type: WhitelistType, target: String, reason: Option<String>) -> Result<WhitelistEntry> {
        let conn = self.pool.get()?;
        
        let id = Uuid::new_v4().to_string();
        let added_at = Utc::now().to_rfc3339();
        
        let entry = WhitelistEntry {
            id: id.clone(),
            entry_type: entry_type.clone(),
            target: target.clone(),
            reason: reason.clone(),
            added_at: added_at.clone(),
        };

        conn.execute(
            "INSERT INTO whitelist (id, entry_type, target, reason, added_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(entry_type, target) DO UPDATE SET 
                reason = excluded.reason,
                added_at = excluded.added_at",
            (
                &entry.id,
                &entry.entry_type.to_string(),
                &entry.target,
                &entry.reason,
                &entry.added_at,
            ),
        ).context("Failed to insert whitelist entry")?;

        Ok(entry)
    }

    /// Remove an entry from whitelist
    pub fn remove_entry(&self, entry_type: WhitelistType, target: &str) -> Result<bool> {
        let conn = self.pool.get()?;
        let count = conn.execute(
            "DELETE FROM whitelist WHERE entry_type = ?1 AND target = ?2",
            (&entry_type.to_string(), target),
        )?;
        Ok(count > 0)
    }

    /// Check if a skill is whitelisted
    pub fn is_skill_whitelisted(&self, skill_id: &str) -> Result<bool> {
        self.is_whitelisted(WhitelistType::Skill, skill_id)
    }

    /// Check if a rule is whitelisted (globally)
    #[allow(dead_code)]
    pub fn is_rule_whitelisted(&self, rule_id: &str) -> Result<bool> {
        self.is_whitelisted(WhitelistType::Rule, rule_id)
    }

    /// Generic check method
    fn is_whitelisted(&self, entry_type: WhitelistType, target: &str) -> Result<bool> {
        let conn = self.pool.get()?;
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM whitelist WHERE entry_type = ?1 AND target = ?2)",
            (&entry_type.to_string(), target),
            |row| row.get(0),
        ).unwrap_or(false);
        Ok(exists)
    }

    /// Get all whitelist entries
    pub fn get_all_entries(&self) -> Result<Vec<WhitelistEntry>> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id, entry_type, target, reason, added_at FROM whitelist ORDER BY added_at DESC",
        )?;
        
        let rows = stmt.query_map([], |row| {
            let type_str: String = row.get(1)?;
            Ok(WhitelistEntry {
                id: row.get(0)?,
                entry_type: WhitelistType::from(type_str),
                target: row.get(2)?,
                reason: row.get(3)?,
                added_at: row.get(4)?,
            })
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }
        
        Ok(entries)
    }

    /// Get all whitelisted rule IDs
    pub fn get_whitelisted_rules(&self) -> Result<Vec<String>> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT target FROM whitelist WHERE entry_type = 'rule'",
        )?;
        
        let rows = stmt.query_map([], |row| row.get(0))?;
        
        let mut rules = Vec::new();
        for row in rows {
            rules.push(row?);
        }
        Ok(rules)
    }
}
