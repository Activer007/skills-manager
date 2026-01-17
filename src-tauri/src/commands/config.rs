use tauri::State;
use serde_json::Value;
use crate::services::config_service::ConfigService;
use crate::models::config::SavePathsRequest;

#[tauri::command]
pub fn get_skill_config(state: State<'_, ConfigService>, skill_id: String) -> Result<Value, String> {
    Ok(state.get_skill_config(&skill_id).unwrap_or(serde_json::json!({})))
}

#[tauri::command]
pub fn set_skill_config(state: State<'_, ConfigService>, skill_id: String, config: Value) -> Result<(), String> {
    state.set_skill_config(&skill_id, config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project_paths(state: State<'_, ConfigService>) -> Result<Vec<String>, String> {
    Ok(state.get_project_paths())
}

#[tauri::command]
pub fn save_project_paths(state: State<'_, ConfigService>, request: SavePathsRequest) -> Result<(), String> {
    state.set_project_paths(request.paths).map_err(|e| e.to_string())
}