#[cfg(test)]
mod tests {
    use crate::models::repository::{Repository, RepositoryCategory};
    use crate::models::source::{SourceFilter, SourceType, DiscoveredSkill};
    use crate::models::marketplace::MarketplaceSkill;
    use crate::services::marketplace_service::MarketplaceService;
    use crate::services::repository_service::RepositoryService;
    use crate::services::test_helper::setup_test_db;
    use chrono::Utc;

    // Helper to create a test repository
    fn create_test_repo(id: &str, name: &str, source_type: &str, priority: i32) -> Repository {
        Repository {
            id: id.to_string(),
            url: format!("https://github.com/test/{}", id),
            name: name.to_string(),
            description: Some("Test Repo".to_string()),
            source_type: source_type.to_string(),
            priority,
            scan_status: "pending".to_string(),
            etag: None,
            enabled: true,
            scan_subdirs: false,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: source_type == "featured",
            category: if source_type == "featured" { RepositoryCategory::Official } else { RepositoryCategory::Custom },
        }
    }

    #[test]
    fn test_upsert_and_list_by_source() {
        // Setup isolated test database
        let _db_guard = setup_test_db().expect("Failed to setup test database");

        let market_service = MarketplaceService::new();
        let repo_service = RepositoryService::new();

        // 1. Create repositories (One Featured, One User)
        let featured_repo = create_test_repo("featured-repo-1", "Featured Repo", "featured", 10);
        let user_repo = create_test_repo("user-repo-1", "User Repo", "user", 100);

        repo_service.add_repository(&featured_repo).expect("Failed to add featured repo");
        repo_service.add_repository(&user_repo).expect("Failed to add user repo");

        // 2. Create Skills (Same name, same author - priority deduplication test)

        // Skill A from Featured Repo
        let skill_a_featured = MarketplaceSkill {
            id: "featured-repo-1_skill_a_hash".to_string(),
            name: "Weather Tool".to_string(),
            author: Some("Anthropic".to_string()),
            description: Some("Official Weather Tool".to_string()),
            skill_path: "skills/weather".to_string(),
            repository_id: featured_repo.id.clone(),
            github_url: None,
            version: Some("1.0.0".to_string()),
            stars: 100,
            forks: 10,
            updated_at: Utc::now().timestamp_millis(),
            tags: Some("[\"weather\"]".to_string()),
            security_score: Some(90),
            compatibility: None,
            config_schema: None,
            discovered_at: Utc::now().timestamp_millis(),
            synced_at: Utc::now().timestamp_millis(),
            data: None,
        };

        // Skill A from User Repo (Same name, same author - Priority check)
        let skill_a_user = MarketplaceSkill {
            id: "user-repo-1_skill_a_hash".to_string(),
            name: "Weather Tool".to_string(),
            author: Some("Anthropic".to_string()), // SAME Author
            description: Some("User Fork of Weather Tool".to_string()),
            skill_path: "skills/weather-fork".to_string(),
            repository_id: user_repo.id.clone(),
            github_url: None,
            version: Some("1.0.1".to_string()),
            stars: 5,
            forks: 0,
            updated_at: Utc::now().timestamp_millis(),
            tags: Some("[\"weather\"]".to_string()),
            security_score: Some(80),
            compatibility: None,
            config_schema: None,
            discovered_at: Utc::now().timestamp_millis(),
            synced_at: Utc::now().timestamp_millis(),
            data: None,
        };

        market_service.upsert_skill(&skill_a_featured).expect("Failed to upsert featured skill");
        market_service.upsert_skill(&skill_a_user).expect("Failed to upsert user skill");

        // 3. Test Filtering

        // Case A: List All - Should prioritize Featured (Priority 10) over User (Priority 100) due to same Name+Author
        let all_skills = market_service.list_skills_by_source(SourceFilter::All, None)
            .expect("Failed to list all skills");
        let weather_tool = all_skills.iter().find(|s| s.name == "Weather Tool");

        // Note: The logic is: ROW_NUMBER() OVER (PARTITION BY name, author ORDER BY priority ASC)
        // Featured (10) < User (100), so Featured should be rn=1
        assert!(weather_tool.is_some(), "Weather Tool should be found");
        assert_eq!(
            weather_tool.unwrap().repository_id,
            featured_repo.id,
            "All filter should prioritize Featured repository (lower priority number)"
        );

        // Case B: Filter by Featured
        let featured_skills = market_service.list_skills_by_source(SourceFilter::Featured, None)
            .expect("Failed to list featured skills");
        let featured_weather = featured_skills.iter().find(|s| s.name == "Weather Tool");
        assert!(featured_weather.is_some(), "Weather Tool should be found in Featured filter");
        assert_eq!(featured_weather.unwrap().repository_id, featured_repo.id);

        // Case C: Filter by User
        let user_skills = market_service.list_skills_by_source(SourceFilter::User, None)
            .expect("Failed to list user skills");
        let user_weather = user_skills.iter().find(|s| s.name == "Weather Tool");
        assert!(user_weather.is_some(), "Weather Tool should be found in User filter");
        assert_eq!(user_weather.unwrap().repository_id, user_repo.id);

        // Database automatically cleaned up when _db_guard is dropped
    }

    #[test]
    fn test_sync_skills_to_marketplace() {
        // Setup isolated test database
        let _db_guard = setup_test_db().expect("Failed to setup test database");

        let repo_service = RepositoryService::new();
        let market_service = MarketplaceService::new();

        // 1. Create Repo
        let repo = create_test_repo("sync-test-repo", "Sync Test", "user", 100);
        repo_service.add_repository(&repo).expect("Failed to add repository");

        // 2. Prepare Discovered Skills
        let discovered = vec![
            DiscoveredSkill {
                name: "Sync Skill 1".to_string(),
                description: Some("Desc 1".to_string()),
                author: Some("Author 1".to_string()),
                version: Some("0.1.0".to_string()),
                path: "skills/skill-1".to_string(),
                tags: Some(vec!["tag1".to_string()]),
            },
            DiscoveredSkill {
                name: "Sync Skill 2".to_string(),
                description: None,
                author: None,
                version: None,
                path: "skills/skill-2".to_string(),
                tags: None,
            }
        ];

        // 3. Run Sync
        let result = repo_service.sync_skills_to_marketplace(&repo.id, discovered)
            .expect("Failed to sync skills to marketplace");

        // 4. Validate Result
        assert_eq!(result.total_found, 2, "Should find 2 skills");
        assert_eq!(result.synced_count, 2, "Should sync 2 skills");
        assert_eq!(result.failed_count, 0, "Should have 0 failures");
        assert!(result.is_success(), "Sync should be successful");
        assert!(!result.has_errors(), "Should have no errors");

        // 5. Verify in Marketplace
        let skills = market_service.search_skills("Sync Skill", None)
            .expect("Failed to search skills");
        assert!(skills.len() >= 2, "Should find at least 2 skills");

        let skill_1 = skills.iter()
            .find(|s| s.name == "Sync Skill 1")
            .expect("Should find Sync Skill 1");
        assert_eq!(skill_1.repository_id, repo.id, "Skill should belong to test repo");
        assert_eq!(skill_1.skill_path, "skills/skill-1", "Skill path should match");

        // Database automatically cleaned up when _db_guard is dropped
    }

    #[test]
    fn test_empty_database() {
        // Setup isolated test database
        let _db_guard = setup_test_db().expect("Failed to setup test database");

        let market_service = MarketplaceService::new();

        // Test empty results
        let all_skills = market_service.list_skills_by_source(SourceFilter::All, None)
            .expect("Failed to list skills");
        assert_eq!(all_skills.len(), 0, "Should have no skills in empty database");

        let search_results = market_service.search_skills("nonexistent", None)
            .expect("Failed to search skills");
        assert_eq!(search_results.len(), 0, "Should find no skills for nonexistent query");

        // Database automatically cleaned up when _db_guard is dropped
    }

    #[test]
    fn test_multiple_authors_no_dedup() {
        // Setup isolated test database
        let _db_guard = setup_test_db().expect("Failed to setup test database");

        let market_service = MarketplaceService::new();
        let repo_service = RepositoryService::new();

        // Create repository
        let repo = create_test_repo("multi-author-repo", "Multi Author Repo", "featured", 10);
        repo_service.add_repository(&repo).expect("Failed to add repository");

        // Create skills with same name but different authors (should NOT be deduplicated)
        let skill_1 = MarketplaceSkill {
            id: "skill_1_hash".to_string(),
            name: "Common Name".to_string(),
            author: Some("Alice".to_string()),
            description: Some("By Alice".to_string()),
            skill_path: "skills/alice-common".to_string(),
            repository_id: repo.id.clone(),
            github_url: None,
            version: Some("1.0.0".to_string()),
            stars: 50,
            forks: 5,
            updated_at: Utc::now().timestamp_millis(),
            tags: None,
            security_score: None,
            compatibility: None,
            config_schema: None,
            discovered_at: Utc::now().timestamp_millis(),
            synced_at: Utc::now().timestamp_millis(),
            data: None,
        };

        let skill_2 = MarketplaceSkill {
            id: "skill_2_hash".to_string(),
            name: "Common Name".to_string(),
            author: Some("Bob".to_string()), // Different author
            description: Some("By Bob".to_string()),
            skill_path: "skills/bob-common".to_string(),
            repository_id: repo.id.clone(),
            github_url: None,
            version: Some("1.0.0".to_string()),
            stars: 30,
            forks: 3,
            updated_at: Utc::now().timestamp_millis(),
            tags: None,
            security_score: None,
            compatibility: None,
            config_schema: None,
            discovered_at: Utc::now().timestamp_millis(),
            synced_at: Utc::now().timestamp_millis(),
            data: None,
        };

        market_service.upsert_skill(&skill_1).expect("Failed to upsert skill 1");
        market_service.upsert_skill(&skill_2).expect("Failed to upsert skill 2");

        // Both skills should appear (different authors)
        let all_skills = market_service.list_skills_by_source(SourceFilter::All, None)
            .expect("Failed to list skills");
        let common_skills: Vec<_> = all_skills.iter()
            .filter(|s| s.name == "Common Name")
            .collect();

        assert_eq!(common_skills.len(), 2, "Both skills should appear (different authors)");

        // Database automatically cleaned up when _db_guard is dropped
    }
}
