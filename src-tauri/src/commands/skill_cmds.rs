use tauri::{AppHandle, State, Emitter};
use tauri::ipc::Channel;
use crate::services::config_service::ConfigService;
use crate::services::skill_service::SkillService;
use crate::models::skill::ScanResult;
use crate::models::import::{UninstallRequest, ImportResult};
use crate::tasks::{BackgroundTask, TaskType, TaskStatus, ProgressEvent, ProgressStage, TASK_MANAGER};
use crate::constants::SKILL_SCAN_DEPTH;
use walkdir::WalkDir;
use std::path::PathBuf;
use std::fs;

#[tauri::command]
pub fn scan_skills(state: State<'_, ConfigService>) -> Result<ScanResult, String> {
    SkillService::scan_skills(&state)
}

#[tauri::command]
pub async fn scan_skills_with_progress(
    app: AppHandle,
    state: State<'_, ConfigService>,
    progress_channel: Channel<ProgressEvent>
) -> Result<String, String> {
    let task = BackgroundTask::new(TaskType::ScanSkill, "Scanning skills".to_string());
    let task_id = TASK_MANAGER.add_task(task.clone()).await;

    // Notify start
    let _ = progress_channel.send(ProgressEvent::new(&task_id, ProgressStage::Queued, "Task queued...", 0));

    let app_handle = app.clone();
    // ConfigService isn't cloneable easily as it has a Mutex, but we just need project paths.
    // Let's get project paths before spawning.
    let project_paths = state.get_project_paths();

    let task_id_clone = task_id.clone();
    let channel_clone = progress_channel.clone();

    tokio::spawn(async move {
        let task_id = task_id_clone;
        let channel = channel_clone;

        TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Running).await;
        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Preparing, "Waiting for slot...", 5));

        // Acquire permit
        let (_permit, _) = TASK_MANAGER.acquire_permit(&TaskType::ScanSkill).await;

        // Check cancellation
        if let Some(token) = TASK_MANAGER.get_cancellation_token(&task_id) {
            if token.is_cancelled() {
                TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Cancelled).await;
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Cancelled, "Cancelled", 0));
                return;
            }
        }

        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Scanning, "Scanning system skills...", 10));

        // Use blocking task for filesystem operations
        let paths = project_paths;
        let result = tokio::task::spawn_blocking(move || {
            let mut system_skills = Vec::new();
            let mut project_skills = Vec::new();

            // Scan system skills
            if let Some(skills_dir) = SkillService::get_claude_skills_dir() {
                if skills_dir.exists() {
                    for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
                        let path = entry.path();
                        if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                            if let Some(skill) = SkillService::parse_skill_md(&path.to_path_buf(), "system") {
                                system_skills.push(skill);
                            }
                        }
                    }
                }
            }

            // Scan project skills
            let total_projects = paths.len();
            for (idx, project_path) in paths.iter().enumerate() {
                let skills_dir = PathBuf::from(project_path).join(".claude").join("skills");
                if skills_dir.exists() {
                    for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
                        let path = entry.path();
                        if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                            if let Some(skill) = SkillService::parse_skill_md(&path.to_path_buf(), "project") {
                                project_skills.push(skill);
                            }
                        }
                    }
                }

                // Estimate progress for projects (10% to 90%)
                if total_projects > 0 {
                    let _progress = 10 + ((idx + 1) as f64 / total_projects as f64 * 80.0) as u8;
                    // Note: We can't easily send progress from inside spawn_blocking unless we pass a channel or callback
                }
            }

            ScanResult {
                system_skills,
                project_skills,
            }
        }).await;

        match result {
            Ok(scan_result) => {
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Completed, "Scan completed", 100));
                TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Completed).await;
                // We could also emit the result if needed, or rely on the frontend to refetch
                let _ = app_handle.emit("scan-result", scan_result);
            }
            Err(e) => {
                let err_msg = e.to_string();
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &err_msg, 0));
                TASK_MANAGER.update_error(&app_handle, &task_id, err_msg).await;
            }
        }
    });

    Ok(task_id)
}

#[tauri::command]
pub fn uninstall_skill(request: UninstallRequest) -> Result<ImportResult, String> {
    let skill_path = &request.skill_path;

    // 验证路径不为空
    if skill_path.is_empty() {
        return Ok(ImportResult {
            success: false,
            message: "Skill path is empty".to_string(),
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    let path = PathBuf::from(skill_path);

    if !path.exists() {
        return Ok(ImportResult {
            success: false,
            message: format!("Skill path does not exist: {}", skill_path),
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    // 安全检查：确保路径在 .claude/skills 目录下
    let path_str = path.to_string_lossy().to_string();
    if !path_str.contains(".claude") || !path_str.contains("skills") {
        return Ok(ImportResult {
            success: false,
            message: "Invalid skill path - must be in .claude/skills directory".to_string(),
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    match fs::remove_dir_all(&path) {
        Ok(_) => Ok(ImportResult {
            success: true,
            message: "Skill uninstalled successfully".to_string(),
            blocked: false,
            skill_path: Some(skill_path.clone()),
            skill_name: path.file_name().map(|n| n.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(ImportResult {
            success: false,
            message: format!("Failed to remove skill: {}", e),
            blocked: false,
            skill_path: None,
            skill_name: None,
        }),
    }
}

#[tauri::command]
pub fn read_skill(skill_path: String) -> Result<String, String> {
    let path = PathBuf::from(&skill_path);
    let skill_md = if path.is_dir() {
        path.join("SKILL.md")
    } else {
        path
    };

    if !skill_md.exists() {
        return Err(format!("SKILL.md not found at: {}", skill_md.display()));
    }

    // Basic safety check: only allow reading from .claude/skills directories
    let path_str = skill_md.to_string_lossy().to_string();
    if !path_str.contains(".claude") || !path_str.contains("skills") {
        return Err("Invalid skill path - must be in .claude/skills directory".to_string());
    }

    fs::read_to_string(&skill_md)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))
}
