use crate::services::cache::{GLOBAL_CACHE, CacheStats};

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
