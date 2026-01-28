-- ============================================================================
-- Featured Repositories Seeding Script
-- ============================================================================
--
-- Purpose: Manually inject featured repositories into the database
-- Usage:   sqlite3 ~/.claude/skills-manager.db < seed-featured-repos.sql
--
-- This script is provided for development and testing purposes.
-- In production, the featured_repository_seeder.rs module handles this automatically.
--
-- ============================================================================

-- Insert featured repositories
-- Note: UUIDs are generated randomly - these are examples
INSERT OR IGNORE INTO repositories (
    id,
    url,
    name,
    description,
    enabled,
    scan_subdirs,
    added_at,
    last_scanned,
    cache_path,
    cached_commit_sha,
    featured,
    category,
    source_type,
    priority,
    scan_status
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'https://github.com/anthropics/skills',
    'anthropics',
    'Anthropic 官方 Claude Code 技能仓库',
    1,
    1,
    strftime('%s', 'now') * 1000,
    NULL,
    NULL,
    NULL,
    1,
    'official',
    'featured',
    10,
    'pending'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'https://github.com/obra/superpowers',
    'superpowers',
    '专为 AI 编程助手设计的全自动开发工作流',
    1,
    1,
    strftime('%s', 'now') * 1000,
    NULL,
    NULL,
    NULL,
    1,
    'official',
    'featured',
    10,
    'pending'
);

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify the injection was successful
SELECT
    id,
    name,
    source_type,
    priority,
    enabled,
    featured,
    category,
    scan_status
FROM repositories
WHERE source_type = 'featured'
ORDER BY priority ASC, name ASC;

-- Expected output:
-- id                                  | name       | source_type | priority | enabled | featured | category  | scan_status
-- ------------------------------------|------------|-------------|----------|---------|----------|-----------|------------
-- 550e8400-e29b-41d4-a716-446655440001 | anthropics  | featured    | 10       | 1       | 1        | official  | pending
-- 550e8400-e29b-41d4-a716-446655440002 | superpowers | featured    | 10       | 1       | 1        | official  | pending

-- ============================================================================
-- Troubleshooting
-- ============================================================================

-- Check if repositories already exist
SELECT COUNT(*) as featured_count FROM repositories WHERE source_type = 'featured';

-- Clean up (use with caution!)
-- DELETE FROM repositories WHERE source_type = 'featured';

-- ============================================================================
-- Notes
-- ============================================================================

-- 1. The `INSERT OR IGNORE` statement ensures idempotency - running this
--    script multiple times won't create duplicate entries.
--
-- 2. UUIDs are randomly generated. In production, the Rust seeder uses
--    uuid::Uuid::new_v4() to generate unique IDs.
--
-- 3. Timestamps are in milliseconds since Unix epoch (JavaScript/SQLite standard).
--
-- 4. The featured flag is set to 1 (true) for backward compatibility with
--    older versions of the application.
--
-- 5. source_type = 'featured' and priority = 10 are the new fields introduced
--    in the v2.1 database refactor.
--
-- ============================================================================
