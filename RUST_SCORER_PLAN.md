# Rust Skill 评分系统实施计划

## 📋 项目概览

将 Python 评分系统迁移到 Rust，实现高性能、零依赖的 Skill 质量评分功能。

**目标：**
- ✅ 100% 兼容现有评分逻辑（基于 ordinary-claude-skills/tools）
- ✅ 性能提升 10-100 倍
- ✅ 打包体积增加 < 1MB
- ✅ 无运行时依赖

**参考代码：** ~/workspace/ordinary-claude-skills/tools/analyzer/

---

## 📊 评分体系（100分制）

| 模块 | 分值 | 负责文件 |
|------|------|---------|
| 内容质量 | 50分 ⭐ | content_scorer.rs |
| 技术实现 | 30分 | technical_scorer.rs |
| 维护性 | 10分 | maintenance_scorer.rs |
| 用户体验 | 10分 | ux_scorer.rs |

**等级划分：** S(90+) / A(80+) / B(70+) / C(60+) / D(<60)

---

## 🗂️ 目录结构设计

```
src-tauri/src/
├── lib.rs                      # 主入口（已存在）
├── analyzer/                   # 新增：评分系统模块
│   ├── mod.rs                  # 模块导出
│   ├── types.rs                # 核心数据类型
│   ├── config.rs               # 配置加载器
│   ├── utils.rs                # 工具函数（文本分析）
│   ├── skill_document.rs       # Skill 文档解析器
│   ├── content_scorer.rs       # 内容质量评分器（50分）
│   ├── technical_scorer.rs     # 技术实现评分器（30分）
│   ├── maintenance_scorer.rs   # 维护性评分器（10分）
│   ├── ux_scorer.rs           # 用户体验评分器（10分）
│   └── skill_analyzer.rs       # 主分析器（协调器）
├── commands/                   # Tauri 命令
│   ├── mod.rs
│   └── analyzer.rs            # 评分相关命令
└── config/                    # 配置文件
    └── scoring_weights.json   # 评分权重配置
```

---

## 📦 依赖项规划

```toml
[dependencies]
# 现有依赖（保持不变）
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 新增：评分系统依赖
serde_yaml = "0.9"              # YAML 前置元数据解析
regex = "1"                     # 正则表达式（已有）
pulldown-cmark = "0.11"         # Markdown 解析
chrono = "0.4"                  # 日期时间处理
```

**体积影响估算：** +400-600KB

---

## 🚀 实施阶段

### ✅ 阶段 0：准备工作（当前）
**目标：** 创建分支、规划文档、目录结构

**任务：**
- [x] 创建 feature/rust-skill-scorer 分支
- [ ] 创建项目规划文档（本文件）
- [ ] 创建目录结构
- [ ] 添加 Rust 依赖
- [ ] 复制配置文件

**产出：** 项目骨架 + 配置文件

---

### 阶段 1：核心数据结构（1-2小时）
**目标：** 定义所有评分系统的类型和结构

**文件：** `src-tauri/src/analyzer/types.rs`

**任务：**
- [ ] 定义 `SkillScore` 结构体（总评分结果）
- [ ] 定义 `ContentScore`、`TechnicalScore` 等子评分结构
- [ ] 定义 `SkillMetadata` 结构体
- [ ] 定义错误类型 `AnalyzerError`

**参考：** Python 中的 dict 返回值结构

---

### 阶段 2：工具函数模块（2-3小时）
**目标：** 实现文本分析和处理工具

**文件：** `src-tauri/src/analyzer/utils.rs`

**任务：**
- [ ] `count_code_blocks()` - 统计代码块数量
- [ ] `count_sections()` - 统计章节数量
- [ ] `has_section()` - 检测特定章节
- [ ] `check_keywords()` - 关键词检测
- [ ] `extract_use_cases()` - 提取使用场景
- [ ] `has_step_by_step()` - 检测分步指导

**参考：** `ordinary-claude-skills/tools/analyzer/utils.py`

---

### 阶段 3：文档解析器（2-3小时）
**目标：** 解析 SKILL.md 文件，提取元数据和内容

**文件：** `src-tauri/src/analyzer/skill_document.rs`

**任务：**
- [ ] YAML frontmatter 解析
- [ ] Markdown 内容解析
- [ ] 代码块提取
- [ ] 章节结构提取
- [ ] 缓存优化

**参考：** `skill_document.py`

---

### 阶段 4：内容质量评分器（3-4小时）⭐
**目标：** 实现 50 分的内容质量评分逻辑

**文件：** `src-tauri/src/analyzer/content_scorer.rs`

**评分维度：**
- [ ] 指令清晰度（13分）
  - When to Use 章节检测
  - 使用场景数量统计
  - 场景描述清晰度
- [ ] 技术深度（19分）
  - 代码示例数量
  - 最佳实践说明
  - 设计模式/架构说明
  - 输入/输出示例配对
- [ ] 文档完整度（13分）
- [ ] 可操作性（5分）

**参考：** `content_scorer.py`

---

### 阶段 5：技术实现评分器（2-3小时）
**目标：** 实现 30 分的技术实现评分

**文件：** `src-tauri/src/analyzer/technical_scorer.rs`

**评分维度：**
- [ ] 代码示例质量（15分）
  - 代码块数量
  - 代码语言多样性
  - 示例代码质量
  - 安全性关键词
- [ ] 模式设计（10分）
- [ ] 错误处理（5分）

**参考：** `technical_scorer.py`

---

### 阶段 6：维护性和用户体验评分器（1-2小时）
**目标：** 实现剩余 20 分的评分逻辑

**文件：**
- `src-tauri/src/analyzer/maintenance_scorer.rs`
- `src-tauri/src/analyzer/ux_scorer.rs`

**任务：**
- [ ] 维护性评分（10分）
  - 更新频率
  - 版本信息
  - 兼容性说明
- [ ] 用户体验评分（10分）
  - 易用性
  - 可读性
  - 快速开始章节

**参考：** `maintenance_scorer.py`, `ux_scorer.py`

---

### 阶段 7：主分析器集成（2小时）
**目标：** 协调所有评分器，生成最终结果

**文件：** `src-tauri/src/analyzer/skill_analyzer.rs`

**任务：**
- [ ] 集成所有评分器
- [ ] 计算总分和等级
- [ ] 生成改进建议
- [ ] 错误处理

**参考：** `skill_analyzer.py`

---

### 阶段 8：Tauri Commands 接口（1-2小时）
**目标：** 暴露给前端的 API 接口

**文件：** `src-tauri/src/commands/analyzer.rs`

**命令列表：**
- [ ] `analyze_skill_quality(skill_path: String) -> Result<SkillScore>`
- [ ] `batch_analyze_skills(skill_paths: Vec<String>) -> Result<Vec<SkillScore>>`

**集成到：** `src-tauri/src/lib.rs`

---

### 阶段 9：前端集成（2-3小时）
**目标：** TypeScript 类型定义和 UI 组件

**文件：**
- `src/types/scorer.ts` - TypeScript 类型定义
- `src/components/SkillQualityCard.tsx` - 评分展示组件
- `src/pages/MySkills.tsx` - 集成评分功能

**任务：**
- [ ] 定义 TypeScript 接口
- [ ] 创建评分卡片组件
- [ ] 在 MySkills 页面添加"质量评分"按钮
- [ ] 添加加载状态和错误处理

---

### 阶段 10：测试和优化（2-3小时）
**目标：** 确保功能正确性和性能

**任务：**
- [ ] 单元测试（关键函数）
- [ ] 集成测试（完整评分流程）
- [ ] 性能测试（vs Python 版本）
- [ ] 准确性验证（对比 Python 结果）
- [ ] 错误处理测试

**工具：**
```bash
cargo test
cargo bench  # 性能测试
```

---

## 📈 验收标准

### 功能完整性
- [ ] 所有评分维度实现
- [ ] 评分结果与 Python 版本误差 < 5%
- [ ] 支持所有 SKILL.md 格式

### 性能指标
- [ ] 单个 Skill 评分 < 50ms
- [ ] 批量评分（100个）< 3s
- [ ] 内存占用 < 50MB

### 代码质量
- [ ] 无 clippy 警告
- [ ] 测试覆盖率 > 70%
- [ ] 文档注释完整

---

## 🔄 回滚计划

如遇重大问题：
1. 保留 Python 评分系统作为 fallback
2. 通过 feature flag 切换实现
3. 逐步迁移用户

---

## 📝 当前进度

**当前阶段：** 阶段 0 - 准备工作
**分支：** feature/rust-skill-scorer
**预计总时长：** 20-30 小时
**目标完成日期：** TBD

---

**最后更新：** 2026-01-13
