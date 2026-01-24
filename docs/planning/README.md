# Planning 目录说明

本目录包含长期规划、技术提案和未实施的功能设计。

## 📂 文档清单

| 文档 | 类型 | 创建日期 | 状态 | 说明 |
|------|------|---------|------|------|
| [NEXT_TOP_5_TASKS.md](NEXT_TOP_5_TASKS.md) | 历史任务 | 2026-01-14 | 🗄️ 已归档 | Phase 2 完成后的 Top 5 任务（大部分已完成） |
| [next-task.md](next-task.md) | 愿景规划 | 2026-01-14 | 📅 保留 | 下一代产品演进：From Manager to Nexus |
| [PHASE3_PLAN.md](PHASE3_PLAN.md) | 技术提案 | - | 📅 保留 | Phase 3: AI 智能评审系统规划 |
| [PHASE4_PLAN.md](PHASE4_PLAN.md) | 质量计划 | - | ✅ 部分完成 | Phase 4: 工程卓越计划（测试已覆盖 70%） |
| [task-upgrade.md](task-upgrade.md) | 技术提案 | 2026-01-14 | 📅 保留 | 评分系统升级：从规则到语义评审 |

## 📌 文档整理建议

### 🗄️ 建议归档

**`NEXT_TOP_5_TASKS.md`** 
- **原因**: 任务已完成（评分系统已集成、测试覆盖 70%、文档完善）
- **操作**: 移动到 `../archive/ NEXT_TOP_5_TASKS-v1.md`
- **时间**: 2026-01-24

### ✅ 保留文档

**`next-task.md`** - 长期愿景
- 四大核心功能拓展（MCP First、Skill Bundles、版本控制、Prompt Gym）
- 核心护城河分析（Trusted Runtime）
- 适合作为产品方向参考

**`PHASE3_PLAN.md`** - AI 智能评审
- 多 Agent 专家审计架构
- Rust 评分引擎作为事实提取器
- 未来 AI 功能的参考设计

**`task-upgrade.md`** - 评分系统升级
- 从规则校验到语义评审
- 三层评估流水线
- Skills Master 进化闭环

### 📝 建议更新或合并

**`PHASE4_PLAN.md`** - 工程卓越计划
- **当前状态**: 部分完成（测试覆盖率已达 70%，超过目标）
- **建议操作**: 
  1. 标记已完成项（✅ 测试覆盖率 70%）
  2. 更新待办项（E2E 测试、性能优化）
  3. 或直接归档，内容已过时

## 🔄 与主文档的关系

```
docs/
├── TASK-ROADMAP.md          # 总体路线图（Phase 1-6 已完成）
├── TASK-CURRENT.md          # 当前活跃任务（Share-First 生态）
├── UI-ROADMAP.md            # UI/UX 规划（Phase 1-6 已完成）
└── planning/                # 长期规划（未实施的功能）
    ├── PHASE3_PLAN.md       # → 对应 TASK-ROADMAP 的 Phase 3
    ├── PHASE4_PLAN.md       # → 对应 TASK-ROADMAP 的 Phase 4
    └── next-task.md         # → 未来愿景（Phase 7+）
```

## 📅 下一步行动

- [ ] 归档 `NEXT_TOP_5_TASKS.md` 到 `../archive/`
- [ ] 更新 `PHASE4_PLAN.md` 的完成状态
- [ ] 考虑合并 `task-upgrade.md` 到 `PHASE3_PLAN.md`

---

**最后更新**: 2026-01-24
