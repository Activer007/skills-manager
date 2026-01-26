-- Migration v8: Create publish_history table for tracking Skill publishing
-- This table tracks all publish attempts and their outcomes

CREATE TABLE IF NOT EXISTS publish_history (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    version TEXT NOT NULL,
    published_at INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'success', 'failed'
    error_message TEXT,
    repository_url TEXT,
    tag_name TEXT,
    commit_sha TEXT,
    release_url TEXT,
    metadata TEXT -- JSON blob with additional publish metadata
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_publish_history_skill_id ON publish_history(skill_id);
CREATE INDEX IF NOT EXISTS idx_publish_history_status ON publish_history(status);
CREATE INDEX IF NOT EXISTS idx_publish_history_published_at ON publish_history(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_history_repository_url ON publish_history(repository_url);
