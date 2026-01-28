//! Featured Repository Seeder Tests
//!
//! This module contains unit tests for the featured repository seeder.

use crate::models::repository::{Repository, RepositoryCategory};
use crate::services::db;
use crate::services::featured_repository_seeder;
use crate::services::repository_service::RepositoryService;

/// Helper function to create an in-memory database for testing
fn setup_test_db() {
    // Initialize in-memory database
    db::DB_POOL.set(
        r2d2::Pool::new(r2d2_sqlite::SqliteConnectionManager::memory()).unwrap()
    ).expect("Failed to set test database pool");

    // Run migrations
    let conn = db::get_connection().unwrap();
    crate::services::db::migrate(&conn).unwrap();
}

/// Helper function to clean up test database
fn teardown_test_db() {
    // Reset the global pool for next test
    let _ = db::DB_POOL.take();
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test 1: First-time seeding should inject featured repositories
    #[test]
    fn test_seed_first_time() {
        setup_test_db();

        let result = featured_repository_seeder::seed_featured_repositories();
        assert!(result.is_ok(), "Seeding should succeed");

        let seeded = result.unwrap();
        assert!(seeded, "Should return true when repositories are seeded");

        // Verify repositories were injected
        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();
        assert!(!repos.is_empty(), "Should have at least one repository");

        // Verify metadata
        for repo in &repos {
            assert_eq!(repo.source_type, "featured", "Source type should be 'featured'");
            assert_eq!(repo.priority, 10, "Priority should be 10");
            assert_eq!(repo.enabled, true, "Should be enabled by default");
            assert_eq!(repo.scan_status, "pending", "Scan status should be 'pending'");
            assert_eq!(repo.featured, true, "Featured flag should be true");
        }

        teardown_test_db();
    }

    /// Test 2: Seeding when repositories already exist should skip (idempotency)
    #[test]
    fn test_seed_already_exists() {
        setup_test_db();

        // First seeding
        let result1 = featured_repository_seeder::seed_featured_repositories();
        assert!(result1.is_ok());
        let seeded1 = result1.unwrap();
        assert!(seeded1, "First seeding should succeed");

        let service = RepositoryService::new();
        let count_after_first = service.get_repository_count().unwrap();

        // Second seeding (should skip)
        let result2 = featured_repository_seeder::seed_featured_repositories();
        assert!(result2.is_ok());
        let seeded2 = result2.unwrap();
        assert!(!seeded2, "Second seeding should return false (already exists)");

        let count_after_second = service.get_repository_count().unwrap();
        assert_eq!(
            count_after_first, count_after_second,
            "Repository count should not change on second seeding"
        );

        teardown_test_db();
    }

    /// Test 3: Transaction rollback simulation (partial failure handling)
    #[test]
    fn test_seed_continues_on_partial_failure() {
        setup_test_db();

        // Manually insert a repository with a conflicting URL
        let service = RepositoryService::new();
        let existing_repo = Repository {
            id: uuid::Uuid::new_v4().to_string(),
            url: "https://github.com/anthropics/skills".to_string(), // Conflicting URL
            name: "existing-repo".to_string(),
            description: Some("Existing repository".to_string()),
            enabled: true,
            scan_subdirs: false,
            added_at: chrono::Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: false,
            category: RepositoryCategory::Custom,
            source_type: "user".to_string(),
            priority: 100,
            scan_status: "pending".to_string(),
            etag: None,
        };

        // Insert should succeed due to INSERT OR IGNORE
        let _ = service.add_repository(&existing_repo);

        // Seeding should still succeed (skip existing, add others)
        let result = featured_repository_seeder::seed_featured_repositories();
        assert!(result.is_ok(), "Seeding should succeed even with partial conflicts");

        // Verify at least some repositories were seeded
        let repos = service.list_repositories().unwrap();
        assert!(repos.len() >= 1, "Should have at least one repository");

        teardown_test_db();
    }

    /// Test 4: Verify priority is set correctly
    #[test]
    fn test_seed_priority_correct() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        for repo in &repos {
            assert_eq!(
                repo.priority, 10,
                "Featured repositories should have priority 10, got {} for {}",
                repo.priority, repo.name
            );
        }

        teardown_test_db();
    }

    /// Test 5: Verify source_type is set correctly
    #[test]
    fn test_seed_source_type_correct() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        for repo in &repos {
            assert_eq!(
                repo.source_type, "featured",
                "Source type should be 'featured', got '{}' for {}",
                repo.source_type, repo.name
            );
        }

        teardown_test_db();
    }

    /// Test 6: Verify enabled status is true
    #[test]
    fn test_seed_enabled_status() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        for repo in &repos {
            assert!(
                repo.enabled,
                "Repository should be enabled, got false for {}",
                repo.name
            );
        }

        teardown_test_db();
    }

    /// Test 7: Verify scan_status is pending
    #[test]
    fn test_seed_scan_status() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        for repo in &repos {
            assert_eq!(
                repo.scan_status, "pending",
                "Scan status should be 'pending', got '{}' for {}",
                repo.scan_status, repo.name
            );
        }

        teardown_test_db();
    }

    /// Test 8: Verify category mapping
    #[test]
    fn test_seed_category_mapping() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        // At least one repository should have Official or Community category
        let has_official_or_community = repos
            .iter()
            .any(|r| r.category == RepositoryCategory::Official || r.category == RepositoryCategory::Community);

        assert!(
            has_official_or_community,
            "Should have at least one Official or Community repository"
        );

        teardown_test_db();
    }

    /// Test 9: Verify featured flag is set
    #[test]
    fn test_seed_featured_flag() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        for repo in &repos {
            assert!(
                repo.featured,
                "Featured flag should be true, got false for {}",
                repo.name
            );
        }

        teardown_test_db();
    }

    /// Test 10: Verify URL uniqueness
    #[test]
    fn test_seed_url_uniqueness() {
        setup_test_db();

        let _ = featured_repository_seeder::seed_featured_repositories().unwrap();

        let service = RepositoryService::new();
        let repos = service.list_repositories().unwrap();

        // Collect all URLs
        let urls: Vec<&String> = repos.iter().map(|r| &r.url).collect();
        let unique_urls: std::collections::HashSet<_> = urls.iter().collect();

        assert_eq!(
            urls.len(),
            unique_urls.len(),
            "All repository URLs should be unique"
        );

        teardown_test_db();
    }
}
