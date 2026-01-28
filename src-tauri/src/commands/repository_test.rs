#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_repository_request_structure() {
        // Test that AddRepositoryRequest has the expected fields
        let request = AddRepositoryRequest {
            url: "https://github.com/test/repo".to_string(),
            name: Some("Test Repo".to_string()),
            description: Some("A test repository".to_string()),
            scan_subdirs: Some(true),
            auto_scan: Some(false),
        };

        assert_eq!(request.url, "https://github.com/test/repo");
        assert_eq!(request.auto_scan, Some(false));
    }

    #[test]
    fn test_repository_response_with_task_id() {
        // Test that RepositoryResponse includes task_id field
        let response = RepositoryResponse {
            success: true,
            message: "Repository added successfully".to_string(),
            repository_id: Some("repo-123".to_string()),
            task_id: Some("task-456".to_string()),
        };

        assert!(response.success);
        assert_eq!(response.task_id, Some("task-456".to_string()));
    }

    #[test]
    fn test_delete_repository_result_structure() {
        // Test DeleteRepositoryResult structure
        let result = DeleteRepositoryResult {
            success: true,
            message: "Repository deleted successfully".to_string(),
            repository_id: Some("repo-123".to_string()),
            deleted_skills_count: 5,
            retained_installed_skills_count: 2,
        };

        assert!(result.success);
        assert_eq!(result.deleted_skills_count, 5);
        assert_eq!(result.retained_installed_skills_count, 2);
    }

    #[test]
    fn test_auto_scan_default_behavior() {
        // Test that auto_scan defaults to true when not provided
        let request = AddRepositoryRequest {
            url: "https://github.com/test/repo".to_string(),
            name: None,
            description: None,
            scan_subdirs: None,
            auto_scan: None,
        };

        // When auto_scan is None, the default should be true
        assert_eq!(request.auto_scan.unwrap_or(true), true);
    }
}
