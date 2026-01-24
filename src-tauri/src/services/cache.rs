#![allow(dead_code)]
use std::time::{Duration, Instant};
use std::path::Path;
use lru::LruCache;
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use anyhow::Result;

use crate::models::security::SecurityReport;
use crate::models::config::CacheConfig;
use crate::security::{SecurityScanner, ScanMode};
use crate::services::db;

/// 缓存的 Skill 数据（内部使用，不需要序列化）
#[derive(Debug, Clone)]
pub struct CachedSkill {
    /// 安全扫描报告
    pub report: SecurityReport,
    /// 文件内容的 SHA256 校验和
    pub checksum: String,
    /// 缓存创建时间
    pub cached_at: Instant,
    /// Skill 路径（用于验证）
    pub skill_path: String,
}

/// LRU 缓存统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    /// 缓存命中率
    pub hit_rate: f64,
    /// 缓存命中次数
    pub hits: usize,
    /// 缓存未命中次数
    pub misses: usize,
    /// 当前缓存项数量
    pub current_size: usize,
    /// 缓存容量
    pub capacity: usize,
    /// 数据库缓存项数量
    pub db_count: usize,
}

/// Skill 缓存管理器
pub struct SkillCache {
    /// LRU 缓存
    cache: LruCache<String, CachedSkill>,
    /// 缓存配置
    config: CacheConfig,
    /// 统计数据
    stats: CacheStatsInternal,
}

/// 内部统计数据
#[derive(Debug, Default)]
struct CacheStatsInternal {
    hits: usize,
    misses: usize,
}

impl SkillCache {
    /// 创建新的缓存实例
    pub fn new(config: CacheConfig) -> Self {
        use std::num::NonZeroUsize;
        let cap = NonZeroUsize::new(config.max_capacity).unwrap_or_else(|| NonZeroUsize::new(100).unwrap());

        Self {
            cache: LruCache::new(cap),
            config,
            stats: CacheStatsInternal::default(),
        }
    }

    /// 使用默认配置创建缓存
    pub fn with_default_config() -> Self {
        Self::new(CacheConfig::default())
    }

    /// 更新缓存配置
    pub fn update_config(&mut self, config: CacheConfig) {
        use std::num::NonZeroUsize;
        if config.max_capacity != self.config.max_capacity {
            let cap = NonZeroUsize::new(config.max_capacity).unwrap_or_else(|| NonZeroUsize::new(100).unwrap());
            self.cache.resize(cap);
        }
        self.config = config;
    }

    /// 获取缓存条目（仅内存查找，不验证校验和）
    pub fn get_entry(&mut self, skill_path: &str) -> Option<CachedSkill> {
        let ttl = Duration::from_secs(self.config.ttl_seconds);

        // 1. 检查内存缓存
        if let Some(cached) = self.cache.get(skill_path) {
            if cached.cached_at.elapsed() < ttl {
                self.stats.hits += 1;
                return Some(cached.clone());
            }
        }

        // 2. 检查数据库缓存（如果启用）
        if self.config.enable_db_sync {
            match db::get_cached_report_by_path(skill_path) {
                Ok(Some((report, checksum, cached_at_ts))) => {
                    let now = chrono::Utc::now().timestamp();
                    if (now - cached_at_ts) < self.config.ttl_seconds as i64 {
                        // 命中数据库缓存，提升到内存
                        self.stats.hits += 1;

                        let cached = CachedSkill {
                            report: report.clone(),
                            checksum: checksum.clone(),
                            cached_at: Instant::now(),
                            skill_path: skill_path.to_string(),
                        };
                        self.cache.put(skill_path.to_string(), cached.clone());

                        return Some(cached);
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    log::warn!("Database cache lookup failed: {}", e);
                }
            }
        }

        self.stats.misses += 1;
        None
    }

    /// 插入或更新缓存
    pub fn put(&mut self, skill_path: String, report: SecurityReport, checksum: String) {
        let cached = CachedSkill {
            report: report.clone(),
            checksum: checksum.clone(),
            cached_at: Instant::now(),
            skill_path: skill_path.clone(),
        };

        self.cache.put(skill_path.clone(), cached);

        // 同步到数据库
        if self.config.enable_db_sync {
            let skill_id = report.skill_id.clone();
            if let Err(e) = db::save_cached_report(&skill_id, &skill_path, &report, &checksum) {
                log::warn!("Failed to save cache to database: {}", e);
            }
        }
    }

    /// 清理过期缓存
    pub fn prune(&mut self) {
        // 内存缓存由 LRU 自动管理容量
        // 我们只负责清理数据库过期记录
        if self.config.enable_db_sync {
            if let Err(e) = db::prune_expired_reports(self.config.ttl_seconds) {
                log::warn!("Failed to prune expired database cache: {}", e);
            }
        }
    }

    /// 清空缓存
    pub fn clear(&mut self) {
        self.cache.clear();
        self.stats.hits = 0;
        self.stats.misses = 0;

        if self.config.enable_db_sync {
            if let Err(e) = db::clear_all_cached_reports() {
                log::warn!("Failed to clear database cache: {}", e);
            }
        }
    }

    /// 获取缓存统计信息
    pub fn stats(&self) -> CacheStats {
        let total = self.stats.hits + self.stats.misses;
        let hit_rate = if total > 0 {
            (self.stats.hits as f64) / (total as f64)
        } else {
            0.0
        };

        let db_count = if self.config.enable_db_sync {
            db::get_cache_stats_db().unwrap_or(0)
        } else {
            0
        };

        CacheStats {
            hit_rate,
            hits: self.stats.hits,
            misses: self.stats.misses,
            current_size: self.cache.len(),
            capacity: self.cache.cap().get(),
            db_count,
        }
    }

    /// 使指定路径的缓存失效
    pub fn invalidate(&mut self, skill_path: &str) {
        self.cache.pop(skill_path);

        if self.config.enable_db_sync {
            if let Err(e) = db::delete_cached_report(skill_path) {
                log::warn!("Failed to invalidate database cache for {}: {}", skill_path, e);
            }
        }
    }

    /// 计算目录的校验和（基于文件路径和修改时间）
    pub fn calculate_directory_checksum(dir_path: &str) -> Result<String> {
        use walkdir::WalkDir;

        let path = Path::new(dir_path);
        if !path.exists() {
            return Err(anyhow::anyhow!("Directory not found"));
        }

        let mut hasher = Sha256::new();
        // 获取规范化的绝对路径
        let root_path = path.canonicalize()?;

        // 遍历目录（使用规范化路径）
        for entry in WalkDir::new(&root_path)
            .follow_links(false)
            .max_depth(10)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }

            // 获取文件元数据
            let metadata = entry.metadata().ok();
            if let Some(meta) = metadata {
                // 使用相对路径计算校验和，避免受绝对路径影响
                // 既然我们在遍历 root_path，entry.path() 也是基于 root_path 的
                let relative_path = entry.path().strip_prefix(&root_path)
                    .unwrap_or(entry.path())
                    .to_string_lossy();
                
                let modified = meta.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                hasher.update(relative_path.as_bytes());
                hasher.update(meta.len().to_be_bytes());
                hasher.update(modified.to_be_bytes());
            }
        }

        Ok(format!("{:x}", hasher.finalize()))
    }
}

/// 扫描 Skill 并缓存结果（线程安全，最小化锁占用）
pub fn scan_skill_with_caching(
    skill_path: &str, 
    locale: &str,
    mode: ScanMode,
    whitelisted_rules: &[String]
) -> Result<SecurityReport, String> {
    // 1. 无锁操作：计算当前文件的 Checksum
    let file_checksum = SkillCache::calculate_directory_checksum(skill_path)
        .map_err(|e| format!("Failed to calculate checksum: {}", e))?;

    // 计算包含配置的综合 Checksum，防止不同配置间的缓存混用
    let current_checksum = {
        let mut h = Sha256::new();
        h.update(file_checksum.as_bytes());
        h.update(format!("{:?}", mode).as_bytes());
        for rule in whitelisted_rules {
            h.update(rule.as_bytes());
        }
        format!("{:x}", h.finalize())
    };

    // 2. 短锁操作：检查缓存
    {
        let mut cache = GLOBAL_CACHE.lock().map_err(|e| e.to_string())?;
        if let Some(cached) = cache.get_entry(skill_path) {
            // 验证 Checksum (现在包含了 Config Hash)
            if cached.checksum == current_checksum {
                return Ok(cached.report);
            }
            // Checksum 不匹配，缓存失效，继续执行扫描
        }
    }

    // 3. 无锁操作：执行耗时的扫描
    let scanner = SecurityScanner::new();
    let skill_id = Path::new(skill_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let report = scanner
        .scan_directory(skill_path, skill_id, locale, mode, whitelisted_rules)
        .map_err(|e| e.to_string())?;

    // 4. 短锁操作：更新缓存
    {
        let mut cache = GLOBAL_CACHE.lock().map_err(|e| e.to_string())?;
        cache.put(skill_path.to_string(), report.clone(), current_checksum);
    }

    Ok(report)
}

impl Default for SkillCache {
    fn default() -> Self {
        Self::with_default_config()
    }
}

// 全局缓存实例（使用 once_cell 实现延迟初始化）
use once_cell::sync::Lazy;
use std::sync::Mutex;

/// 全局缓存实例
pub static GLOBAL_CACHE: Lazy<Mutex<SkillCache>> =
    Lazy::new(|| Mutex::new(SkillCache::with_default_config()));


#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;
    use std::thread;

    #[test]
    fn test_cache_creation() {
        let cache = SkillCache::with_default_config();
        let stats = cache.stats();
        assert_eq!(stats.capacity, 100);
        assert_eq!(stats.hit_rate, 0.0);
    }

    #[test]
    fn test_cache_put_and_get() {
        let mut cache = SkillCache::with_default_config();
        let dir = tempdir().unwrap();
        let dir_path = dir.path().to_str().unwrap().to_string();

        // 创建一个文件以生成校验和
        let file_path = dir.path().join("test.txt");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "content").unwrap();

        // 计算初始校验和
        let checksum = SkillCache::calculate_directory_checksum(&dir_path).unwrap();

        // 创建测试报告
        let report = SecurityReport {
            scan_id: "test-scan".to_string(),
            scanned_at: "now".to_string(),
            scan_duration_ms: 0,
            skill_id: "test".to_string(),
            score: 100,
            level: crate::models::security::SecurityLevel::Safe,
            issues: vec![],
            recommendations: vec![],
            blocked: false,
            hard_trigger_issues: vec![],
            scanned_files: vec![],
        };

        // 插入缓存
        cache.put(dir_path.clone(), report.clone(), checksum);

        // 获取缓存（路径存在且校验和匹配）
        let result = cache.get_entry(&dir_path);
        assert!(result.is_some(), "Should return cached report for valid directory");
        assert_eq!(result.unwrap().report.skill_id, "test");
        assert_eq!(cache.stats().hits, 1);
    }

    #[test]
    fn test_cache_miss() {
        let mut cache = SkillCache::with_default_config();

        let result = cache.get_entry("non_existent_path");
        assert!(result.is_none());
        assert_eq!(cache.stats().misses, 1);
    }

    #[test]
    fn test_cache_clear() {
        let mut cache = SkillCache::with_default_config();
        let dir = tempdir().unwrap();
        let dir_path = dir.path().to_str().unwrap().to_string();

        let report = SecurityReport {
            scan_id: "test-scan".to_string(),
            scanned_at: "now".to_string(),
            scan_duration_ms: 0,
            skill_id: "test".to_string(),
            score: 100,
            level: crate::models::security::SecurityLevel::Safe,
            issues: vec![],
            recommendations: vec![],
            blocked: false,
            hard_trigger_issues: vec![],
            scanned_files: vec![],
        };

        let checksum = SkillCache::calculate_directory_checksum(&dir_path).unwrap_or_default();
        cache.put(dir_path.clone(), report, checksum);
        
        // 确保已缓存
        assert!(cache.cache.contains(&dir_path));

        cache.clear();
        
        assert!(!cache.cache.contains(&dir_path), "Cache should be empty after clear");
        assert_eq!(cache.stats.hits, 0);
        assert_eq!(cache.stats.misses, 0);
    }

    #[test]
    fn test_cache_hit_rate() {
        let mut cache = SkillCache::with_default_config();
        let dir = tempdir().unwrap();
        let dir_path = dir.path().to_str().unwrap().to_string();
        let file_path = dir.path().join("data.txt");

        // 1. 初始化文件
        {
            let mut f = File::create(&file_path).unwrap();
            write!(f, "v1").unwrap();
        }
        
        let checksum_v1 = SkillCache::calculate_directory_checksum(&dir_path).unwrap();
        let report = SecurityReport {
            scan_id: "test-scan".to_string(),
            scanned_at: "now".to_string(),
            scan_duration_ms: 0,
            skill_id: "test".to_string(),
            score: 100,
            level: crate::models::security::SecurityLevel::Safe,
            issues: vec![],
            recommendations: vec![],
            blocked: false,
            hard_trigger_issues: vec![],
            scanned_files: vec![],
        };

        cache.put(dir_path.clone(), report, checksum_v1.clone());

        // 2. 第一次获取：命中
        assert!(cache.get_entry(&dir_path).is_some());

        // 3. 修改文件
        thread::sleep(std::time::Duration::from_millis(1100)); // 确保修改时间变化
        {
            let mut f = File::create(&file_path).unwrap();
            write!(f, "v2").unwrap();
        }

        // 4. 第二次获取：仍然命中（get_entry 不检查 checksum）
        let entry = cache.get_entry(&dir_path);
        assert!(entry.is_some());
        
        // 验证 Checksum 确实变了
        let checksum_v2 = SkillCache::calculate_directory_checksum(&dir_path).unwrap();
        assert_ne!(checksum_v1, checksum_v2);
        assert_ne!(entry.unwrap().checksum, checksum_v2);

        // 5. 第三次获取：未命中（路径不存在）
        assert!(cache.get_entry("non_existent").is_none());

        let stats = cache.stats();
        // 2 hits, 1 miss
        assert_eq!(stats.hits, 2);
        assert_eq!(stats.misses, 1);
    }

    #[test]
    fn test_cache_invalidate() {
        let mut cache = SkillCache::with_default_config();

        let report = SecurityReport {
            scan_id: "test-scan".to_string(),
            scanned_at: "now".to_string(),
            scan_duration_ms: 0,
            skill_id: "test".to_string(),
            score: 100,
            level: crate::models::security::SecurityLevel::Safe,
            issues: vec![],
            recommendations: vec![],
            blocked: false,
            hard_trigger_issues: vec![],
            scanned_files: vec![],
        };

        cache.put("test".to_string(), report, "checksum".to_string());
        assert_eq!(cache.cache.len(), 1);

        cache.invalidate("test");
        assert_eq!(cache.cache.len(), 0);
    }
}
