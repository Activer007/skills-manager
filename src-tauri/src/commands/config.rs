use serde_json::Value;
use crate::services::config_service::ConfigService;

#[tauri::command]
pub fn get_skill_config(skill_id: String) -> Result<Value, String> {
    let service = ConfigService::new().map_err(|e| e.to_string())?;
    Ok(service.get_skill_config(&skill_id).unwrap_or(serde_json::json!({})))
}

#[tauri::command]
pub fn set_skill_config(skill_id: String, config: Value) -> Result<(), String> {
    let service = ConfigService::new().map_err(|e| e.to_string())?;
    service.set_skill_config(&skill_id, config).map_err(|e| e.to_string())
}
