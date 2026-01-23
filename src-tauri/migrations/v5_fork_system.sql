-- Migration v5: Fork/Remix System
-- 派生体系：支持 Skill 的 Fork 和 Remix 功能

-- 创建派生关系表
CREATE TABLE IF NOT EXISTS skill_forks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_skill_id TEXT NOT NULL,           -- 派生后的 Skill ID（路径哈希）
    child_skill_name TEXT NOT NULL,         -- 派生后的 Skill 名称
    child_skill_path TEXT NOT NULL,         -- 派生后的 Skill 完整路径
    parent_skill_id TEXT NOT NULL,          -- 父 Skill ID
    parent_skill_name TEXT NOT NULL,        -- 父 Skill 名称
    parent_skill_path TEXT,                 -- 父 Skill 路径（可能为空，如果来自市场）
    fork_type TEXT NOT NULL DEFAULT 'fork', -- 'fork' 或 'remix'
    fork_reason TEXT,                       -- 派生原因（用户输入）
    author TEXT,                            -- 派生者
    created_at INTEGER NOT NULL,            -- 创建时间（毫秒时间戳）

    -- 外键约束（确保引用的 Skill 存在）
    -- 注意：parent_skill 可能来自市场，不一定在本地
    FOREIGN KEY (child_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_skill_forks_child ON skill_forks(child_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_forks_parent ON skill_forks(parent_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_forks_type ON skill_forks(fork_type);
CREATE INDEX IF NOT EXISTS idx_skill_forks_created ON skill_forks(created_at DESC);

-- 创建派生统计视图（方便查询）
CREATE VIEW IF NOT EXISTS skill_fork_stats AS
SELECT
    parent_skill_id,
    parent_skill_name,
    COUNT(*) as fork_count,
    COUNT(CASE WHEN fork_type = 'fork' THEN 1 END) as fork_count_only,
    COUNT(CASE WHEN fork_type = 'remix' THEN 1 END) as remix_count,
    MAX(created_at) as last_forked_at
FROM skill_forks
GROUP BY parent_skill_id, parent_skill_name;

-- 创建谱系深度检查函数的辅助表（递归查询优化）
-- 存储每个 Skill 的谱系深度
CREATE TABLE IF NOT EXISTS skill_lineage_depth (
    skill_id TEXT PRIMARY KEY,
    depth INTEGER NOT NULL DEFAULT 0,      -- 0 = 原创，1-5 = 派生层级
    root_skill_id TEXT,                    -- 根 Skill ID（最初的创始者）
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lineage_depth ON skill_lineage_depth(depth);
CREATE INDEX IF NOT EXISTS idx_lineage_root ON skill_lineage_depth(root_skill_id);
