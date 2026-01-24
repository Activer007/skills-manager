use tauri::State;
use crate::services::cache::{GLOBAL_CACHE, CacheStats};
use crate::services::config_service::ConfigService;
use crate::models::config::CacheConfig;

#[tauri::command]
pub fn get_cache_stats() -> CacheStats {
    let cache = GLOBAL_CACHE.lock().unwrap();
    cache.stats()
}

#[tauri::command]
pub fn clear_cache() {
    let mut cache = GLOBAL_CACHE.lock().unwrap();
    cache.clear();
}

#[tauri::command]
pub fn update_cache_config(state: State<'_, ConfigService>, config: CacheConfig) -> Result<(), String> {
    // 1. Update global cache instance
    {
        let mut cache = GLOBAL_CACHE.lock().unwrap();
        cache.update_config(config.clone());
    }

    // 2. Persist to config file
    state.set_cache_config(config).map_err(|e| e.to_string())
}
