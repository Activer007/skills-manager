// Initialize i18n with locales directory
rust_i18n::i18n!("locales", fallback = "en");

use tauri::Manager;
use crate::services::config_service::ConfigService;

// Import modules
pub mod analyzer;
pub mod commands;
pub mod i18n;
pub mod models;
pub mod constants;
pub mod security;
pub mod services;
pub mod tasks;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();
    log::info!("Skills Manager starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            log::debug!("Initializing database...");
            if let Err(e) = crate::services::db::init_db() {
                log::error!("Failed to initialize database: {}", e);
            }

            // Initialize default repositories if none exist
            log::debug!("Checking default repositories...");
            match crate::services::initialize_default_repositories() {
                Ok(initialized) => {
                    if initialized {
                        log::info!("Default repositories initialized successfully");
                    }
                }
                Err(e) => {
                    log::warn!("Failed to initialize default repositories: {}", e);
                }
            }

            // Initialize and manage ConfigService
            let config_service = ConfigService::new();
            app.manage(config_service);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Skill commands
            commands::skill_cmds::scan_skills,
            commands::skill_cmds::scan_skills_with_progress,
            commands::skill_cmds::uninstall_skill,

            // Import commands
            commands::import_cmds::import_github_skill,
            commands::import_cmds::import_github_skill_with_progress,
            commands::import_cmds::import_local_skill,

            // Package commands
            commands::package_cmds::calculate_skill_checksum,
            commands::package_cmds::export_skill_package,
            commands::package_cmds::export_collection_package,
            commands::package_cmds::import_skill_package,

            // Fork/Remix commands
            commands::fork::fork_skill,
            commands::fork::get_skill_lineage,
            commands::fork::get_fork_info,
            commands::fork::get_fork_stats,

            // Collection commands
            commands::collection::create_collection,
            commands::collection::get_collections,
            commands::collection::get_collection,
            commands::collection::get_collection_items,
            commands::collection::update_collection,
            commands::collection::delete_collection,
            commands::collection::add_collection_item,
            commands::collection::remove_collection_item,
            commands::collection::reorder_collection_items,

            // Security commands
            commands::security::scan_skill_security,
            commands::security::batch_scan_skills,
            commands::security::scan_skill_security_incremental,
            commands::security::batch_scan_skills_incremental,
            commands::security::get_security_config,
            commands::security::update_security_config,
            commands::security::get_scan_history,
            commands::security::add_whitelist_entry,
            commands::security::remove_whitelist_entry,
            commands::security::get_whitelist,

            // Config commands
            commands::config::get_skill_config,
            commands::config::set_skill_config,
            commands::config::get_project_paths,
            commands::config::save_project_paths,

            // Repository commands
            commands::repository::get_repositories,
            commands::repository::get_repository,
            commands::repository::add_repository,
            commands::repository::delete_repository,
            commands::repository::toggle_repository_enabled,
            commands::repository::get_featured_repositories,
            commands::repository::refresh_featured_repositories,
            commands::repository::get_unscanned_repositories,
            commands::repository::get_repository_stats,

            // Analyzer commands
            commands::analyzer::analyze_skill_quality,
            commands::analyzer::batch_analyze_skills,
            commands::analyzer::batch_analyze_skills_detailed,

            // Cache commands
            commands::cache::get_cache_stats,
            commands::cache::clear_cache,
            commands::cache::update_cache_config,

            // Task commands
            commands::task::get_tasks,
            commands::task::get_task,
            commands::task::cancel_task,
            commands::task::cleanup_tasks,

            // Publish commands
            commands::publish::run_publish_preflight,
            commands::publish::publish_skill,

            // Share commands
            commands::share::generate_share_link,
            commands::share::resolve_share_link
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
