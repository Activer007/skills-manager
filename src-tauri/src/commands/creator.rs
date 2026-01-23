use crate::models::creator::{Creator, UpdateCreatorRequest};
use crate::services::creator_service::CreatorService;
use tauri::command;

#[command]
pub fn get_creator(id: String) -> Result<Option<Creator>, String> {
    CreatorService::get_creator(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_creator(request: UpdateCreatorRequest) -> Result<(), String> {
    CreatorService::update_creator(request).map_err(|e| e.to_string())
}

#[command]
pub fn follow_creator(id: String) -> Result<(), String> {
    CreatorService::follow_creator(&id).map_err(|e| e.to_string())
}

#[command]
pub fn unfollow_creator(id: String) -> Result<(), String> {
    CreatorService::unfollow_creator(&id).map_err(|e| e.to_string())
}

#[command]
pub fn get_followed_creators() -> Result<Vec<Creator>, String> {
    CreatorService::get_followed_creators().map_err(|e| e.to_string())
}
