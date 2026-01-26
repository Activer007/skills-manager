CREATE TABLE IF NOT EXISTS marketplace_skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT,
    description TEXT,
    github_url TEXT,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT 0,
    tags TEXT, -- JSON array of strings
    security_score INTEGER,
    compatibility TEXT, -- JSON object
    data TEXT -- Full JSON blob
);

CREATE INDEX IF NOT EXISTS idx_marketplace_skills_name ON marketplace_skills(name);
CREATE INDEX IF NOT EXISTS idx_marketplace_skills_stars ON marketplace_skills(stars);
CREATE INDEX IF NOT EXISTS idx_marketplace_skills_updated_at ON marketplace_skills(updated_at);
