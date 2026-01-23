-- Migration v6: Collections System
-- 合集系统：允许用户创建和管理 Skill 合集

-- 1. 合集主表
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    author TEXT,
    icon TEXT,                    -- 图标标识
    color TEXT,                   -- 主题色
    is_public BOOLEAN DEFAULT 0,  -- 是否公开
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. 合集条目表
CREATE TABLE IF NOT EXISTS collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,       -- 关联的 Skill ID
    skill_name TEXT NOT NULL,     -- 缓存的 Skill 名称
    skill_path TEXT,              -- Skill 路径（本地）
    skill_identifier TEXT,        -- 唯一标识符（用于跨设备识别）
    added_at INTEGER NOT NULL,
    note TEXT,                    -- 用户备注
    sort_order INTEGER DEFAULT 0, -- 排序权重

    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_collections_created ON collections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_coll_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_skill_id ON collection_items(skill_id);
