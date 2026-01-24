use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct AppConfig {
    #[serde(default, rename = "projectPaths")]
    pub project_paths: Vec<String>,

    #[serde(default, rename = "skillConfigs")]
    pub skill_configs: HashMap<String, serde_json::Value>,
}

pub struct ConfigService {
    config_path: PathBuf,
    cache: Mutex<AppConfig>,
}

impl ConfigService {
    pub fn new() -> Self {
        let config_path = dirs::home_dir()
            .map(|h| h.join(".claude").join("skill-manager-config.json"))
            .unwrap_or_else(|| PathBuf::from("skill-manager-config.json"));

        let config = if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_else(|e| {
                    eprintln!("Failed to parse config: {}", e);
                    AppConfig::default()
                }),
                Err(e) => {
                    eprintln!("Failed to read config file: {}", e);
                    AppConfig::default()
                }
            }
        } else {
            AppConfig::default()
        };

        Self {
            config_path,
            cache: Mutex::new(config),
        }
    }

    pub fn get_skill_config(&self, skill_id: &str) -> Option<serde_json::Value> {
        let cache = self.cache.lock().unwrap();
        cache.skill_configs.get(skill_id).cloned()
    }

    pub fn set_skill_config(&self, skill_id: &str, config: serde_json::Value) -> Result<(), String> {
        let mut cache = self.cache.lock().unwrap();
        cache.skill_configs.insert(skill_id.to_string(), config);

        // Persist to disk
        self.save_to_disk(&cache)
    }

    pub fn get_project_paths(&self) -> Vec<String> {
        let cache = self.cache.lock().unwrap();
        cache.project_paths.clone()
    }

    pub fn set_project_paths(&self, paths: Vec<String>) -> Result<(), String> {
        let mut cache = self.cache.lock().unwrap();
        cache.project_paths = paths;
        self.save_to_disk(&cache)
    }

    fn save_to_disk(&self, config: &AppConfig) -> Result<(), String> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        
        // Write to temp file first, then rename for atomicity
        let tmp_path = self.config_path.with_extension("tmp");
        fs::write(&tmp_path, json).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, &self.config_path).map_err(|e| e.to_string())
    }
}
