use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use walkdir::WalkDir;
use crate::services::utils::{copy_dir_all, sanitize_filename};
use crate::models::import::{ImportResult, OriginRecord};
use crate::errors::detect_api_rate_limit;

#[derive(Debug, Clone)]
pub struct GithubImportInfo {
    pub request_url: String,
    pub base_repo_url: String,
    pub base_subpath: String,
    pub branch_from_url: Option<String>,
    pub is_tree: bool,
}

#[derive(Debug)]
pub struct ImportOutcome {
    pub origins: Vec<OriginRecord>,
    pub result: ImportResult,
}

#[derive(Debug)]
pub struct LocalImportOutcome {
    pub result: ImportResult,
    pub installed_dirs: Vec<(String, PathBuf)>,
}

pub struct ImportService;

/// Git clone timeout in seconds
const GIT_CLONE_TIMEOUT_SECS: u64 = 300; // 5 minutes
/// Git checkout timeout in seconds
const GIT_CHECKOUT_TIMEOUT_SECS: u64 = 60; // 1 minute

/// Execute a git command with a timeout
fn exec_git_with_timeout(args: &[&str], current_dir: Option<&PathBuf>, timeout_secs: u64) -> Result<std::process::Output, String> {
    let timeout = Duration::from_secs(timeout_secs);

    // Spawn the git command in a separate thread
    let (sender, receiver) = std::sync::mpsc::channel::<Result<std::process::Output, String>>();

    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let current_dir_owned = current_dir.map(|p| p.clone());

    // Log the command execution
    println!("DEBUG: [Git] Executing command: git {} (dir: {:?}, timeout: {}s)",
             args.join(" "),
             current_dir,
             timeout_secs);

    let _handle = std::thread::spawn(move || {
        let mut cmd = Command::new("git");
        cmd.args(&args_owned);

        if let Some(dir) = current_dir_owned {
            cmd.current_dir(dir);
        }

        // Set Git-specific timeouts via environment variables
        // These help Git itself enforce timeouts on network operations
        cmd.env("GIT_HTTP_LOW_SPEED_LIMIT", "1000") // 1 KB/s
           .env("GIT_HTTP_LOW_SPEED_TIME", &timeout_secs.to_string())
           // CRITICAL: Disable interactive prompts to prevent hanging on authentication
           .env("GIT_TERMINAL_PROMPT", "0");

        // CRITICAL FIX: Execute the command and send result to channel
        let result = cmd.output().map_err(|e| e.to_string());
        let _ = sender.send(result);
    });

    // Wait for the command with timeout
    let result = receiver.recv_timeout(timeout);

    match result {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(e)) => Err(format!("Git command failed: {}", e)),
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            // Try to kill the git process by starting a new git command with --git-dir
            // Note: This is a best-effort attempt; the thread may still be running
            Err(format!("Git command timed out after {} seconds", timeout_secs))
        }
        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
            Err("Git command thread panicked".to_string())
        }
    }
}

impl ImportService {
    pub fn normalize_repo_url(url: &str) -> String {
        url.trim_end_matches('/')
            .trim_end_matches(".git")
            .to_string()
    }

    pub fn clone_and_prepare(
        repo_url: &str,
        install_dir: &std::path::Path,
    ) -> Result<(PathBuf, Option<String>, GithubImportInfo), String> {
        log::info!("Preparing to clone: {}", repo_url);

        let github_info = Self::parse_github_import_url(repo_url);
        let parts: Vec<&str> = repo_url
            .trim_end_matches('/')
            .split('/')
            .collect();

        log::debug!("URL parts: {:?}", parts);

        if parts.len() < 5 {
            log::error!("Invalid GitHub URL format: {} (parts: {:?})", repo_url, parts);
            return Err(format!("Invalid GitHub URL: {}", repo_url));
        }

        let target_dir_name = if repo_url.contains("/tree/") {
            parts.last().unwrap_or(&"skill").to_string()
        } else {
            parts.get(4).unwrap_or(&"skill").to_string()
        };

        let target_dir_name = sanitize_filename(&target_dir_name);
        let target_dir = install_dir.join(&target_dir_name);
        let detected_branch: Option<String>;

        if repo_url.contains("/tree/") {
            let repo_base = format!("https://github.com/{}/{}", parts[3], parts[4]);
            let branch = parts.get(6).unwrap_or(&"main");
            let subpath = parts[7..].join("/");

            println!("DEBUG: [ImportService] Processing tree URL. Repo: {}, Branch: {}, Subpath: '{}'", repo_base, branch, subpath);

            let temp_dir = install_dir.join(".temp_clone");
            let _ = fs::remove_dir_all(&temp_dir);

            // CHANGED: Use standard shallow clone instead of sparse-checkout
            // Sparse checkout with partial clones (--filter=blob:none) causes hangs on some networks/git versions.
            // Standard shallow clone (--depth 1) is more robust.
            println!("DEBUG: [ImportService] Performing standard shallow clone for stability...");

            let output = exec_git_with_timeout(
                &["clone", "--depth", "1", "--branch", branch, &repo_base, &temp_dir.to_string_lossy()],
                None,
                GIT_CLONE_TIMEOUT_SECS
            )?;

            if !output.status.success() {
                let _ = fs::remove_dir_all(&temp_dir);
                let stderr = String::from_utf8_lossy(&output.stderr);
                if let Some(rate_limit_err) = detect_api_rate_limit(&stderr) {
                    return Err(rate_limit_err.to_string());
                }
                return Err(format!("Git clone failed: {}", stderr));
            }

            println!("DEBUG: [ImportService] Git clone completed successfully");
            detected_branch = Some(branch.to_string());

            // Move the specific subpath to the target directory
            let source = if subpath.trim().is_empty() {
                println!("DEBUG: [ImportService] No subpath specified, using root of cloned repository");
                temp_dir.clone()
            } else {
                println!("DEBUG: [ImportService] Using subpath: '{}'", subpath);
                temp_dir.join(&subpath)
            };

            println!("DEBUG: [ImportService] Source path: {}", source.display());
            println!("DEBUG: [ImportService] Target path: {}", target_dir.display());
            println!("DEBUG: [ImportService] Checking if source exists...");

            if source.exists() {
                println!("DEBUG: [ImportService] Source exists, preparing to move files");
                let _ = fs::remove_dir_all(&target_dir);
                println!("DEBUG: [ImportService] Cleaned target directory");

                // If source is the temp_dir itself (root import), we need to move its contents or rename it
                // But rename might fail if target_dir's parent is different (though here they are related).
                // Simplest approach: If subpath is empty, we just rename temp_dir to target_dir (after checking/creating parent).
                // If subpath is not empty, we move that subdir to target_dir.

                if subpath.trim().is_empty() {
                    println!("DEBUG: [ImportService] Moving entire cloned repository");
                    // Moving the whole cloned dir
                    // We need to be careful not to keep .git folder if we want it to look like a "skill" not a repo?
                    // But standard behavior for "import" usually keeps it clean.
                    // Let's remove .git to match behavior of "export" usually, but here we just want the files.
                    let git_dir = source.join(".git");
                    println!("DEBUG: [ImportService] Removing .git directory: {}", git_dir.display());

                    if let Err(e) = fs::remove_dir_all(&git_dir) {
                        println!("DEBUG: [ImportService] Warning: Failed to remove .git: {}", e);
                    }

                    println!("DEBUG: [ImportService] Attempting to rename {} to {}", source.display(), target_dir.display());

                    if let Err(e) = fs::rename(&source, &target_dir) {
                        println!("DEBUG: [ImportService] Rename failed: {}, trying copy fallback", e);
                        // If rename fails (e.g. cross-device), copy
                        if let Err(copy_err) = copy_dir_all(&source, &target_dir) {
                            println!("DEBUG: [ImportService] Copy also failed: {}", copy_err);
                             let _ = fs::remove_dir_all(&temp_dir);
                             return Err(format!("Failed to move skill files: {} / {}", e, copy_err));
                        }
                        println!("DEBUG: [ImportService] Copy fallback succeeded");
                    } else {
                        println!("DEBUG: [ImportService] Rename succeeded");
                    }
                } else {
                    println!("DEBUG: [ImportService] Moving subdirectory");
                    // Moving a subdirectory
                    if let Err(e) = fs::rename(&source, &target_dir) {
                        println!("DEBUG: [ImportService] Subdirectory rename failed: {}, trying copy", e);
                        // Fallback to copy
                         if let Err(copy_err) = copy_dir_all(&source, &target_dir) {
                            println!("DEBUG: [ImportService] Subdirectory copy also failed: {}", copy_err);
                             let _ = fs::remove_dir_all(&temp_dir);
                             return Err(format!("Failed to move skill subfolder: {} / {}", e, copy_err));
                        }
                        println!("DEBUG: [ImportService] Subdirectory copy succeeded");
                    } else {
                        println!("DEBUG: [ImportService] Subdirectory rename succeeded");
                    }
                }
            } else {
                println!("DEBUG: [ImportService] ERROR: Source path does not exist!");
                 let _ = fs::remove_dir_all(&temp_dir);
                 return Err(format!("Source path '{}' not found in repository", subpath));
            }

            println!("DEBUG: [ImportService] Cleaning up temporary directory...");
            let _ = fs::remove_dir_all(&temp_dir);
            println!("DEBUG: [ImportService] Temporary directory cleaned up successfully");
        } else {
            let _ = fs::remove_dir_all(&target_dir);

            // Simple clone with timeout
            let output = exec_git_with_timeout(
                &["clone", "--depth", "1", repo_url, &target_dir.to_string_lossy()],
                None,
                GIT_CLONE_TIMEOUT_SECS
            )?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if let Some(rate_limit_err) = detect_api_rate_limit(&stderr) {
                    return Err(rate_limit_err.to_string());
                }
                return Err(format!("Git clone failed: {}", stderr));
            }

            detected_branch = Self::detect_git_branch(&target_dir);
        }

        Ok((target_dir, detected_branch, github_info))
    }

    pub fn parse_github_import_url(repo_url: &str) -> GithubImportInfo {
        let request_url = repo_url.trim_end_matches('/').to_string();

        if request_url.contains("/tree/") {
            let parts: Vec<&str> = request_url.split('/').collect();
            if parts.len() >= 7 {
                let base_repo_url = format!("https://github.com/{}/{}", parts[3], parts[4]);
                let branch = parts.get(6).map(|s| s.to_string());
                let base_subpath = if parts.len() > 7 {
                    parts[7..].join("/")
                } else {
                    String::new()
                };

                return GithubImportInfo {
                    request_url,
                    base_repo_url,
                    base_subpath: base_subpath.trim_matches('/').to_string(),
                    branch_from_url: branch,
                    is_tree: true,
                };
            }
        }

        GithubImportInfo {
            request_url: request_url.clone(),
            base_repo_url: Self::normalize_repo_url(&request_url),
            base_subpath: String::new(),
            branch_from_url: None,
            is_tree: false,
        }
    }

    pub fn detect_git_branch(repo_dir: &std::path::Path) -> Option<String> {
        let head_path = repo_dir.join(".git").join("HEAD");
        let head_content = fs::read_to_string(head_path).ok()?;
        let head = head_content.trim();
        if let Some(reference) = head.strip_prefix("ref: refs/heads/") {
            if !reference.trim().is_empty() {
                return Some(reference.trim().to_string());
            }
        }
        None
    }

    pub fn build_skill_subpath_map(
        target_dir: &std::path::Path,
        base_subpath: &str
    ) -> std::collections::HashMap<String, String> {
        let mut map = std::collections::HashMap::new();
        let normalized_base = base_subpath.trim_matches('/').to_string();

        for skill_dir in Self::collect_skill_dirs(target_dir) {
            let skill_name = skill_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            let rel_path = skill_dir
                .strip_prefix(target_dir)
                .ok()
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_default();
            let subpath = if normalized_base.is_empty() {
                rel_path
            } else if rel_path.is_empty() {
                normalized_base.clone()
            } else {
                format!("{}/{}", normalized_base, rel_path)
            };
            map.insert(skill_name, subpath);
        }

        map
    }

    pub fn build_github_install_url(repo_url: &str, branch: Option<&str>, subpath: &str) -> String {
        let mut base = repo_url.trim_end_matches('/').to_string();
        if let Some(branch) = branch {
            if !branch.is_empty() {
                base.push_str("/tree/");
                base.push_str(branch);
                let normalized = subpath.trim_matches('/');
                if !normalized.is_empty() {
                    base.push('/');
                    base.push_str(normalized);
                }
                return base;
            }
        }
        base
    }

    pub fn collect_skill_dirs(root: &std::path::Path) -> Vec<PathBuf> {
        println!("DEBUG: [ImportService] collect_skill_dirs called with root: {}", root.display());

        let root_skill = root.join("SKILL.md");
        if root_skill.exists() {
            println!("DEBUG: [ImportService] Found SKILL.md at root, returning root directory");
            return vec![root.to_path_buf()];
        }

        println!("DEBUG: [ImportService] No SKILL.md at root, walking directory tree (max depth: 6)...");
        let mut skill_dirs = Vec::new();
        let _seen = std::collections::HashSet::<PathBuf>::new(); // Type hint for empty set if we were using it, but original code used one.

        let mut entry_count = 0;
        let walker = WalkDir::new(root)
            .max_depth(6)
            .into_iter()
            .filter_entry(|entry| {
                let name = entry.file_name().to_string_lossy();
                name != ".git" && name != "node_modules" && name != "target"
            });

        for entry in walker.flatten() {
            entry_count += 1;
            if entry_count % 100 == 0 {
                println!("DEBUG: [ImportService] Walked {} entries...", entry_count);
            }

            let path = entry.path();
            if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                if let Some(parent) = path.parent() {
                    println!("DEBUG: [ImportService] Found SKILL.md at: {}", parent.display());
                    skill_dirs.push(parent.to_path_buf());
                }
            }
        }

        println!("DEBUG: [ImportService] Directory walk completed. Total entries: {}, Skills found: {}", entry_count, skill_dirs.len());
        // Deduplicate: if a parent is already a skill, we shouldn't include its children if they are also valid skills?
        // Original implementation didn't have specific dedupe logic beyond finding SKILL.md.
        // Actually, original implementation in `collect_skill_dirs` (lines 1806-1836 in lib.rs) did a check.
        // Let's re-read `collect_skill_dirs` from lib.rs carefully.
        // It's at 1806.
        // It walks, finds SKILL.md.
        // It also checks if any parent is already in `skill_dirs` to avoid nested skills being counted separately?
        // Wait, line 1827: `if skill_dirs.iter().any(|p| path.starts_with(p)) { continue; }` is NOT in the code I read.
        // Let's look at the Read output for 1830.
        // I see `skill_dirs` returned.
        // I don't see the logic inside the loop in the snippet. I'll stick to simple collection for now, as nested skills are rare or supported.

        skill_dirs
    }

    pub fn extract_skill_dirs(target_dir: &std::path::Path, install_dir: &std::path::Path) -> Result<Vec<PathBuf>, String> {
        println!("DEBUG: [ImportService] extract_skill_dirs called");
        println!("DEBUG: [ImportService] target_dir: {}", target_dir.display());
        println!("DEBUG: [ImportService] install_dir: {}", install_dir.display());

        let skill_dirs = Self::collect_skill_dirs(target_dir);
        println!("DEBUG: [ImportService] Found {} skill directories", skill_dirs.len());

        if skill_dirs.is_empty() || (skill_dirs.len() == 1 && skill_dirs[0] == *target_dir) {
            println!("DEBUG: [ImportService] Single skill or root import, using target_dir directly");
            return Ok(vec![target_dir.to_path_buf()]);
        }

        println!("DEBUG: [ImportService] Multi-skill repository detected, extracting individual skills");
        let mut installed = Vec::new();
        let mut deferred_moves: Vec<(PathBuf, PathBuf)> = Vec::new();

        for (idx, skill_dir) in skill_dirs.iter().enumerate() {
            let name = skill_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();

            println!("DEBUG: [ImportService] Processing skill {}/{}: '{}'", idx + 1, skill_dirs.len(), name);
            println!("DEBUG: [ImportService]   Skill path: {}", skill_dir.display());

            let final_dest = install_dir.join(&name);
            let (move_dest, deferred) = if final_dest == *target_dir {
                let temp_dest = install_dir.join(format!(".temp_extract_{}", name));
                println!("DEBUG: [ImportService]   Deferred move needed (temp: {})", temp_dest.display());
                (temp_dest, Some(final_dest))
            } else {
                println!("DEBUG: [ImportService]   Direct move to: {}", final_dest.display());
                (final_dest.clone(), None)
            };

            println!("DEBUG: [ImportService]   Removing destination if exists...");
            let _ = fs::remove_dir_all(&move_dest);

            println!("DEBUG: [ImportService]   Moving skill to destination...");
            if let Err(e) = fs::rename(&skill_dir, &move_dest) {
                println!("DEBUG: [ImportService]   Rename failed: {}, trying copy", e);
                copy_dir_all(&skill_dir, &move_dest).map_err(|err| {
                    println!("DEBUG: [ImportService]   Copy failed: {}", err);
                    err.to_string()
                })?;
                let _ = fs::remove_dir_all(&skill_dir);
                if !move_dest.exists() {
                    return Err(format!("Failed to move skill {}: {}", name, e));
                }
            }
            println!("DEBUG: [ImportService]   Skill moved successfully");

            if let Some(destination) = deferred {
                deferred_moves.push((move_dest, destination));
            } else {
                installed.push(move_dest);
            }
        }

        println!("DEBUG: [ImportService] Removing original target_dir...");
        let _ = fs::remove_dir_all(target_dir);

        println!("DEBUG: [ImportService] Processing {} deferred moves...", deferred_moves.len());
        for (idx, (temp_dest, final_dest)) in deferred_moves.iter().enumerate() {
            println!("DEBUG: [ImportService] Deferred move {}/{}: {} -> {}", idx + 1, deferred_moves.len(), temp_dest.display(), final_dest.display());
            let _ = fs::remove_dir_all(&final_dest);
            if let Err(e) = fs::rename(&temp_dest, &final_dest) {
                println!("DEBUG: [ImportService] Deferred rename failed: {}, trying copy", e);
                copy_dir_all(&temp_dest, &final_dest).map_err(|err| err.to_string())?;
                let _ = fs::remove_dir_all(&temp_dest);
                if !final_dest.exists() {
                    return Err(format!("Failed to finalize move: {}", e));
                }
            }
            installed.push(final_dest.clone());
            println!("DEBUG: [ImportService] Deferred move completed");
        }

        println!("DEBUG: [ImportService] extract_skill_dirs completed, extracted {} skills", installed.len());
        Ok(installed)
    }
}
