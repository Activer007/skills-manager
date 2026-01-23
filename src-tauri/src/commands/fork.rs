use crate::models::fork::{ForkRequest, ForkStats, LineageNode, ForkInfo};
use crate::services::fork_service::ForkService;
use tauri::command;

/// Fork 或 Remix 一个 Skill
#[command]
pub fn fork_skill(request: ForkRequest) -> Result<String, String> {
    ForkService::fork_skill(request).map_err(|e| e.to_string())
}

/// 获取 Skill 的谱系信息
#[command]
pub fn get_skill_lineage(skill_id: String, max_depth: Option<i32>) -> Result<LineageNode, String> {
    ForkService::get_skill_lineage(&skill_id, max_depth).map_err(|e| e.to_string())
}

/// 获取 Skill 的派生信息
#[command]
pub fn get_fork_info(skill_id: String) -> Result<ForkInfo, String> {
    ForkService::get_fork_info(&skill_id).map_err(|e| e.to_string())
}

/// 获取 Skill 的派生统计
#[command]
pub fn get_fork_stats(skill_id: String) -> Result<Option<ForkStats>, String> {
    ForkService::get_fork_stats(&skill_id).map_err(|e| e.to_string())
}
