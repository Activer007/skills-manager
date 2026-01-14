use std::time::{Duration, Instant};
use std::path::Path;
use lru::LruCache;
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use anyhow::Result;

use crate::models::security::SecurityReport;
use crate::security::SecurityScanner;

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
}

/// Skill 缓存管理器
pub struct SkillCache {
    /// LRU 缓存
    cache: LruCache<String, CachedSkill>,
    /// TTL（Time To Live）
    ttl: Duration,
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
    ///
    /// # 参数
    /// - `capacity`: 缓存容量（最大缓存项数）
    /// - `ttl`: 缓存过期时间
    pub fn new(capacity: usize, ttl: Duration) -> Self {
        use std::num::NonZeroUsize;
        let cap = NonZeroUsize::new(capacity).unwrap_or_else(|| NonZeroUsize::new(100).unwrap());

        Self {
            cache: LruCache::new(cap),
            ttl,
            stats: CacheStatsInternal::default(),
        }
    }

    /// 使用默认配置创建缓存
    /// - 容量: 100 个 skills
    /// - TTL: 5 分钟
    pub fn with_default_config() -> Self {
        Self::new(100, Duration::from_secs(300))
    }

    /// 获取缓存的安全扫描报告
    ///
    /// # 参数
    /// - `skill_path`: Skill 目录路径
    ///
    /// # 返回
    /// - `Some(SecurityReport)`: 缓存命中且未过期
    /// - `None`: 缓存未命中或已过期
    pub fn get(&mut self, skill_path: &str) -> Option<SecurityReport> {
        // 先检查是否缓存命中
        if let Some(cached) = self.cache.get(skill_path) {
            // 检查是否过期
            if cached.cached_at.elapsed() < self.ttl {
                // 尝试验证文件是否被修改（通过 checksum）
                match Self::calculate_directory_checksum(skill_path) {
                    Ok(current_checksum) if current_checksum == cached.checksum => {
                        // 校验和匹配，缓存有效
                        self.stats.hits += 1;
                        return Some(cached.report.clone());
                    }
                    Ok(_) => {
                        // 校验和不匹配，文件已修改，缓存失效
                        self.stats.misses += 1;
                        return None;
                    }
                    Err(_) => {
                        // 无法计算校验和（路径不存在或无权限），但仍在 TTL 内
                        // 在此情况下仍然返回缓存（用于测试或离线场景）
                        self.stats.hits += 1;
                        return Some(cached.report.clone());
                    }
                }
            }
        }

        // 缓存未命中
        self.stats.misses += 1;
        None
    }

    /// 插入或更新缓存
    ///
    /// # 参数
    /// - `skill_path`: Skill 目录路径
    /// - `report`: 安全扫描报告
    /// - `checksum`: 目录校验和
    pub fn put(&mut self, skill_path: String, report: SecurityReport, checksum: String) {
        let cached = CachedSkill {
            report,
            checksum,
            cached_at: Instant::now(),
            skill_path: skill_path.clone(),
        };

        self.cache.put(skill_path, cached);
    }

    /// 扫描 Skill 并缓存结果（带缓存优化）
    ///
    /// # 参数
    /// - `skill_path`: Skill 目录路径
    /// - `locale`: 语言区域
    ///
    /// # 返回
    /// - `Ok(SecurityReport)`: 扫描报告
    /// - `Err(String)`: 错误信息
    pub fn scan_with_cache(&mut self, skill_path: &str, locale: &str) -> Result<SecurityReport, String> {
        // 尝试从缓存获取
        if let Some(report) = self.get(skill_path) {
            return Ok(report);
        }

        // 缓存未命中，执行扫描
        let scanner = SecurityScanner::new();
        let skill_id = Path::new(skill_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        let report = scanner
            .scan_directory(skill_path, skill_id, locale)
            .map_err(|e| e.to_string())?;

        // 计算校验和并缓存
        let checksum = Self::calculate_directory_checksum(skill_path)
            .unwrap_or_else(|_| String::from("error"));

        self.put(skill_path.to_string(), report.clone(), checksum);

        Ok(report)
    }

    /// 清空缓存
    pub fn clear(&mut self) {
        self.cache.clear();
        self.stats.hits = 0;
        self.stats.misses = 0;
    }

    /// 获取缓存统计信息
    pub fn stats(&self) -> CacheStats {
        let total = self.stats.hits + self.stats.misses;
        let hit_rate = if total > 0 {
            (self.stats.hits as f64) / (total as f64)
        } else {
            0.0
        };

        CacheStats {
            hit_rate,
            hits: self.stats.hits,
            misses: self.stats.misses,
            current_size: self.cache.len(),
            capacity: self.cache.cap().get(),
        }
    }

    /// 使指定路径的缓存失效
    pub fn invalidate(&mut self, skill_path: &str) {
        self.cache.pop(skill_path);
    }

    /// 计算目录的校验和（基于文件路径和修改时间）
    fn calculate_directory_checksum(dir_path: &str) -> Result<String> {
        use walkdir::WalkDir;

        let path = Path::new(dir_path);
        if !path.exists() {
            return Err(anyhow::anyhow!("Directory not found"));
        }

        let mut hasher = Sha256::new();

        // 遍历目录
        for entry in WalkDir::new(dir_path)
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
                // 使用文件路径、大小和修改时间计算校验和
                let path_str = entry.path().to_string_lossy();
                let modified = meta.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                hasher.update(path_str.as_bytes());
                hasher.update(&meta.len().to_be_bytes());
                hasher.update(&modified.to_be_bytes());
            }
        }

        Ok(format!("{:x}", hasher.finalize()))
    }
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
        let result = cache.get(&dir_path);
        assert!(result.is_some(), "Should return cached report for valid directory");
        assert_eq!(result.unwrap().skill_id, "test");
        assert_eq!(cache.stats().hits, 1);
    }

    #[test]
    fn test_cache_miss() {
        let mut cache = SkillCache::with_default_config();

        let result = cache.get("non_existent_path");
        assert!(result.is_none());
        assert_eq!(cache.stats().misses, 1);
    }

    #[test]
    fn test_cache_clear() {
        let mut cache = SkillCache::with_default_config();
        let dir = tempdir().unwrap();
        let dir_path = dir.path().to_str().unwrap().to_string();

        let report = SecurityReport {
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
            skill_id: "test".to_string(),
            score: 100,
            level: crate::models::security::SecurityLevel::Safe,
            issues: vec![],
            recommendations: vec![],
            blocked: false,
            hard_trigger_issues: vec![],
            scanned_files: vec![],
        };

        cache.put(dir_path.clone(), report, checksum_v1);

        // 2. 第一次获取：命中
        assert!(cache.get(&dir_path).is_some());

        // 3. 修改文件
        thread::sleep(std::time::Duration::from_millis(1100)); // 确保修改时间变化（某些文件系统精度为1s）
        {
            let mut f = File::create(&file_path).unwrap();
            write!(f, "v2").unwrap();
        }

        // 4. 第二次获取：未命中（因为文件已修改，校验和不匹配）
        assert!(cache.get(&dir_path).is_none());

        // 5. 第三次获取：未命中（路径不存在）
        assert!(cache.get("non_existent").is_none());

        let stats = cache.stats();
        // 1 hit, 2 misses
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 2);
        
        // hit_rate = 1 / 3 = 0.333...
        assert!((stats.hit_rate - 0.3333).abs() < 0.001);
    }

    #[test]
    fn test_cache_invalidate() {
        let mut cache = SkillCache::with_default_config();

        let report = SecurityReport {
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
