# Nexus v2 分享与社区规划（Share‑First PRD）

> **定位**：让「分享」成为 Nexus 的第一增长引擎；让「社区」成为 skills 与 profiles 的分发网络。

- 文档版本：v1.0
- 适用范围：Nexus v2（含 Profile、Dispatcher、Snapshot、Marketplace、TrustShield）
- 目标读者：产品/设计/研发/运营/安全

---

## 1. 背景与愿景

### 1.1 为什么要 Share‑First
Nexus 的核心资产不是 UI，而是用户创造/组合/迭代的能力包（skills）、能力集（profiles）、以及它们在真实项目里产生的可复用经验。**用户之间的分享**可以天然形成：

- **分发**：好东西被看见 → 被安装 → 被二次传播
- **信任**：社交证明（stars、安装量、评价、熟人分享）降低试错成本
- **进化**：fork/remix 让技能从“作品”变“物种”
- **生态**：从单点工具升级为能力网络（capability network）

### 1.2 北极星（North Star）
> **让用户 3 秒完成分享，让他人 30 秒完成安装并成功运行。**

- 3 秒分享：无需思考、默认安全、链接可用、预览可懂
- 30 秒安装：风险可见、依赖可诊断、配置可注入、落点可控（系统/项目/Profile）

---

## 2. 设计原则

1) **零摩擦**：分享不应要求用户理解复杂概念；默认一键分享，复杂项可展开。
2) **安全默认（Safe by Default）**：分享前后都要做 Secrets / 依赖 / 权限声明 / 风险提示。
3) **可解释**：任何“危险/警告/不兼容”必须说明原因与修复建议。
4) **可溯源**：作者、来源仓库、版本、commit、派生关系（fork lineage）必须可追踪。
5) **可移植**：同一份能力可以被分发到不同 Agent 平台（Claude/OpenCode/Codex…）。
6) **可组合**：分享的不止单个 Skill，也包括 Profile（能力集）、Collection（合集）、Snapshot（快照）。
7) **激励正确**：奖励高质量、可维护、可复用；抑制抄袭、欺诈、恶意。

---

## 3. 概念模型（核心对象）

- **Skill**：单个能力包（含 SKILL.md / 代码 / 资源 / manifest）。
- **Profile**：能力集（若干 Skill + 兼容映射 + 配置注入策略）。
- **Collection**：社区可分享的“主题合集”（可含 Skills + Profiles + 外部链接）。
- **Snapshot**：某时刻的可恢复版本状态（含版本锁定与可回滚）。
- **Share Link**：可分享的链接（支持 unlisted / public），承载预览与安装入口。
- **SkillPack (.skillpack.zip)**：离线/跨环境分享载体。
- **TrustShield**：安全评分与报告（规则命中、风险等级、建议）。
- **Compatibility Badge**：与目标 Agent 的适配状态（可用/需配置/不兼容）。
- **Creator Profile**：创作者主页与信誉体系（作品、安装量、评分、审核记录）。

---

## 4. 分享场景与目标用户

### 4.1 分享场景（按强度分层）

**L1：轻分享（Share）**
- 把某个 Skill/Profile/Collection 分享给同事/朋友
- 目标：复制链接/二维码/卡片 → 对方打开即可安装

**L2：发布（Publish）**
- 将作品公开到社区市场（可被搜索、被订阅、被推荐）
- 目标：一键发布向导 + 自动检查 + 版本管理

**L3：协作（Collaborate）**
- 团队内部的私有分享/私有市场
- 目标：权限控制、组织空间、审批流、版本策略

**L4：派生与演化（Fork/Remix）**
- 基于已有作品二次改造、合并贡献
- 目标：保留署名与溯源 + 形成谱系 + 可回收

### 4.2 用户画像
- **创作者（Creator）**：写 skill/组合 profile，希望被更多人使用并反馈。
- **使用者（User）**：想快速获得“可用能力”，不想踩坑。
- **维护者（Maintainer）**：负责更新、修复、兼容多平台。
- **团队管理员（Org Admin）**：关心权限、合规、安全。

---

## 5. 核心功能规划（Share‑First 功能集）

### 5.1 分享入口（统一 Share Sheet）
在下列位置统一提供 **Share**：
- Skill 列表卡片（我的 Skills）
- Skill 详情页（含安全/兼容/版本）
- Profile 详情页
- Collection 详情页
- Snapshot 时间轴节点

**Share Sheet 选项（默认收敛，逐步展开）**
1) 复制链接（默认）
2) 生成二维码（用于线下/截图传播）
3) 导出 skillpack（离线）
4) 发布到社区（Public）
5) 分享到团队空间（Private/Org）

> 关键：Share Sheet 必须呈现“预览卡片”，让用户知道自己分享出去的样子。

---

### 5.2 分享载体（Share Link / Embed Card）

**Share Link 类型**
- **Unlisted Link（默认）**：有链接可访问，不进入公共搜索
- **Public Listing**：公开可搜索/可订阅
- **Org‑Only**：仅组织内可见

**链接页面应包含（最小可用）**
- 标题、简介、作者、来源、版本
- TrustShield 摘要（等级/分数/关键命中）
- Compatibility Badge（目标 Agent 可用性）
- 安装按钮（Install to：System / Project / Profile）
- 依赖与配置提示（Diagnostics + Config Injection 摘要）
- 更新日志与版本选择（可选）

**可嵌入卡片（Embed Card）**
- 允许生成 Markdown/HTML 片段，用于贴到 README/博客/社区帖
- 卡片信息：标题 + 安全/兼容徽章 + 一键安装

---

### 5.3 发布向导（Publish Wizard）
目标：把“发布”变成 60 秒内完成的流程。

**发布前自动检查（Preflight）**
- 结构检查：SKILL.md / manifest 完整性
- Secrets 扫描：API Key、token、私钥、敏感路径
- 依赖检查：Node/Python/二进制依赖声明
- 权限声明：网络/文件/执行命令等
- License 检查：缺失则提醒选择
- 质量检查：文档、示例、配置模板

**发布流程**
1) 选择发布对象：Skill / Profile / Collection
2) 选择可见性：Unlisted / Public / Org
3) 自动生成发布页（预览）
4) 选择版本策略：
   - 绑定 Git 仓库（推荐）：按 tag/release 或 commit 发布
   - 上传 skillpack：生成托管版本
5) 提交并获得链接

**发布后能力**
- 版本管理：发布新版本、回滚、下架
- 维护者协作：邀请协作者
- 统计：安装量、活跃量、失败率、评价

---

### 5.4 发现与分发（社区 Marketplace 强化）

> 当技能规模达到数万级时，核心是“发现路径”，不是“更多卡片”。

**排序**
- 热门（安装量/增长）
- 高评分
- 最近更新
- 安全优先（Verified）
- 兼容优先（匹配当前 Agent）

**筛选**
- 已验证/安全
- 风险提示（warning/critical）
- 兼容当前 Agent
- 语言/标签
- 可离线安装

**详情抽屉/详情页必备模块**
- 安全报告（可展开）
- 依赖与配置（可复制一键修复命令）
- 版本历史
- 使用说明（快速开始）
- 评价与反馈入口（轻量）

---

### 5.5 Fork / Remix / Attribution（派生体系）

社区要健康，必须明确“派生关系”和“署名规则”。

**Fork/Remix 能力**
- 一键 Fork 到本地（或组织空间）
- 自动保留：原作者、来源、license、版本基线
- 支持“提交回馈”（向原作者发起贡献请求）

**派生图谱**
- 展示“从谁来 / 分出了谁”
- 允许维护者选择“官方推荐派生”

**署名与许可**
- 发布时强提醒 license
- 对非兼容 license 的发布给出阻断或强提醒

---

### 5.6 社区互动（MVP 到演进）

**社区互动不要一开始就做“重社交”，先做“轻反馈 + 高信噪比”。**

**MVP（先做）**
- 评分（1–5）+ “是否成功运行”二选一
- 简短评价（限制长度）
- 问题反馈（Issue/Report）

**进阶（再做）**
- 收藏/合集（Collections）
- 关注创作者
- 专题榜单与编辑精选

**长期**
- 讨论区/问答
- 教程/案例库（“我用这个 skill 做了什么”）

---

## 6. 安全与治理（Trust & Safety）

分享越容易，治理越重要。目标是：**让好东西更快传播，让坏东西更难扩散。**

### 6.1 安全展示（面向用户）
- TrustShield：分数 + 等级 + 关键命中
- 权限声明：该 skill 会做什么（网络/文件/命令执行）
- 风险闸门：
  - warning：安装可继续，但需确认
  - critical：默认禁止启用（必须二次确认 + 明确风险）

### 6.2 安全流程（面向平台）
- 上传/发布时扫描
- 安装前扫描（必要时）
- 运行前告知（权限与风险）

### 6.3 举报与处置
- 举报入口：恶意/侵权/诈骗/低质/垃圾
- 处置：隐藏（Shadow）、下架、封禁、申诉
- 反滥用：限流、反刷分、反羊毛

### 6.4 供应链安全（长期增强）
- 发布签名（作者签名/组织签名）
- 依赖锁（hash/lockfile）
- 镜像与校验

---

## 7. 关键用户流程（UX Flow）

### 7.1 分享 Skill（3 秒流程）
1) 点击 SkillCard 的 **Share**
2) 弹出 Share Sheet（默认选中“复制链接”）
3) 显示预览卡片 → 一键复制完成

可选：切换为 Unlisted/Public/Org；生成二维码；导出 skillpack。

### 7.2 从链接安装（30 秒流程）
1) 粘贴链接/点击链接 → 进入 Share Page
2) 看到：安全等级 + 兼容徽章 + 快速开始
3) 点击 Install → 选择目标（System/Project/Profile）
4) 自动 Diagnostics 检查（缺依赖给 Fix）
5) 安装完成 → 显示“成功运行指南”

### 7.3 发布到社区（60 秒流程）
1) Share Sheet → Publish
2) Preflight（结构/secret/license/依赖/质量）
3) 填写元数据（标题/简介/标签）
4) 选择版本策略（Git/tag 或上传包）
5) 发布成功 → 获得链接 + 进入作品管理

### 7.4 Fork / Remix
1) 详情页点击 Fork
2) 选择派生方式（本地/组织空间）
3) 生成派生版本 → 自动记录 lineage
4) 可选择“贡献回原作者”

---

## 8. 信息架构（IA）建议

在 v2 导航基础上，强化分享与社区建议新增：

- **Community（社区）**：发现/收藏/榜单/创作者
- **Tasks（任务）**：安装/分发/扫描/发布的任务中心
- **Security（安全中心）**：风险技能/扫描报告/启用审计

现有：我的 Skills、市场、Profiles、Integrations、设置 继续保留。

---

## 9. 数据与接口（概念级）

### 9.1 核心数据结构（概念）
- `SkillMeta`：name, version, author, source(repo/path), description, tags
- `Publication`：visibility, share_id, listing_id, created_at, updated_at
- `TrustReport`：score, level, findings[], permissions[], suggested_fixes[]
- `Compatibility`：agent_targets[], status(per target), notes
- `Artifact`：type(link/skillpack), checksum, size
- `Lineage`：parent_id, fork_reason, attribution
- `Engagement`：installs, active_users, ratings, reviews
- `Report`：reason, evidence, status

### 9.2 关键接口（概念）
- `POST /share`：生成 share link（unlisted 默认）
- `GET /share/:id`：获取分享页数据
- `POST /publish`：提交发布（含 preflight 结果）
- `POST /install`：从 share/install 安装（带目标与 diagnostics）
- `POST /fork`：创建派生
- `POST /review`：评分/评价
- `POST /report`：举报
- `GET /creator/:id`：创作者主页
- `GET /collections`：合集/榜单

---

## 10. 增长机制（Growth Loops）

### 10.1 主循环
安装 → 成功运行 → 轻反馈（成功/评分）→ 推荐/榜单 → 更多安装 → 触发分享

### 10.2 分享触发点（不打扰但有效）
- 安装后 1 次轻提示：“运行成功？要不要一键分享给同事？”
- Profile 创建完成后提示：“这套能力集适合团队？生成分享链接”
- 用户收藏形成 Collection 时提示：“发布为合集，让更多人看到”

### 10.3 激励系统（MVP 到演进）
- MVP：展示安装量、评分、成功率
- 进阶：创作者等级/徽章（Verified Creator）
- 长期：挑战赛、专题征集、编辑精选

---

## 11. 分阶段路线图（Roadmap）

### P0（立刻强化分享基础）
- Share Sheet 统一入口（Skill/Profile/Collection/Snapshot）
- Unlisted Share Link + 预览页
- 链接安装流程：目标选择 + 风险/兼容/依赖摘要

### P1（社区 MVP）
- Public Listing（搜索/排序/筛选）
- 作品页（版本/更新日志/安全报告）
- 轻反馈：评分 + 成功运行标记
- Creator Page（作品、统计）

### P2（生态演进）
- Collections（合集）与关注
- Fork/Remix + lineage 展示
- 组织空间（Org‑Only 分享与私有市场）

### P3（信任与供应链）
- 签名与认证
- 依赖锁与镜像
- 更高级反滥用与审计体系

---

## 12. 指标与验收（Metrics）

### 12.1 北极星指标
- **Share → Install 成功率**（从分享链接到成功安装并可用）

### 12.2 关键漏斗
- 生成分享链接数
- 分享链接打开率
- 安装点击率
- 安装成功率
- 运行成功率（用户确认）
- 评价/反馈率
- 二次分享率（K 因子）

### 12.3 质量与安全
- 高风险技能安装占比与拦截率
- 举报量与处理 SLA
- 评分作弊识别命中率

---

## 13. 风险与开放问题

1) **法律与版权**：分享/派生带来的侵权风险（license 强制与举报机制）。
2) **恶意代码与供应链**：需要多层防线（扫描、签名、闸门、隔离）。
3) **社交噪音**：评论区易变垃圾场，先做轻反馈。
4) **多平台兼容复杂度**：需要清晰的兼容徽章与诊断机制。

---

## 14. 交互与 UI 清单（给设计与前端）

- Share Sheet（Drawer/Modal）
  - 预览卡片（可复制）
  - 可见性切换（unlisted/public/org）
  - 复制链接/二维码/导出/publish

- Share Page（Web 或内置页面）
  - 安全/兼容/依赖模块
  - Install CTA + 目标选择
  - 版本选择 + 更新日志
  - 举报入口

- Publish Wizard
  - Preflight 结果页（可展开 + 一键修复建议）
  - 元数据编辑（标题/简介/标签/license）
  - 版本策略选择（Git/tag/上传）

- Community
  - 搜索/筛选/排序
  - Creator Page
  - Collection Editor

- Task Center
  - 阶段进度 + 日志 + 重试

- Security Center
  - 风险技能列表
  - 扫描报告历史
  - 启用审计

---

## 15. 最小可落地（MVP 定义）

> **MVP = Unlisted 分享链接 + 可安装的分享页 + 风险/兼容/依赖摘要 + 安装任务可观察。**

只要 MVP 做到“分享 3 秒、安装 30 秒且成功”，社区增长就会自然发生。

---

## 16. 附录：术语
- **Unlisted**：不公开索引，仅通过链接访问
- **Lineage**：派生谱系
- **Preflight**：发布前自动检查
- **Compatibility Badge**：平台兼容徽章
- **TrustShield**：安全评分与报告

