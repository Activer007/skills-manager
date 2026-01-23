use crate::models::collection::{
    AddItemRequest, Collection, CreateCollectionRequest, RemoveItemRequest, UpdateCollectionRequest,
};
use crate::services::collection_service::CollectionService;
use tauri::command;

#[command]
pub fn create_collection(request: CreateCollectionRequest) -> Result<Collection, String> {
    CollectionService::create_collection(request).map_err(|e| e.to_string())
}

#[command]
pub fn get_collections() -> Result<Vec<Collection>, String> {
    CollectionService::get_collections().map_err(|e| e.to_string())
}

#[command]
pub fn get_collection(id: String) -> Result<Option<Collection>, String> {
    CollectionService::get_collection(&id).map_err(|e| e.to_string())
}

#[command]
pub fn update_collection(request: UpdateCollectionRequest) -> Result<(), String> {
    CollectionService::update_collection(request).map_err(|e| e.to_string())
}

#[command]
pub fn delete_collection(id: String) -> Result<(), String> {
    CollectionService::delete_collection(&id).map_err(|e| e.to_string())
}

#[command]
pub fn add_collection_item(request: AddItemRequest) -> Result<(), String> {
    CollectionService::add_item(request).map_err(|e| e.to_string())
}

#[command]
pub fn remove_collection_item(request: RemoveItemRequest) -> Result<(), String> {
    CollectionService::remove_item(request).map_err(|e| e.to_string())
}
