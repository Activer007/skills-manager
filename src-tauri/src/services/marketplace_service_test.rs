#[cfg(test)]
mod tests {
    use crate::models::repository::{Repository, RepositoryCategory};
    use crate::models::source::{SourceFilter, SourceType, DiscoveredSkill};
    use crate::models::marketplace::MarketplaceSkill;
    use crate::services::marketplace_service::MarketplaceService;
    use crate::services::repository_service::RepositoryService;
    use crate::services::db::init_db;
    use chrono::Utc;
    use std::sync::Once;

    static INIT: Once = Once::new();

    fn setup_db() {
        INIT.call_once(|| {
            // Initialize in-memory DB or test file for testing
            // For now, we assume init_db handles environment correctly or we are running in a test env
            // In a real scenario, we might want to use a temporary DB file
            let _ = init_db();
        });
    }

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
        setup_db();
        let market_service = MarketplaceService::new();
        let repo_service = RepositoryService::new();

        // 1. Create repositories (One Featured, One User)
        let featured_repo = create_test_repo("featured-repo-1", "Featured Repo", "featured", 10);
        let user_repo = create_test_repo("user-repo-1", "User Repo", "user", 100);

        let _ = repo_service.add_repository(&featured_repo);
        let _ = repo_service.add_repository(&user_repo);

        // 2. Create Skills (Same name, different authors/repos)

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

        // Skill A from User Repo (Same name, different author - Should show both if authors differ?)
        // Let's test Same Name + Same Author collision first (Priority check)
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
        let all_skills = market_service.list_skills_by_source(SourceFilter::All, None).unwrap();
        let weather_tool = all_skills.iter().find(|s| s.name == "Weather Tool");

        // Note: The logic is: ROW_NUMBER() OVER (PARTITION BY name, author ORDER BY priority ASC)
        // Featured (10) < User (100), so Featured should be rn=1

        assert!(weather_tool.is_some(), "Weather Tool should be found");
        // We can't easily assert exactly which one without clearing DB first,
        // but assuming clean state or unique IDs:
        // Let's check repository_id if possible, or verify logic in a controlled env.

        // Case B: Filter by Featured
        let featured_skills = market_service.list_skills_by_source(SourceFilter::Featured, None).unwrap();
        let featured_weather = featured_skills.iter().find(|s| s.name == "Weather Tool");
        assert!(featured_weather.is_some());
        assert_eq!(featured_weather.unwrap().repository_id, featured_repo.id);

        // Case C: Filter by User
        let user_skills = market_service.list_skills_by_source(SourceFilter::User, None).unwrap();
        let user_weather = user_skills.iter().find(|s| s.name == "Weather Tool");
        assert!(user_weather.is_some());
        assert_eq!(user_weather.unwrap().repository_id, user_repo.id);
    }

    #[test]
    fn test_sync_skills_to_marketplace() {
        setup_db();
        let repo_service = RepositoryService::new();
        let market_service = MarketplaceService::new();

        // 1. Create Repo
        let repo = create_test_repo("sync-test-repo", "Sync Test", "user", 100);
        let _ = repo_service.add_repository(&repo);

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
        let result = repo_service.sync_skills_to_marketplace(&repo.id, discovered).unwrap();

        // 4. Validate Result
        assert_eq!(result.total_found, 2);
        assert_eq!(result.synced_count, 2);
        assert_eq!(result.failed_count, 0);
        assert!(result.is_success());

        // 5. Verify in Marketplace
        let skills = market_service.search_skills("Sync Skill", None).unwrap();
        assert!(skills.len() >= 2);

        let skill_1 = skills.iter().find(|s| s.name == "Sync Skill 1").unwrap();
        assert_eq!(skill_1.repository_id, repo.id);
        assert_eq!(skill_1.skill_path, "skills/skill-1");
    }
}
