# Skills Manager 项目任务清单与路线图

**文档版本**: 2.0
**更新日期**: 2026-01-14
**基于文档**: PHASE2_PROGRESS_REPORT, RUST_SCORER_PROGRESS_REPORT, check-result.md, ui-analysis.md

---

## 📋 执行摘要

**Skills Manager** 项目已成功完成前两个阶段的核心开发。
- **Phase 1 (紧急修复)**：解决了核心安全和 UX 问题。
- **Phase 2 (功能完善)**：建立了完整的安全规则库（80+ 规则）、智能缓存系统和历史记录数据库。
- **Rust 评分引擎**：作为 Phase 3 的先导，高性能 Rust 评分器（Sensor）也已 100% 就绪。

**当前状态**：项目正处于从"功能完备"向"智能与质量并重"转型的关键时期。接下来的工作将分为三条并行主线：**AI 智能升级**、**工程底座加固**、**生态体验焕新**。

---

## 🎯 总体策略：五阶段演进

### ✅ 第一阶段：紧急修复（已完成）
解决安全和用户体验的核心痛点（Sonner, 骨架屏, 基础安全警告）。

### ✅ 第二阶段：功能完善（已完成）
建立完整的安全防线（80+ 规则）、缓存系统和数据持久化。

### 🚀 第三阶段：智能升级（Current Focus）
**目标**：基于已完成的 Rust 评分器，接入 LLM 实现语义级评审。
- 🟢 **P3-1**: 多 Agent 专家审计架构
- 🟢 **P3-2**: Skills Master 自动进化引擎
- 🟢 **P3-3**: 语义分析与污点追踪

### 🛠️ 第四阶段：工程卓越（High Priority）
**目标**：偿还技术债务，提升代码质量（基于 `check-result.md` 审计）。
- 🟡 **P4-1**: 测试体系建设 (0% -> 60% 覆盖率)
- 🟡 **P4-2**: 类型安全与代码规范 (Remove `any`)
- 🟡 **P4-3**: 安全性加固 (输入验证, CSP)

### 🎨 第五阶段：生态与体验
**目标**：现代化 UI 和分发体系。
- ⚪ **P5-1**: Radix UI 迁移与动画升级
- ⚪ **P5-2**: 远程初始化与分发体系
- ⚪ **P5-3**: 移动端适配与 Web 预览

---

## 📊 任务优先级矩阵

| 优先级 | 任务 ID | 任务名称 | 领域 | 状态 | 依赖 |
|--------|---------|---------|------|------|------|
| 🟢 P0 | **P3-1** | 多 Agent 评分集成 | AI | 🚀 启动 | Rust Scorer (Done) |
| 🟡 P1 | **P4-1** | 单元/集成测试覆盖 | 工程 | ⏳ 待办 | - |
| 🟡 P1 | **P4-2** | 类型安全重构 | 工程 | ⏳ 待办 | - |
| 🟢 P2 | **P3-2** | Skills Master 进化 | AI | ⏳ 待办 | P3-1 |
| ⚪ P2 | **P5-1** | Radix UI 迁移 | UI | ⏳ 待办 | - |
| ⚪ P3 | **P5-2** | 远程分发体系 | Ops | ⏳ 待办 | - |

---

## ✅ 已完成任务回顾 (Phase 1 & 2)

### M1: 安全与体验基础 (v1.3.0)
- [x] **安全扫描集成**: 移植 Agent Skills Guard 引擎，实现安装拦截。
- [x] **UI/UX 改进**: 集成 Sonner Toast，添加骨架屏，优化错误提示。
- [x] **文档完善**: 添加安装警告和免责声明。

### M2: 完整功能系统 (v2.0.0)
- [x] **完整规则库**: 扩展至 80+ 条规则，涵盖 Rust/Tauri/JS 特有风险。
- [x] **智能缓存**: 实现后端 LRU 缓存 + Checksum 校验，前端 TanStack Query 集成。
- [x] **历史记录**: SQLite 数据库存储扫描历史，前端趋势图展示。
- [x] **Rust 评分器**: 高性能静态分析引擎 (100% 完成)。

---

## 🚀 阶段三：智能升级 (Phase 3)

**核心目标**：从“静态规则检查”进化为“AI 语义评审”。

### 🟢 P3-1: 多 Agent 专家审计架构
**状态**: 🚀 准备启动
**基础**: `src-tauri/src/analyzer/` (Rust Scorer) 已作为 Fact Extractor 就绪。

- [ ] **Step 1: 事实规约定义**
    - 定义 `TechnicalFactSheet` JSON Schema。
    - 将 Rust Scorer 的输出适配为 Agent 输入。
- [ ] **Step 2: 专家 Agent 实现**
    - **架构师 Agent**: 评估代码模式、错误处理健壮性。
    - **产品 Agent**: 评估 README 清晰度、功能实用性。
    - **安全 Agent**: 深度语义审计（超越正则的逻辑漏洞）。
- [ ] **Step 3: 主审官 (Chief Judge)**
    - 汇总专家评分，计算最终加权分。
    - 生成结构化的改进建议报告。

### 🟢 P3-2: Skills Master 自动进化引擎
**依赖**: P3-1

- [ ] **闭环构建**: 评估 -> 建议 -> 自动重构 -> 再评估。
- [ ] **提示词优化**: 自动优化 Skill 的 Prompt 工程。
- [ ] **代码修复**: 基于 AST 的自动代码修正。

---

## 🛠️ 阶段四：工程卓越 (Phase 4)

**核心目标**：解决 `check-result.md` 指出的严重技术债务。

### 🟡 P4-1: 测试体系建设
**现状**: 0% 覆盖率 (Critical)

- [ ] **配置测试环境**: Vitest + React Testing Library。
- [ ] **Store 测试**: 为 `useSkillStore` 编写单元测试（覆盖安装、扫描逻辑）。
- [ ] **组件测试**: 为 `Marketplace` 等核心页面编写集成测试。
- [ ] **E2E 测试**: Playwright 覆盖关键路径（安装、卸载流程）。

### 🟡 P4-2: 类型安全与代码规范
**现状**: 过度使用 `any` (Critical)

- [ ] **类型定义**: 为所有 Tauri Command 定义 TypeScript 接口（`src/types/tauri.ts`）。
- [ ] **移除 Any**: 替换 `src/store/useSkillStore.ts` 中的所有 `any`。
- [ ] **输入验证**: 增加 Zod 验证层，确保 GitHub URL 和路径安全。

### 🟡 P4-3: 性能与安全加固

- [ ] **防抖优化**: 搜索框添加 `useDebounce`。
- [ ] **渲染优化**: 使用 `React.memo` 和虚拟列表优化长列表。
- [ ] **CSP**: 添加 Content Security Policy 头。

---

## 🎨 阶段五：生态与体验 (Phase 5)

**核心目标**：打造现代化的分发和交互体验。

### ⚪ P5-1: Radix UI 迁移
**依据**: `ui-analysis.md`

- [ ] **组件库升级**: 从 DaisyUI 迁移至 Radix UI (无障碍优先)。
- [ ] **动画系统**: 引入 Framer Motion 实现页面级转场。
- [ ] **主题定制**: 实现赛博朋克/极简双主题系统。

### ⚪ P5-2: 远程初始化与分发
**依据**: `DEPLOYMENT_GUIDE.md`, `REMOTE_INIT.md`

- [ ] **Init Data**: 完善 `init-data.zip` 生成流水线。
- [ ] **版本控制**: 实现配置文件的远程版本检查与热更新。
- [ ] **Marketplace Backend**: 从静态 JSON 迁移至 API 服务（可选）。

---

## 📅 建议路线图 (Next 4 Weeks)

### Week 1: 质量与地基 (Phase 4)
*优先解决技术债务，为 AI 功能提供稳固基础。*
1. 配置 Vitest，修复核心 Store 的测试。
2. 消除核心路径的 `any` 类型。
3. 验证 Rust Scorer 与前端的对接。

### Week 2: AI 核心接入 (Phase 3)
1. 定义 Agent 接口协议。
2. 实现第一个专家 Agent（如：架构师）。
3. 前端展示 AI 评审报告原型。

### Week 3: 完整评审流 (Phase 3)
1. 集成所有专家 Agent。
2. 实现主审官打分逻辑。
3. 完成“一键智能评审”功能。

### Week 4: 体验打磨 (Phase 5)
1. 优化搜索和列表性能。
2. 完善发布流水线。

---

## 📞 资源索引
- **安全规则**: `docs/security-rules.md`
- **代码审计**: `docs/check-result.md`
- **UI 分析**: `docs/ui-analysis.md`
- **Rust 评分器**: `docs/RUST_SCORER_PLAN.md`