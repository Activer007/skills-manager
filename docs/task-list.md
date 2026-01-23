# Skills Manager 任务清单与路线图

> **文档版本**: 1.2
> **创建日期**: 2026-01-22
> **最后更新**: 2026-01-23
> **基于文档**: prd-v2.md, task.md, task-ui.md, agent-skills-guard.md
> **当前版本**: v2.6.0

---

## 执行摘要

本任务清单基于对项目文档的全面分析，结合 Agent Skills Guard 参考实现的最佳实践，制定了完善多来源仓库管理和优化其他功能的具体计划。

### 核心发现

| 模块 | 当前完成度 | 差距分析 |
|------|-----------|----------|
| 基础安全管理 | ✅ 90% | 60+ 安全规则、三种扫描模式、白名单机制完善 |
| 基础分享功能 | ✅ 100% | 文本/图片/链接/包分享、发布向导已实现 |
| 质量评分系统 | ✅ 100% | 四维度评分、批量分析完整实现 |
| 数据库层 | ✅ 100% | 扫描历史、缓存、白名单、**仓库表**已实现 |
| **多来源仓库管理** | ✅ 100% | 基础设施、前端界面、精选仓库已上线 |
| **Share-First 生态** | ✅ 95% | 统一分享入口、发布向导、兼容性检查、市场增强已完成 |

### 关键差距

#### 多来源仓库管理 (已解决)
- ✅ `repositories` 表已创建
- ✅ 精选仓库配置已实现
- ✅ 默认仓库自动初始化已实现
- ✅ 仓库管理 UI 已实现

#### Share-First 生态 (进行中)

| 功能 | PRD 要求 | 当前状态 | 备注 |
|------|---------|----------|------|
| 统一分享入口 | Share Sheet | ✅ 已实现 | 支持链接/文本/图片/包/发布 |
| 分享链接 | Unlisted/Public Link | ✅ 已实现 | `SharePreview` 页面就绪 |
| 发布向导 | Publish Wizard | ✅ 已实现 | 预检查/元数据/发布模拟 |
| 社区市场 | Marketplace 搜索/筛选 | ✅ 已实现 | 完整的筛选和排序功能 |
| 派生体系 | Fork/Remix + lineage | 无 | ❌ 规划中 (Phase 4) |
| 合集 | Collections | 无 | ❌ 规划中 (Phase 4) |
| 创作者页 | Creator Profile | 无 | ❌ 规划中 (Phase 4) |
| SkillPack | 离线分享格式 | ✅ 已实现 | 🎉 已有 |
| 兼容性徽章 | Multi-platform badge | ✅ 已实现 | `CompatibilityBadge` 组件 |
| 嵌入卡片 | Embed Card | 无 | ❌ 规划中 (Phase 4) |

---

## 第一阶段：多来源仓库管理基础设施 (✅ 已完成)

**目标**：完善仓库管理核心架构，参考 Agent Skills Guard 实现
**优先级**：P0
**状态**：✅ 完成

### T1-1：数据库架构扩展

**任务清单**：
- [x] 创建数据库迁移脚本 v4
- [x] 实现 `repositories` 表创建
- [x] 实现 `repository_scan_queue` 表创建
- [x] 添加必要的数据库索引
- [x] 编写迁移回滚脚本

### T1-2：仓库模型与服务层

**任务清单**：
- [x] 创建 `src-tauri/src/models/repository.rs`
- [x] 实现 `Repository` 结构体
- [x] 实现 `from_github_url()` 解析函数
- [x] 实现 `validate_url()` 验证函数
- [x] 创建 `src-tauri/src/services/repository.rs`
- [x] 实现 `RepositoryService`
- [x] 实现 `add_repository()` 添加仓库
- [x] 实现 `delete_repository()` 删除仓库（含级联清理）
- [x] 实现 `get_repository()` 查询仓库
- [x] 实现 `list_repositories()` 列出所有仓库
- [x] 实现 `update_repository()` 更新仓库配置

### T1-3：精选仓库系统（Featured Repositories）

**任务清单**：
- [x] 创建 `featured-repositories.yaml` 配置文件
- [x] 添加官方仓库配置（anthropics/skills, obra/superpowers）
- [x] 添加社区精选配置（ComposioHQ 等）
- [x] 实现多语言描述支持
- [x] 创建 `src-tauri/src/services/featured_repository.rs`
- [x] 实现 `get_config()` 加载配置
- [x] 实现 `refresh()` 远程刷新
- [x] 实现本地缓存机制

### T1-4：默认仓库初始化

**任务清单**：
- [x] 在应用启动时初始化默认仓库
- [x] 添加 anthropics/skills（官方）
- [x] 添加 obra/superpowers（官方）
- [x] 避免重复初始化（检查已有仓库）
- [x] 记录初始化日志

### T1-5：仓库扫描命令

**任务清单**：
- [x] 实现 `add_repository` 命令
- [x] 实现 `delete_repository` 命令
- [x] 实现 `scan_repository` 命令
  - GitHub API 扫描（首次）
  - 本地缓存扫描（后续）
  - 智能跳过来已扫描的技能
- [x] 实现 `auto_scan_unscanned_repositories` 命令
- [x] 注册新命令到 Tauri

---

## 第二阶段：前端仓库管理 UI (✅ 已完成)

**目标**：提供完整的仓库管理界面
**优先级**：P0
**状态**：✅ 完成

### T2-1：仓库管理 Hooks

**任务清单**：
- [x] 创建 `src/hooks/useRepositories.ts`
- [x] 实现 `useRepositories()` 列出仓库
- [x] 实现 `useAddRepository()` 添加仓库
- [x] 实现 `useDeleteRepository()` 删除仓库
- [x] 实现 `useScanRepository()` 扫描仓库
- [x] 实现 `useFeaturedRepositories()` 获取精选仓库
- [x] 实现 `useRefreshFeatured()` 刷新精选仓库

### T2-2：仓库管理页面

**任务清单**：
- [x] 创建 `src/pages/Repositories.tsx`
- [x] 实现仓库列表展示
- [x] 实现添加仓库表单
- [x] 实现 URL 自动提取 owner 名称
- [x] 实现仓库扫描功能
- [x] 实现删除仓库功能
- [x] 实现进度状态显示
- [x] 添加国际化支持

### T2-3：精选仓库组件

**任务清单**：
- [x] 创建 `src/components/FeaturedRepositories.tsx`
- [x] 实现分类折叠面板
- [x] 实现多语言描述切换
- [x] 实现标签展示
- [x] 实现"添加到我的仓库"按钮
- [x] 实现已添加状态检测
- [x] 实现刷新功能

### T2-4：仓库管理命令注册

**任务清单**：
- [x] 在 `lib.rs` 中注册仓库管理命令
- [x] 更新 `invoke_handler` 列表
- [x] 添加前端 API 客户端函数
- [x] 测试命令调用链路

---

## 第三阶段：Share-First 生态完善 (✅ 已完成)

**目标**：实现 PRD v2 要求的分享生态
**优先级**：P1
**状态**：✅ 完成

### T3-1：统一分享入口（Share Sheet）

**任务清单**：
- [x] 创建 `src/components/ShareSheet.tsx`
- [x] 支持多种对象类型（Skill/Profile/Collection）
- [x] 渐进式展开选项
- [x] 实现预览卡片实时显示
- [x] 实现链接复制功能
- [x] 实现可见性切换

### T3-2：分享链接系统

**任务清单**：
- [x] 设计分享链接数据结构
- [x] 实现链接生成逻辑
- [x] 实现链接解析/验证
- [x] 创建分享页面组件 (`src/pages/SharePreview.tsx`)
- [x] 实现安全等级展示
- [x] 实现兼容性徽章
- [x] 实现一键安装按钮
- [x] 实现依赖诊断摘要

### T3-3：发布向导（Publish Wizard）

**任务清单**：
- [x] 创建 `src/components/PublishWizard.tsx`
- [x] 实现发布前检查（Preflight）
  - SKILL.md 结构检查
  - Secrets 扫描
  - 依赖声明检查
  - License 检查
- [x] 实现元数据编辑
- [x] 实现版本策略选择
- [x] 实现提交与确认
- [x] 实现进度反馈

### T3-4：社区市场增强

**任务清单**：
- [x] 扩展市场搜索功能
- [x] 添加高级筛选
  - [x] 已验证/安全
  - [x] 风险提示
  - [x] 兼容当前 Agent
  - [x] 标签过滤
- [x] 实现排序选项
  - [x] 热门安装量
  - [x] 高评分
  - [x] 最近更新
- [x] 优化筛选面板 UI（独立组件）
- [x] 实现虚拟化列表性能优化
- [ ] 添加创作者信息展示（规划到 T4-4）
- [ ] 实现评价与反馈入口（规划到 T4-4）

### T3-5：兼容性徽章系统

**任务清单**：
- [x] 定义兼容性数据模型
- [x] 实现兼容性检测逻辑
- [x] 创建 `CompatibilityBadge` 组件
- [x] 在技能卡片和详情页展示

---

## Phase 3.5：代码重构与质量优化 (✅ 已完成)

**目标**：在进入 Phase 4 前清理技术债务，提升代码可维护性
**优先级**：P1
**状态**：✅ 完成

### T3.5-1：市场页面重构

**任务清单**：
- [x] 拆分 `Marketplace.tsx` 为独立组件 (`MarketplaceHero`, `FilterPanel`)
- [x] 提取业务逻辑到 `useMarketplaceLogic` Hook
- [x] 修复 `react-window` 类型定义问题
- [x] 优化 Hero 区域视觉效果

### T3.5-2：仓库页面清理

**任务清单**：
- [x] 移除过时注释和死代码
- [x] 修复模块导入循环依赖问题
- [x] 补充删除仓库确认弹窗 (`ModalDialog`)
- [x] 统一类型定义到 `src/types/index.ts`

---

## 第四阶段：高级分享功能 (✅ 进行中)

**目标**：完善分享生态的高级功能
**优先级**：P2
**预估工作量**：3-4 周
**前置条件**：Phase 1-3 已完成 ✅

### T4-1：嵌入卡片（Embed Card）

**任务清单**：
- [x] 设计嵌入卡片格式
  - [x] Markdown 输出
  - [x] HTML 输出
- [x] 创建嵌入卡片生成器
- [x] 实现复制到剪贴板功能

### T4-2：派生体系（Fork/Remix）

**任务清单**：
- [x] 设计派生关系数据结构
  - [x] 父对象 ID
  - [x] 派生原因
  - [x] 署名信息
- [x] 实现一键派生功能
- [x] 实现谱系展示
- [ ] 实现贡献回馈机制 (Phase 5)

### T4-3：合集系统（Collections）

**任务清单**：
- [x] 创建合集数据模型
- [x] 实现合集创建/编辑
- [x] 实现合集发现页面
- [x] 优化：集成"添加到合集"按钮（使用 AddToCollectionModal）
- [x] 优化：实现合集打包分享功能

### T4-4：创作者系统

**任务清单**：
- [x] 创建创作者数据模型
- [x] 实现创作者主页
- [x] 实现作品统计
- [x] 实现关注功能

---

## 第五阶段：性能与体验优化 (⏳ 规划中)

**目标**：提升用户体验和系统性能
**优先级**：P2
**预估工作量**：2 周

### T5-1：后台任务管理

**任务清单**：
- [ ] 实现扫描进度跟踪（使用 Channel）
- [ ] 实现下载进度跟踪
- [ ] 创建任务中心 UI
- [ ] 添加任务取消功能
- [ ] 实现并发控制

### T5-2：缓存优化

**任务清单**：
- [ ] 实现 LRU 缓存策略
- [ ] 添加缓存大小限制
- [ ] 实现缓存手动清理
- [ ] 优化缓存查找性能
- [ ] 实现 TTL 支持

### T5-3：GitHub API 优化

**任务清单**：
- [ ] 实现 API 速率限制处理
- [ ] 添加请求重试机制（指数退避）
- [ ] 实现并发请求控制
- [ ] 添加请求超时处理

### T5-4：数据库优化

**任务清单**：
- [ ] 添加必要索引
- [ ] 实现批量操作
- [ ] 添加连接池监控
- [ ] 实现数据库压缩
- [ ] 启用 WAL 模式
