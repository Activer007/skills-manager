# Skill Master 用户场景和流程文档

> **版本**: v1.0 | **最后更新**: 2025-01-29 | **维护者**: Skill Master Team

## 📚 文档概述

本文档体系全面记录了 Skill Master 的**用户使用场景**、**功能流程**、**数据流转**和**错误处理**，帮助开发者、产品经理和测试人员理解产品全貌。

### 文档目标

- ✅ **完整性**: 覆盖所有 19 个核心场景和 5 个用户旅程
- ✅ **准确性**: 所有场景与实际代码实现一致
- ✅ **可读性**: 新用户能理解 80% 的内容
- ✅ **可维护性**: 模板化设计，易于更新

### 适用对象

- 🧑‍💻 **开发者**: 理解功能实现逻辑和代码架构
- 🧪 **测试人员**: 基于场景设计测试用例
- 📝 **文档维护者**: 更新和扩展场景文档
- 🎨 **产品经理**: 理解用户旅程和交互流程

---

## 🗂️ 文档导航

### 核心文档（5 个）

| 文档 | 描述 | 阅读时间 | 更新频率 |
|------|------|---------|---------|
| **[00-getting-started.md](./00-getting-started.md)** | 5 分钟快速了解 Skill Master | 5 分钟 | 每版本 |
| **[01-user-journeys.md](./01-user-journeys.md)** | 5 个核心用户旅程场景 | 30 分钟 | 每版本 |
| **[02-feature-flows.md](./02-feature-flows.md)** | 19 个功能流程详细文档 | 2 小时 | 每版本 |
| **[03-data-flows.md](./03-data-flows.md)** | 3 个核心数据流和状态管理 | 45 分钟 | 每版本 |
| **[04-error-handling.md](./04-error-handling.md)** | 错误处理和边界情况 | 30 分钟 | 每版本 |
| **[05-future-scenarios.md](./05-future-scenarios.md)** | 未来规划和待实现场景 | 20 分钟 | 每季度 |

### 流程图目录（27 个）

#### 用户旅程图（5 个）
**目录**: [`docs/diagrams/user-journeys/`](../diagrams/user-journeys/)

1. [new-user-onboarding.mermaid](../diagrams/user-journeys/new-user-onboarding.mermaid) - 新用户入门
2. [daily-user-management.mermaid](../diagrams/user-journeys/daily-user-management.mermaid) - 日常管理
3. [advanced-user-workflow.mermaid](../diagrams/user-journeys/advanced-user-workflow.mermaid) - 高级工作流
4. [creator-publish-share.mermaid](../diagrams/user-journeys/creator-publish-share.mermaid) - 创作发布
5. [admin-system-maintenance.mermaid](../diagrams/user-journeys/admin-system-maintenance.mermaid) - 系统维护

#### 功能流程图（19 个）
**目录**: [`docs/diagrams/feature-flows/`](../diagrams/feature-flows/)

**Skill 管理模块**（7 个）:
1. [import-from-github.mermaid](../diagrams/feature-flows/skill-management/import-from-github.mermaid) - 从 GitHub 导入
2. [import-from-local.mermaid](../diagrams/feature-flows/skill-management/import-from-local.mermaid) - 从本地导入
3. [import-from-package.mermaid](../diagrams/feature-flows/skill-management/import-from-package.mermaid) - 从包导入
4. [uninstall-skill.mermaid](../diagrams/feature-flows/skill-management/uninstall-skill.mermaid) - 卸载 Skill
5. [enable-disable-skill.mermaid](../diagrams/feature-flows/skill-management/enable-disable-skill.mermaid) - 启用/禁用
6. [configure-skill-params.mermaid](../diagrams/feature-flows/skill-management/configure-skill-params.mermaid) - 配置参数
7. [view-skill-details.mermaid](../diagrams/feature-flows/skill-management/view-skill-details.mermaid) - 查看详情

**市场与来源模块**（4 个）:
8. [browse-marketplace.mermaid](../diagrams/feature-flows/marketplace-source/browse-marketplace.mermaid) - 浏览市场
9. [add-custom-source.mermaid](../diagrams/feature-flows/marketplace-source/add-custom-source.mermaid) - 添加来源
10. [manage-sources.mermaid](../diagrams/feature-flows/marketplace-source/manage-sources.mermaid) - 管理来源
11. [filter-by-source.mermaid](../diagrams/feature-flows/marketplace-source/filter-by-source.mermaid) - 按来源筛选

**分享与社区模块**（6 个）:
12. [share-skill.mermaid](../diagrams/feature-flows/share-community/share-skill.mermaid) - 分享 Skill（4种方式）
13. [import-from-share-link.mermaid](../diagrams/feature-flows/share-community/import-from-share-link.mermaid) - 从分享链接导入
14. [import-from-share-image.mermaid](../diagrams/feature-flows/share-community/import-from-share-image.mermaid) - 从分享图片导入
15. [fork-remix-skill.mermaid](../diagrams/feature-flows/share-community/fork-remix-skill.mermaid) - Fork/Remix
16. [manage-collections.mermaid](../diagrams/feature-flows/share-community/manage-collections.mermaid) - 管理合集
17. [publish-to-market.mermaid](../diagrams/feature-flows/share-community/publish-to-market.mermaid) - 发布到市场

**其他模块**（2 个）:
18. [view-security-report.mermaid](../diagrams/feature-flows/other-modules/view-security-report.mermaid) - 安全扫描报告
19. [view-task-center.mermaid](../diagrams/feature-flows/other-modules/view-task-center.mermaid) - 任务中心

#### 数据流图（3 个）
**目录**: [`docs/diagrams/data-flows/`](../diagrams/data-flows/)

1. [repository-to-market-data-flow.mermaid](../diagrams/data-flows/repository-to-market-data-flow.mermaid) - 仓库→市场数据流
2. [security-scan-flow.mermaid](../diagrams/data-flows/security-scan-flow.mermaid) - 安全扫描流程
3. [task-management-flow.mermaid](../diagrams/data-flows/task-management-flow.mermaid) - 任务管理流程

### 模板文件（2 个）
**目录**: [`docs/templates/`](../templates/)

1. [scenario-template.md](../templates/scenario-template.md) - 标准场景模板
2. [issue-template.md](../templates/issue-template.md) - 问题追踪模板

---

## 🚀 快速开始

### 第一次使用？

推荐阅读顺序：

1. **[00-getting-started.md](./00-getting-started.md)** - 5 分钟了解 Skill Master 的核心功能
2. **[01-user-journeys.md](./01-user-journeys.md)** - 理解 5 个核心用户旅程
3. **[02-feature-flows.md](./02-feature-flows.md)** - 深入了解 19 个功能流程

### 开发者？

重点关注：

1. **[03-data-flows.md](./03-data-flows.md)** - 理解 TanStack Query 缓存和 Tauri Events
2. **[CLAUDE.md](../../CLAUDE.md)** - 查看完整 API 文档和架构说明
3. **[rebuild-task.md](../../rebuild-task.md)** - 了解仓库与市场重构规划

### 测试人员？

重点关注：

1. **[02-feature-flows.md](./02-feature-flows.md)** - 基于场景设计测试用例
2. **[04-error-handling.md](./04-error-handling.md)** - 了解所有错误处理和边界情况
3. **[CURRENT_STATUS.md](../../CURRENT_STATUS.md)** - 查看当前功能完成度

---

## 👥 用户角色定义

Skill Master 的 5 个用户角色：

| 角色 | 技能水平 | 使用频率 | 核心需求 | 典型场景 |
|------|---------|---------|---------|---------|
| **新用户** | 初级 | 低频探索 | 快速上手，发现价值 | 浏览市场、安装 Skill |
| **普通用户** | 中级 | 高频使用 | 高效管理，稳定运行 | 启用/禁用 Skill、查看进度 |
| **高级用户** | 高级 | 中频配置 | 深度定制，批量操作 | 自定义来源、Fork Skill |
| **创作者** | 专家 | 高频创作 | 发布分享，获取反馈 | 发布 Skill、管理合集 |
| **管理员** | 专家 | 低频维护 | 系统管理，安全保障 | 查看安全报告、配置路径 |

---

## 📊 场景分类体系

### 按使用频率分类

#### 高频场景（每日使用）
1. 查看"我的 Skills"
2. 启用/禁用 Skill
3. 配置 Skill 参数
4. 查看任务中心进度
5. 浏览市场搜索 Skills

#### 中频场景（每周使用）
1. 从市场安装 Skill
2. 分享 Skill
3. 从分享链接安装
4. 管理合集
5. 查看 Dashboard 统计

#### 低频场景（每月使用）
1. 添加自定义来源
2. Fork/Remix Skill
3. 从 Skill 包导入
4. 配置项目路径
5. 查看创作者资料

### 按功能模块分类

#### Skill 管理模块（7 个场景）
- 从 GitHub 导入 Skill
- 从本地文件夹导入
- 从 Skill 包导入
- 卸载 Skill
- 启用/禁用 Skill
- 配置 Skill 参数
- 查看 Skill 详情

#### 市场与来源模块（4 个场景）
- 浏览和安装市场 Skills
- 添加自定义 GitHub 来源
- 管理来源
- 按来源筛选 Skills

#### 分享与社区模块（6 个场景）
- 分享 Skill（4种方式）
- 从分享链接安装
- 从分享图片导入
- Fork/Remix Skill
- 创建和管理合集
- 发布 Skill 到市场

#### 安全与质量模块（3 个场景）
- 查看安全扫描报告
- 管理白名单
- 查看扫描历史

#### 系统配置模块（3 个场景）
- 配置项目路径
- 查看 Dashboard 统计
- 查看任务中心

---

## 📈 当前状态（v2.6.1）

### 实现完成度

| 模块 | 场景数 | 已实现 | 完成度 | 状态 |
|------|-------|--------|--------|------|
| **Skill 管理** | 7 | 7 | 100% | ✅ 完成 |
| **市场与来源** | 4 | 4 | 100% | ✅ 完成 |
| **分享与社区** | 6 | 6 | 100% | ✅ 完成 |
| **安全与质量** | 3 | 3 | 100% | ✅ 完成 |
| **系统配置** | 3 | 3 | 100% | ✅ 完成 |
| **总计** | **23** | **23** | **100%** | ✅ 完成 |

### 已知问题（2025-01-29）

#### 🔴 P0 - 阻断性问题（立即修复）
- **ISSUE-001**: Dashboard 页面未启用（功能完整，仅缺路由配置）
  - 修复难度: ⭐ 极简单（5分钟）
  - 相关文件: `src/App.tsx`, `src/pages/Dashboard.tsx`

#### 🟡 P1 - 严重影响（本周修复）
- **ISSUE-002**: 合集拖拽排序未完成
  - UI 已支持（GripVertical 图标），拖拽逻辑未实现
  - 建议方案: 使用 `@dnd-kit/core`
- **ISSUE-003**: Token 配置引导缺失
  - GitHub API 限流问题，用户不知如何配置 Token
  - 建议方案: 添加配置向导
- **ISSUE-004**: 测试覆盖率不足
  - 仅有 5/13 个页面有测试（38%）
  - 缺失测试: Collections.tsx, Security.tsx, TaskCenter.tsx

#### 🟢 P2 - 中等影响（本月修复）
- **ISSUE-005**: CASCADE 删除与已安装 Skill 的矛盾
  - 删除仓库时级联删除已安装 Skills 的逻辑需优化
- **ISSUE-006**: Skill 详情页缺失
  - 当前仅 SlideOver，不支持直接链接访问
  - 建议方案: 添加 `/my-skills/:skillId` 路由
- **ISSUE-007**: Changelog 功能未实现
  - 当前为硬编码测试数据，未从 Git 仓库获取真实历史

> **详细信息**: 参见 [`04-error-handling.md`](./04-error-handling.md)

---

## 🔗 相关文档

### 项目核心文档
- **[CLAUDE.md](../../CLAUDE.md)** - 项目架构、API 文档、开发规范
- **[rebuild-task.md](../../rebuild-task.md)** - 仓库与市场重构规划（阶段1-10）
- **[CURRENT_STATUS.md](../../CURRENT_STATUS.md)** - 当前功能状态清单（v2.6.1）
- **[prd-v2.md](../../prd-v2.md)** - 分享功能产品设计（Share-First PRD）
- **[TASK-ROADMAP.md](../../TASK-ROADMAP.md)** - 六阶段演进路线图

### 测试文档
- **[测试用例](../../src/)** - 193 个单元测试（31 个测试文件）
- **[E2E 测试](../../src/)** - 85% 完成度

### 历史文档
- **[REBUILD-SCENARIOS.md](../../REBUILD-SCENARIOS.md)** - 部分场景描述（6个场景）
- **[UI-ROADMAP.md](../../UI-ROADMAP.md)** - UI 演进路线图

---

## 📝 贡献指南

### 如何添加新场景

1. 复制 [`docs/templates/scenario-template.md`](../templates/scenario-template.md)
2. 填写所有必需字段（基本信息、触发条件、流程步骤等）
3. 创建对应的 Mermaid 流程图
4. 更新 [`02-feature-flows.md`](./02-feature-flows.md) 的场景清单
5. 更新本文档的"场景分类体系"部分

### 如何更新现有场景

1. 编辑对应的场景文档（在 `02-feature-flows.md` 中）
2. 更新"当前实现状态"部分
3. 检查流程图是否需要更新
4. 更新"最后验证日期"
5. 在变更历史中记录修改内容

### 如何报告问题

1. 复制 [`docs/templates/issue-template.md`](../templates/issue-template.md)
2. 填写问题详情（复现步骤、预期行为、实际行为等）
3. 添加到 [`04-error-handling.md`](./04-error-handling.md) 的"问题清单"部分
4. 分配问题 ID（ISSUE-[序号]）
5. 设置严重程度和优先级

---

## 🎯 成功指标

### 文档质量指标

- [ ] **覆盖率**: 19 个核心场景 100% 覆盖
- [ ] **准确性**: 所有场景与实际实现一致
- [ ] **完整性**: 每个场景包含所有必需字段
- [ ] **可读性**: 新用户能理解 80% 的内容
- [ ] **可维护性**: 模板化，易于更新

### 使用效果指标

- [ ] **开发者反馈**: 85% 的开发者认为文档有帮助
- [ ] **问题减少**: 用户反馈的问题减少 30%
- [ ] **上手时间**: 新开发者上手时间减少 50%
- [ ] **测试覆盖**: 基于场景文档的测试用例覆盖率 > 90%

---

## 📞 联系方式

如有问题或建议，请联系：

- **项目维护者**: Skill Master Team
- **GitHub Issues**: [项目 Issues 页面]
- **文档反馈**: [反馈渠道]

---

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2025-01-29 | v1.0 | 创建场景文档体系，完成 5 个核心文档 | Claude Code |

---

**文档版本**: v1.0
**最后更新**: 2025-01-29
**维护者**: Skill Master Team
