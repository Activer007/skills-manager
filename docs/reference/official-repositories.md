# 官方仓库配置说明

## claude-ai 官方仓库

**仓库地址**: https://github.com/anthropics/skills

**说明**:
- claude-ai 官方维护的 Skills 仓库
- 持续更新和增加新的 Skills
- 在 Marketplace 中标记为"官方"类别
- 使用紫色盾牌图标 🔒 显示

## 技术实现

### 后端配置

在扫描 `https://github.com/anthropics/skills` 时，应设置：

```rust
source_type = SourceType::Official;
priority = 5;  // 最高优先级
```

### 前端显示

Marketplace 筛选面板中：
- **官方** (Official) 🔒 - claude-ai 官方仓库
- **精选仓库** (Featured) ⭐ - 其他高质量推荐仓库
- **其他** (Others) 👤 - 用户自定义仓库

## Priority 规则

| 来源类型 | Priority | 说明 |
|---------|----------|------|
| official | 5 | claude-ai 官方仓库（最高优先级） |
| featured | 10 | 精选仓库 |
| user | 100 | 用户自定义仓库 |

数值越小，优先级越高。

## 后续扩展

如需添加新的官方仓库，请更新：

1. **后端**: 仓库来源判断逻辑
2. **文档**: `docs/official-repositories.md`
3. **前端类型注释**: `src/types/index.ts`
