# 中低优先级修复任务清单

**生成日期**: 2026-01-29
**基于**: 文档验证报告 (`docs/verification/summary-report.md`)
**状态**: 高优先级问题已修复（PR #123）

---

## ✅ 已完成的高优先级修复

1. ✅ **默认路由错误** - 新用户现在首先进入 `/marketplace`
2. ✅ **Dashboard 路由未配置** - 用户可访问 `/dashboard`
3. ✅ **Marketplace 安全评分显示** - 添加安全评分和等级显示
4. ✅ **来源筛选 UI** - FilterPanel 已实现来源筛选功能

---

## 🟡 中优先级修复项

### 1. ISSUE-002: 集合拖拽排序功能
**影响流程**: FF-SC-16 (manage-collections)
**当前完成度**: 95% (84/88 步骤)
**工作量估计**: 1-2 天
**问题描述**:
- 用户无法通过拖拽调整合集中 Skills 的顺序
- 流程图标记为 ISSUE-002

**技术方案**:
- 使用 `react-beautiful-dnd` 或 `dnd-kit` 库
- 后端添加 `collection_skill_order` 字段到 `collection_skills` 表
- 前端实现拖拽 UI 和 API 调用

**修改文件**:
- `src-tauri/src/commands/collections.rs` - 添加更新排序的 API
- `src/pages/CollectionDetail.tsx` - 添加拖拽功能
- `src/types/index.ts` - 添加排序字段类型定义

**参考**:
- 验证报告: `docs/verification/ff-sc16-manage-collections.md`

---

### 2. ISSUE-003: 批量启用所有 Skills
**影响流程**: FF-SC-16 (manage-collections)
**当前完成度**: 95% (84/88 步骤)
**工作量估计**: 0.5-1 天
**问题描述**:
- 用户需要逐个启用合集中的 Skills，缺少批量操作功能
- 流程图标记为 ISSUE-003

**技术方案**:
- 在合集详情页添加"全部启用"和"全部禁用"按钮
- 后端添加批量更新 API
- 前端实现批量操作逻辑

**修改文件**:
- `src-tauri/src/commands/skills.rs` - 添加批量启用/禁用 API
- `src/pages/CollectionDetail.tsx` - 添加批量操作按钮

**参考**:
- 验证报告: `docs/verification/ff-sc16-manage-collections.md`

---

### 3. Marketplace 质量评分显示（需后端支持）
**影响流程**: FF-SC-07, FF-SC-08, UJ-01
**当前状态**: 已显示安全评分，缺少质量评分
**工作量估计**: 2-3 天（后端 1-2 天，前端 0.5 天）
**问题描述**:
- Marketplace SlideOver 已显示安全评分 ✅
- 缺少质量评分（QualityScore）显示
- MySkills 页面有完整的 `QualityScoreCard` 组件

**技术方案**:
**后端**:
- 在扫描 Marketplace Skills 时计算质量评分
- 复用现有的 `analyze_skill_quality` 命令
- 将评分结果存储到 `marketplace_skills` 表的 `quality_score` 字段

**前端**:
- 在 Marketplace SlideOver 添加 `QualityScoreCard` 组件
- 使用与 MySkills 相同的显示逻辑

**修改文件**:
- `src-tauri/src/commands/marketplace.rs` - 扫描时计算质量评分
- `src-tauri/src/database/schema.rs` - 确认 `quality_score` 字段存在
- `src/pages/Marketplace.tsx` - 添加 QualityScoreCard 组件
- `src/types/index.ts` - 确认 `MarketplaceSkill` 有 `qualityScore` 字段

**参考**:
- 验证报告: `docs/verification/ff-sc07-view-skill-details.md`
- 相关组件: `src/components/SkillQuality/QualityScoreCard.tsx`

---

### 4. 任务中心筛选粒度改进
**影响流程**: FF-SC-19 (view-task-center)
**当前完成度**: 90% (61/68 步骤)
**工作量估计**: 0.5 天
**问题描述**:
- 流程图期望: "全部/进行中/已完成/失败" 四个筛选标签
- 实际实现: "Active/History" 两个标签
- 功能可用但粒度不够细

**技术方案**:
- 将 "Active/History" 改为更细粒度的筛选
- 根据任务状态 (`status` 字段) 进行筛选
- 保留简化的 "Active/History" 作为可选视图

**修改文件**:
- `src/pages/TaskCenter.tsx` - 更新筛选标签
- `src/hooks/useTasks.ts` - 更新筛选逻辑

**参考**:
- 验证报告: `docs/verification/ff-sc19-view-task-center.md`

---

### 5. 任务中心详细日志显示
**影响流程**: FF-SC-19 (view-task-center)
**当前完成度**: 90% (61/68 步骤)
**工作量估计**: 0.5-1 天
**问题描述**:
- 查看详细日志功能部分实现，但可能不完整
- 用户可能无法查看完整的任务执行日志

**技术方案**:
- 确认后端 `get_task_logs` API 是否完整
- 前端添加日志查看对话框
- 支持日志搜索和筛选

**修改文件**:
- `src-tauri/src/commands/tasks.rs` - 确认日志 API 完整性
- `src/pages/TaskCenter.tsx` - 添加日志查看 UI

**参考**:
- 验证报告: `docs/verification/ff-sc19-view-task-center.md`

---

## 🔵 低优先级修复项

### 6. 包签名验证（可选安全功能）
**影响流程**: FF-SC-03 (import-from-package)
**当前完成度**: 95% (30/32 步骤)
**工作量估计**: 2-3 天
**问题描述**:
- 导入 .zip 包时未验证签名
- 可选的高级安全功能，防止篡改

**技术方案**:
- 使用 `ed25519` 或类似签名算法
- 打包时生成签名（私钥）
- 导入时验证签名（公钥）
- 提供跳过签名验证的选项（用于未签名的包）

**修改文件**:
- `src-tauri/src/commands/share.rs` - 添加签名生成和验证
- `src-tauri/src/commands/package.rs` - 导入时验证签名
- `src/components/ImportSkillModal.tsx` - 添加签名验证提示

**参考**:
- 验证报告: `docs/verification/ff-sc03-import-from-package.md`

---

### 7. Fork 后打开编辑器
**影响流程**: FF-SC-15 (fork-remix-skill)
**当前完成度**: 95% (30/32 步骤)
**工作量估计**: 0.5 天
**问题描述**:
- Fork Skill 后无法直接打开编辑器
- 可选的用户体验优化功能

**技术方案**:
- 在 ForkSkillModal 添加"打开编辑器"选项
- Fork 成功后调用系统默认编辑器打开 SKILL.md
- 使用 `open` 命令（Tauri API）

**修改文件**:
- `src/components/ForkSkillModal.tsx` - 添加编辑器选项
- `src-tauri/src/commands/fs.rs` - 添加打开文件命令（如果不存在）

**参考**:
- 验证报告: `docs/verification/ff-sc15-fork-remix-skill.md`

---

### 8. 按质量评分排序
**影响流程**: FF-SC-08 (browse-marketplace)
**当前完成度**: 92% (46/50 步骤)
**工作量估计**: 0.5 天
**问题描述**:
- Marketplace 缺少按质量评分排序选项
- 需要先实现质量评分计算（任务 #3）

**依赖**: 任务 #3 (Marketplace 质量评分显示)

**技术方案**:
- 在 SortDropdown 添加"质量评分"选项
- 前端按 `qualityScore` 字段排序

**修改文件**:
- `src/components/SortDropdown.tsx` - 添加质量评分选项
- `src/hooks/useMarketplaceLogic.ts` - 添加排序逻辑

**参考**:
- 验证报告: `docs/verification/ff-sc08-browse-marketplace.md`

---

### 9. 类别筛选功能完善
**影响流程**: FF-SC-08 (browse-marketplace)
**当前完成度**: 92% (46/50 步骤)
**工作量估计**: 0.5-1 天
**问题描述**:
- 流程图期望有独立的类别筛选下拉菜单
- 当前通过快速筛选按钮（"Top Rated"、"Productivity"等）实现
- 功能可用但实现方式不同

**技术方案**:
- 在 FilterPanel 添加类别筛选下拉菜单
- 类别选项：Productivity, Coding, Security, Testing 等
- 与现有快速筛选按钮共存

**修改文件**:
- `src/components/FilterPanel.tsx` - 添加类别筛选
- `src/pages/Marketplace.tsx` - 集成类别筛选

**参考**:
- 验证报告: `docs/verification/ff-sc08-browse-marketplace.md`

---

### 10. MySkills 标签页设计差异（非问题）
**影响流程**: UJ-02 (daily-user-management)
**优先级**: ⭐ 低（设计差异，非问题）
**说明**:
- 流程图期望有"已禁用"标签页
- 实际实现有"全部"标签页
- "全部"标签页更实用，建议保持当前设计

**建议**: 保持当前设计，无需修改

**参考**:
- 验证报告: `docs/verification/uj-02-daily-user-management.md`

---

## 📊 优先级矩阵

| 任务 ID | 任务名称 | 优先级 | 工作量 | 用户价值 | 技术复杂度 |
|---------|---------|--------|--------|----------|-----------|
| #1 | 集合拖拽排序 | ⭐⭐ 中 | 1-2 天 | 高 | 中 |
| #2 | 批量启用 Skills | ⭐⭐ 中 | 0.5-1 天 | 中 | 低 |
| #3 | Marketplace 质量评分 | ⭐⭐ 中 | 2-3 天 | 高 | 中 |
| #4 | 任务筛选改进 | ⭐⭐ 中 | 0.5 天 | 中 | 低 |
| #5 | 任务详细日志 | ⭐⭐ 中 | 0.5-1 天 | 中 | 低 |
| #6 | 包签名验证 | ⭐ 低 | 2-3 天 | 低 | 高 |
| #7 | Fork 后打开编辑器 | ⭐ 低 | 0.5 天 | 低 | 低 |
| #8 | 按质量评分排序 | ⭐ 低 | 0.5 天 | 低 | 低 |
| #9 | 类别筛选完善 | ⭐ 低 | 0.5-1 天 | 低 | 低 |
| #10 | MySkills 标签页 | ⭐ 低 | 0 天 | - | - |

---

## 🎯 实施建议

### 阶段 1: 快速胜利（1 周）
优先实施工作量小、价值高的任务：
1. ✅ 任务筛选改进（#4）- 0.5 天
2. ✅ 批量启用 Skills（#2）- 0.5-1 天
3. ✅ 任务详细日志（#5）- 0.5-1 天

### 阶段 2: 核心增强（2-3 周）
实施需要更多开发时间但价值高的任务：
4. ✅ Marketplace 质量评分（#3）- 2-3 天
5. ✅ 集合拖拽排序（#1）- 1-2 天

### 阶段 3: 可选优化（按需）
根据用户反馈决定是否实施：
6. Fork 后打开编辑器（#7）
7. 按质量评分排序（#8）
8. 类别筛选完善（#9）

### 阶段 4: 高级功能（长期）
技术复杂度高、用户价值相对低的功能：
9. 包签名验证（#6）

---

## 📋 验收标准

每个任务完成后应：
1. ✅ 在对应流程图上标记为已实现
2. ✅ 更新 `rebuild-task.md` 任务状态
3. ✅ 通过手动测试验证功能
4. ✅ 更新相关文档（如需要）
5. ✅ 创建 Pull Request 并通过代码审查

---

**文档维护**: 请在完成每个任务后更新此文件的状态（✅ 已完成 / ⏳ 进行中 / 📋 计划中）
