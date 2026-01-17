# 📚 文档更新计划

**创建日期**: 2026-01-17
**基于版本**: master (c3690d7)
**更新原因**: 同步项目实际开发进度

---

## 📊 当前文档状态分析

### ✅ 已完成的功能（但文档未更新）

1. **Skill 质量评分系统** - 100% 完成
   - Rust 后端评分引擎已完成
   - 前端 UI 集成完成（QualityBadge, QualityScoreCard, ScoreRadar）
   - 批量评分和缓存机制已实现
   - 15 个单元测试通过

2. **安全扫描系统增强** - 100% 完成
   - 三种扫描模式（Strict/Standard/Relaxed）已实现
   - 白名单管理（Skill + 规则）已实现
   - 智能缓存机制已实现
   - 扫描历史记录已实现

3. **扫描历史功能** - 100% 完成
   - 搜索、筛选功能已实现
   - 导出 JSON/CSV 功能已实现
   - 数据可视化（Recharts）已实现

4. **测试框架** - 100% 完成
   - Vitest + React Testing Library 已配置
   - 15/15 测试通过
   - npm 测试脚本已添加

5. **代码质量改进** - 100% 完成
   - ESLint 零错误
   - 类型安全性提升
   - 文档完善

### ❌ 文档过时问题

#### 1. **task.md** (主任务清单)
- **问题**: 标注 Phase 3/4 为"当前焦点"，但实际已完成 Phase 2 的大部分内容
- **影响**: P4-1 (测试体系) 标记为"0% 覆盖率"，实际已有 15 个测试
- **影响**: P2-01 (置信度过滤) 标记为待办，实际已完成

#### 2. **phase2-tasks.md**
- **问题**: 仍在规划 Phase 2 任务，但实际已完成
- **影响**: P2-01, P2-02 标记为待办，实际已完成

#### 3. **planning/** 目录
- **问题**: 包含过时的计划文档
- **影响**: NEXT_TOP_5_TASKS.md 可能不反映当前优先级

#### 4. **archive/** 目录
- **问题**: 已完成的报告未归档
- **建议**: 将完成的 Phase 2 报告移到 archive

### ✅ 无需更新的文档

- `guides/DEPLOYMENT_GUIDE.md` - 部署指南（仍然有效）
- `guides/RUST_INSTALLATION_GUIDE.md` - Rust 安装指南（仍然有效）
- `guides/REMOTE_INIT.md` - 远程初始化指南（仍然有效）
- `reference/DIRECTORY_STRUCTURE.md` - 目录结构（需验证）
- `reference/security-rules.md` - 安全规则（需验证）

---

## 🎯 更新计划

### 高优先级（立即执行）

#### 1. 更新 `task.md` - 主任务清单
**操作**:
- ✅ 标记 Phase 2 任务为已完成
- ✅ 更新测试覆盖率状态（0% → 已有 15 个测试）
- ✅ 添加已完成功能的状态
- ✅ 调整 Phase 3/4 优先级

#### 2. 归档 `phase2-tasks.md`
**操作**:
- 移动到 `archive/PHASE2_TASKS.md`
- 添加完成日期和最终状态

#### 3. 创建 `CURRENT_STATUS.md` - 当前状态报告
**内容**:
- 项目当前完成度
- 已实现功能清单
- 技术栈和架构
- 测试和代码质量指标
- 下一步计划

#### 4. 更新 `README.md` (docs/)
**操作**:
- 更新文档索引
- 添加新文档的链接
- 更新状态说明

### 中优先级

#### 5. 创建 `FEATURES.md` - 功能清单
**内容**:
- 详细的功能列表
- 每个功能的实现状态
- 使用指南

#### 6. 更新 `planning/NEXT_TOP_5_TASKS.md`
**操作**:
- 根据当前进度更新优先级
- 移除已完成的任务
- 添加新的任务建议

#### 7. 创建 `TESTING.md` - 测试文档
**内容**:
- 测试框架说明
- 测试运行方法
- 测试覆盖率
- 如何添加新测试

### 低优先级

#### 8. 验证和更新 Reference 文档
- 验证 `reference/DIRECTORY_STRUCTURE.md`
- 验证 `reference/security-rules.md`
- 更新如有变化

#### 9. 清理临时文档
- 删除或归档 `compare-*.md` 文件
- 整理 archive 目录

---

## 📅 执行时间表

### 立即执行（今天）
1. 更新 task.md
2. 归档 phase2-tasks.md
3. 创建 CURRENT_STATUS.md
4. 更新 docs/README.md

### 本周内
5. 创建 FEATURES.md
6. 更新 NEXT_TOP_5_TASKS.md
7. 创建 TESTING.md

### 可选
8. 验证 Reference 文档
9. 清理临时文档

---

## 🔄 维护建议

### 文档更新流程
1. **功能完成时**: 立即更新相关文档
2. **每周回顾**: 检查文档与代码的一致性
3. **版本发布前**: 全面审查所有文档

### 文档组织原则
- **planning/**: 未来计划和路线图
- **guides/**: 操作指南和教程
- **reference/**: 技术参考和规范
- **archive/**: 已完成的计划和报告
- **根目录**: 当前状态和概览文档

---

## ✅ 检查清单

- [ ] task.md 已更新
- [ ] phase2-tasks.md 已归档
- [ ] CURRENT_STATUS.md 已创建
- [ ] docs/README.md 已更新
- [ ] FEATURES.md 已创建
- [ ] NEXT_TOP_5_TASKS.md 已更新
- [ ] TESTING.md 已创建
- [ ] Reference 文档已验证
- [ ] 临时文档已清理
