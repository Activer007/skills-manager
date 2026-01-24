use std::fs;
use std::path::{Component, Path, PathBuf};
use std::io::{Read, Write};
use std::time::UNIX_EPOCH;
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::{ZipArchive, ZipWriter};
use zip::write::FileOptions;
use zip::CompressionMethod;
use serde_json::Value;

 // Assuming I created this, but I'll use Value for flexibility if needed or define struct
use crate::services::import_service::ImportService;
use crate::constants::MAX_PACKAGE_UNCOMPRESSED_SIZE;

#[derive(serde::Deserialize)]
pub struct ExportSkillPackageRequest {
    pub skill_path: String,
    pub output_dir: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ExportCollectionPackageRequest {
    pub collection_id: String,
    pub output_dir: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ImportPackageRequest {
    pub package_path: String,
    pub install_path: Option<String>,
    pub skip_security_check: bool,
}

#[derive(serde::Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    pub file_path: Option<String>,
}

pub struct PackageService;

impl PackageService {
    pub fn calculate_skill_checksum_for_path(skill_dir: &PathBuf) -> Result<String, String> {
        if !skill_dir.exists() {
            return Err("Skill directory not found".to_string());
        }

        let mut hasher = Sha256::new();

        for entry in WalkDir::new(skill_dir)
            .follow_links(false)
            .max_depth(10)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }

            if let Ok(meta) = entry.metadata() {
                let path_str = entry.path().to_string_lossy();
                let modified = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                hasher.update(path_str.as_bytes());
                hasher.update(meta.len().to_be_bytes());
                hasher.update(modified.to_be_bytes());
            }

            if entry.file_name().to_string_lossy().eq_ignore_ascii_case("SKILL.md") {
                if let Ok(content) = fs::read(entry.path()) {
                    hasher.update(content);
                }
            }
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    pub fn ensure_export_dir(output_dir: Option<String>) -> Result<PathBuf, String> {
        let dir = if let Some(path) = output_dir {
            PathBuf::from(path)
        } else {
            dirs::home_dir()
                .map(|h| h.join(".claude").join("skill-exports"))
                .ok_or("Cannot determine export directory")?
        };
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir)
    }

    pub fn is_skill_package_path(package_path: &PathBuf) -> bool {
        package_path
            .to_string_lossy()
            .to_ascii_lowercase()
            .ends_with(".skillpack.zip")
    }

    pub fn should_skip_package_entry(path: &Path) -> bool {
        path.components().any(|component| {
            if let Component::Normal(name) = component {
                let value = name.to_string_lossy();
                value == ".git" || value == "node_modules" || value == "target"
            } else {
                false
            }
        })
    }

    pub fn write_skill_package(
        skill_dir: &PathBuf,
        output_path: &PathBuf,
        metadata: &Value,
    ) -> Result<(), String> {
        let skill_dir_name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid skill directory name")?;

        let file = fs::File::create(output_path).map_err(|e| e.to_string())?;
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let metadata_json = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
        zip.start_file("skill-package.json", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(metadata_json.as_bytes())
            .map_err(|e| e.to_string())?;

        for entry in WalkDir::new(skill_dir)
            .follow_links(false)
            .max_depth(10)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }
            if Self::should_skip_package_entry(entry.path()) {
                continue;
            }

            let rel_path = entry
                .path()
                .strip_prefix(skill_dir)
                .map_err(|_| "Failed to resolve relative path")?;
            let rel_str = rel_path.to_string_lossy().replace('\\', "/");
            let zip_path = if rel_str.is_empty() {
                skill_dir_name.to_string()
            } else {
                format!("{}/{}", skill_dir_name, rel_str)
            };

            zip.start_file(zip_path, options)
                .map_err(|e| e.to_string())?;
            let mut file = fs::File::open(entry.path()).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut zip).map_err(|e| e.to_string())?;
        }

        zip.finish().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn read_package_metadata(package_path: &PathBuf) -> Result<Option<Value>, String> {
        let file = fs::File::open(package_path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
        if let Ok(mut entry) = archive.by_name("skill-package.json") {
            let mut contents = String::new();
            entry.read_to_string(&mut contents).map_err(|e| e.to_string())?;
            let metadata: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
            return Ok(Some(metadata));
        }
        Ok(None)
    }

    pub fn extract_skill_package(package_path: &PathBuf, dest_dir: &PathBuf) -> Result<(), String> {
        Self::extract_skill_package_with_limit(package_path, dest_dir, MAX_PACKAGE_UNCOMPRESSED_SIZE)
    }

    pub fn extract_skill_package_with_limit(
        package_path: &PathBuf,
        dest_dir: &PathBuf,
        max_uncompressed_size: u64
    ) -> Result<(), String> {
        let file = fs::File::open(package_path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
        let mut total_size: u64 = 0;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let entry_size = file.size();
            if entry_size > max_uncompressed_size {
                return Err("Package entry too large".to_string());
            }
            total_size = total_size.saturating_add(entry_size);
            if total_size > max_uncompressed_size {
                return Err("Package too large".to_string());
            }
            let Some(enclosed) = file.enclosed_name() else {
                return Err("Package contains invalid paths".to_string());
            };
            if enclosed.is_absolute()
                || enclosed.has_root()
                || enclosed.components().any(|component| matches!(component, Component::Prefix(_)))
            {
                return Err("Package contains absolute paths".to_string());
            }
            let name = enclosed.to_string_lossy();
            if name == "skill-package.json" {
                continue;
            }
            if Self::should_skip_package_entry(&enclosed) {
                continue;
            }

            let out_path = dest_dir.join(enclosed);
            if file.name().ends_with('/') {
                fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            } else {
                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut outfile = fs::File::create(&out_path).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    }

    pub fn resolve_package_source_dir(
        temp_dir: &PathBuf,
        skill_dir_name: &Option<String>
    ) -> Result<PathBuf, String> {
        let source_dir_from_metadata = skill_dir_name
            .as_ref()
            .map(|name| temp_dir.join(name))
            .filter(|dir| dir.exists());
        let candidates = ImportService::collect_skill_dirs(temp_dir);

        if let Some(dir) = source_dir_from_metadata {
            Ok(dir)
        } else if candidates.len() == 1 {
            Ok(candidates[0].clone())
        } else if candidates.is_empty() {
            Err("Package does not contain SKILL.md".to_string())
        } else {
            Err("Package contains multiple skills; select a single skill package".to_string())
        }
    }
}
