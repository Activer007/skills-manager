use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use anyhow::{Context, Result};

/// 安全规则配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// 启用的规则 ID 集合（空集合表示启用所有规则）
    #[serde(default)]
    pub enabled_rules: HashSet<String>,

    /// 白名单：这些文件/模式不扫描
    #[serde(default)]
    pub whitelist: HashSet<String>,

    /// 黑名单：这些文件/模式强制扫描
    #[serde(default)]
    pub blacklist: HashSet<String>,

    /// 是否启用硬触发阻止
    #[serde(default = "default_block_on_hard_trigger")]
    pub block_on_hard_trigger: bool,
}

fn default_block_on_hard_trigger() -> bool {
    true
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            enabled_rules: HashSet::new(), // 空集合 = 启用所有规则
            whitelist: HashSet::new(),
            blacklist: HashSet::new(),
            block_on_hard_trigger: true,
        }
    }
}

#[allow(dead_code)]
impl SecurityConfig {
    /// 获取配置文件路径
    pub fn config_path() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .context("无法获取用户主目录")?;

        Ok(home_dir.join(".skill-manager").join("security-config.json"))
    }

    /// 从默认路径加载配置
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        if !config_path.exists() {
            // 配置文件不存在，返回默认配置并保存
            let default_config = Self::default();
            default_config.save()?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(&config_path)
            .with_context(|| format!("无法读取配置文件: {:?}", config_path))?;

        serde_json::from_str(&content)
            .with_context(|| format!("无法解析配置文件: {:?}", config_path))
    }

    /// 保存配置到默认路径
    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;

        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("无法创建配置目录: {:?}", parent))?;
        }

        let content = serde_json::to_string_pretty(self)
            .context("无法序列化配置")?;

        fs::write(&config_path, content)
            .with_context(|| format!("无法写入配置文件: {:?}", config_path))?;

        Ok(())
    }

    /// 检查规则是否启用
    pub fn is_rule_enabled(&self, rule_id: &str) -> bool {
        // 空集合表示启用所有规则
        if self.enabled_rules.is_empty() {
            return true;
        }

        self.enabled_rules.contains(rule_id)
    }

    /// 检查文件是否在白名单中（跳过扫描）
    pub fn is_whitelisted(&self, file_path: &str) -> bool {
        self.whitelist.iter().any(|pattern| {
            self.matches_pattern(file_path, pattern)
        })
    }

    /// 检查文件是否在黑名单中（强制扫描）
    pub fn is_blacklisted(&self, file_path: &str) -> bool {
        self.blacklist.iter().any(|pattern| {
            self.matches_pattern(file_path, pattern)
        })
    }

    /// 简单的通配符匹配
    fn matches_pattern(&self, text: &str, pattern: &str) -> bool {
        // 简单实现：包含匹配
        if pattern.contains('*') {
            // 将通配符转换为正则
            let regex_pattern = pattern
                .replace('.', r"\.")
                .replace('*', ".*");
            if let Ok(re) = regex::Regex::new(&regex_pattern) {
                return re.is_match(text);
            }
        }

        // 精确匹配或包含匹配
        text == pattern || text.contains(pattern)
    }

    /// 启用规则
    pub fn enable_rule(&mut self, rule_id: String) {
        self.enabled_rules.insert(rule_id);
    }

    /// 禁用规则
    pub fn disable_rule(&mut self, rule_id: &str) {
        self.enabled_rules.remove(rule_id);
    }

    /// 添加白名单
    pub fn add_whitelist(&mut self, pattern: String) {
        self.whitelist.insert(pattern);
    }

    /// 移除白名单
    pub fn remove_whitelist(&mut self, pattern: &str) {
        self.whitelist.remove(pattern);
    }

    /// 添加黑名单
    pub fn add_blacklist(&mut self, pattern: String) {
        self.blacklist.insert(pattern);
    }

    /// 移除黑名单
    pub fn remove_blacklist(&mut self, pattern: &str) {
        self.blacklist.remove(pattern);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = SecurityConfig::default();
        assert!(config.enabled_rules.is_empty()); // 空集合 = 启用所有
        assert!(config.whitelist.is_empty());
        assert!(config.blacklist.is_empty());
        assert!(config.block_on_hard_trigger);
    }

    #[test]
    fn test_is_rule_enabled() {
        let mut config = SecurityConfig::default();

        // 空集合 = 所有规则启用
        assert!(config.is_rule_enabled("TEST_RULE"));

        // 添加特定规则
        config.enable_rule("RULE_A".to_string());
        assert!(!config.is_rule_enabled("TEST_RULE")); // 未在列表中 = 禁用
        assert!(config.is_rule_enabled("RULE_A"));    // 在列表中 = 启用
    }

    #[test]
    fn test_whitelist() {
        let mut config = SecurityConfig::default();

        config.add_whitelist("*.md".to_string());
        config.add_whitelist("test.js".to_string());

        assert!(config.is_whitelisted("test.js"));
        assert!(config.is_whitelisted("README.md"));
        assert!(!config.is_whitelisted("code.ts"));

        config.remove_whitelist("*.md");
        assert!(!config.is_whitelisted("README.md"));
    }

    #[test]
    fn test_blacklist() {
        let mut config = SecurityConfig::default();

        config.add_blacklist("*.sh".to_string());
        config.add_blacklist("dangerous.py".to_string());

        assert!(config.is_blacklisted("script.sh"));
        assert!(config.is_blacklisted("dangerous.py"));
        assert!(!config.is_blacklisted("safe.ts"));

        config.remove_blacklist("dangerous.py");
        assert!(!config.is_blacklisted("dangerous.py"));
    }

    #[test]
    fn test_enable_disable_rules() {
        let mut config = SecurityConfig::default();

        config.enable_rule("RULE_A".to_string());
        config.enable_rule("RULE_B".to_string());

        assert_eq!(config.enabled_rules.len(), 2);
        assert!(config.enabled_rules.contains("RULE_A"));
        assert!(config.enabled_rules.contains("RULE_B"));

        config.disable_rule("RULE_A");
        assert_eq!(config.enabled_rules.len(), 1);
        assert!(!config.enabled_rules.contains("RULE_A"));
        assert!(config.enabled_rules.contains("RULE_B"));
    }

    #[test]
    fn test_matches_pattern() {
        let config = SecurityConfig::default();

        // 精确匹配
        assert!(config.matches_pattern("test.js", "test.js"));
        assert!(!config.matches_pattern("test.js", "test.ts"));

        // 包含匹配
        assert!(config.matches_pattern("/path/to/test.js", "test.js"));
        assert!(!config.matches_pattern("/path/to/test.js", "example"));

        // 通配符匹配
        assert!(config.matches_pattern("test.js", "*.js"));
        assert!(config.matches_pattern("README.md", "*.md"));
        assert!(!config.matches_pattern("test.js", "*.md"));
    }
}
