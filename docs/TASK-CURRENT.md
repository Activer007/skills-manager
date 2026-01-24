# 当前优先任务清单（结合现状）

更新时间：2026-01-22  
依据文档：`docs/prd-v2.md`、`docs/task-ui.md`、`docs/task.md`

## 一、当前进展摘要（对齐现实）
- UI/UX 设计系统与核心页面已完成（Marketplace、My Skills、SlideOver、Switch、ConfigForm 等）。  
- 分享能力已完成“文本/图片/二维码/包导入导出”，但 **Share Link + Share Page + 安装流** 仍缺失。  
- Trust/安全可视化已有评分与安全盾，但 **Compatibility/MCP 能力** 与 **依赖诊断** 尚未落地。  
- 社区能力（公开发布、作品页、反馈、Creator）尚未建立。  

---

## 二、优先级最高的 10 个任务（含说明与并行建议）

### 1) Unlisted Share Link 生成与 Share Page MVP
**说明**：实现 `share_id` 生成、链接访问页（标题/作者/版本/安全摘要/安装入口）。  
**并行建议**：可与 #2（Share Sheet 入口）并行；#3（安装流）依赖该任务的链接数据结构。

### 2) 统一 Share Sheet 入口与预览卡片
**说明**：在 Skill/Profile/Collection/Snapshot 统一入口；默认“复制链接”，展示预览卡片。  
**并行建议**：可与 #1 并行；UI 先行做空态或 mock 数据。

### 3) 从 Share Link 安装（30 秒流程）
**说明**：安装目标选择（System/Project/Profile）+ Diagnostics 摘要 + 安装任务追踪。  
**并行建议**：需 #1 的 share 数据；与 #4（Trust/兼容展示）并行推进。

### 4) TrustShield 摘要与 Compatibility Badge
**说明**：在卡片、详情页、分享页展示安全等级与兼容状态；联动已有扫描与评分。  
**并行建议**：可与 #3 同步；依赖能力清单解析可与 #5 一起推进。

### 5) MCP Capability Badges + 能力清单（Manifest）
**说明**：卡片与详情页显示 Tools/Resources/Prompts 数量；详情列出能力声明。  
**并行建议**：与 #4 并行；与 #6（依赖检查）共享解析逻辑。

### 6) MCP 依赖检查与缺失提醒
**说明**：检测必需 MCP 服务器/插件缺失，提供可读修复建议。  
**并行建议**：与 #5 并行；UI 可先做缺失状态卡。

### 7) Publish Wizard（Preflight + 元数据 + 版本策略）
**说明**：结构/secret/license/依赖/权限检查；发布对象选择；版本策略（Git tag / skillpack）。  
**并行建议**：与 #8 并行；与 #1 共享 share 数据模型与发布后跳转逻辑。

### 8) Community Listing MVP（Public Search/Sort/Filter）
**说明**：公开作品列表 + 排序/筛选（安全优先/兼容优先/最近更新）+ 作品页入口。  
**并行建议**：可与 #7 并行；前端可先用 mock 数据完成 UI。

### 9) 轻反馈系统（评分 + 运行成功 + 举报入口）
**说明**：分享页/作品页提供评分、成功运行标记、轻量举报。  
**并行建议**：与 #8 并行；与 #4（TrustShield）形成闭环展示。

### 10) E2E/集成测试 + 性能基线
**说明**：Playwright 覆盖“分享→安装→成功运行”主流程；并建立基础性能指标（首屏/列表滚动/图片加载）。  
**并行建议**：与 #1-#9 并行推进，至少覆盖 Share Link 与安装流程。

### 11) Marketplace Data DB Hosting (性能优化)
**说明**：解决 70MB+ `marketplace.json` 加载慢问题；后端启动时导入 SQLite，前端按需分页查询。  
**并行建议**：纯后端任务，可随时独立并行。

---

## 三、分阶段梳理（建议）

### Phase A（Share MVP）
- #1 Share Link + Share Page  
- #2 统一 Share Sheet  
- #3 分享链接安装流程  
- #4 Trust/兼容徽章  

### Phase B（Discovery & Publish）
- #5 Capability Badges + 能力清单  
- #6 MCP 依赖检查  
- #7 Publish Wizard  
- #8 Community Listing MVP  

### Phase C（闭环与质量）
- #9 轻反馈系统  
- #10 E2E/性能基线  
- #11 Marketplace DB Hosting

---

## 四、并行协作建议（人员分工）
- **前端 UI 轨**：#2、#4、#5、#8、#9  
- **后端/协议 轨**：#1、#3、#6、#7、#11  
- **测试/质量 轨**：#10  

---

## 五、里程碑与子任务（含估时/负责人建议）
> 估时单位：人日（PD），以单人投入估算；实际可并行压缩。

### T1 Unlisted Share Link + Share Page MVP
- 里程碑：M1 Share 数据模型与命令；M2 Share Page 路由与 UI；M3 安装入口联动
- 子任务：数据模型/存储；生成 share_id；Share Page UI；安全/兼容摘要组件接入；基础埋点
- 估时：6–10 PD
- 负责人建议：后端/协议 1 + 前端 1

### T2 统一 Share Sheet 入口与预览卡片
- 里程碑：M1 入口补齐；M2 Share Sheet 组件；M3 预览卡与复制链接
- 子任务：Skill/Profile/Collection/Snapshot 入口补齐；Share Sheet 组件化；预览卡渲染；复制/成功提示
- 估时：4–7 PD
- 负责人建议：前端 1

### T3 从 Share Link 安装（30 秒流程）
- 里程碑：M1 安装目标选择；M2 Diagnostics 摘要；M3 安装任务追踪
- 子任务：安装目标 UI；依赖/风险摘要接入；安装任务日志展示；失败重试/回退
- 估时：7–12 PD
- 负责人建议：后端/协议 1 + 前端 1

### T4 TrustShield 摘要与 Compatibility Badge
- 里程碑：M1 Badge 组件；M2 分享页/详情页接入；M3 评分/扫描联动
- 子任务：安全等级映射；兼容状态模型；卡片/详情/分享页展示；状态解释文案
- 估时：4–8 PD
- 负责人建议：前端 1

### T5 MCP Capability Badges + 能力清单
- 里程碑：M1 Manifest 解析；M2 Badge 展示；M3 详情页能力清单
- 子任务：能力统计（Tools/Resources/Prompts）；Badge UI；权限/能力列表模块
- 估时：5–9 PD
- 负责人建议：前端 1 + 协议/解析 0.5

### T6 MCP 依赖检查与缺失提醒
- 里程碑：M1 依赖检测；M2 缺失提示与修复建议；M3 安装前诊断联动
- 子任务：依赖声明格式；检测逻辑；缺失状态卡；修复指引文案
- 估时：6–10 PD
- 负责人建议：后端/协议 1 + 前端 0.5

### T7 Publish Wizard（Preflight + 元数据 + 版本策略）
- 里程碑：M1 Preflight 检查；M2 发布表单；M3 版本策略与发布结果
- 子任务：Preflight 规则集；发布流程 UI；元数据校验；版本策略选择；发布成功页
- 估时：8–14 PD
- 负责人建议：后端/协议 1 + 前端 1

### T8 Community Listing MVP
- 里程碑：M1 列表页 UI；M2 搜索/排序/筛选；M3 作品页入口
- 子任务：列表数据模型；筛选条件与 UI；排序规则；详情入口
- 估时：6–10 PD
- 负责人建议：前端 1

### T9 轻反馈系统
- 里程碑：M1 评分/成功运行；M2 举报入口；M3 统计展示
- 子任务：评分/成功运行 UI；举报对话框；结果回写展示
- 估时：5–9 PD
- 负责人建议：前端 1 + 后端/协议 0.5

### T10 E2E/集成测试 + 性能基线
- 里程碑：M1 Playwright 环境；M2 分享/安装主链路用例；M3 性能基线
- 子任务：E2E 脚手架；关键流程脚本；CI 接入；基础性能指标记录
- 估时：6–12 PD
- 负责人建议：测试/质量 1

### T11 Marketplace Data DB Hosting (Rust 优化)
- 里程碑：M1 数据库 Schema 迁移；M2 启动流式导入；M3 前端分页 API 对接
- 子任务：`marketplace_skills` 建表；Rust JSON Stream Parser；Upsert 逻辑；Tauri Command `get_skills`
- 估时：3–5 PD
- 负责人建议：后端 1

---

## 六、PRD 级验收标准与接口清单（建议）
> 说明：接口命名为建议草案，最终可映射到 Tauri commands 或后端 API。

### T1 Unlisted Share Link + Share Page MVP
- 验收标准：
  - 可生成唯一 share_id，默认 Unlisted。
  - Share Page 能展示标题/作者/版本/安全摘要/安装按钮。
  - 链接可在 3 秒内完成访问与内容渲染（本地或远程）。
- 接口/命令（建议）：
  - `POST /share`（body: target_type, target_id, visibility）
  - `GET /share/:id`（返回 SharePageData）

### T2 统一 Share Sheet 入口与预览卡片
- 验收标准：
  - Skill/Profile/Collection/Snapshot 均有 Share 入口。
  - Share Sheet 默认“复制链接”且预览卡正确渲染。
  - 复制成功有明确反馈。
- 接口/命令（建议）：
  - `share.preview`（生成预览卡数据）
  - `share.copy_link`（或复用 T1 的 /share）

### T3 从 Share Link 安装（30 秒流程）
- 验收标准：
  - 点击安装必须选择目标（System/Project/Profile）。
  - Diagnostics 摘要明确提示依赖/风险/兼容信息。
  - 安装任务可追踪，失败可重试。
- 接口/命令（建议）：
  - `POST /install`（body: share_id, target, options）
  - `GET /install/:task_id`（状态/日志）

### T4 TrustShield 摘要与 Compatibility Badge
- 验收标准：
  - 卡片/详情/分享页显示安全等级与兼容状态。
  - 不同等级展示不同颜色与说明文案。
  - 扫描结果变化可更新展示。
- 接口/命令（建议）：
  - `GET /trust/:skill_id`
  - `GET /compat/:skill_id`

### T5 MCP Capability Badges + 能力清单
- 验收标准：
  - SkillCard 显示 Tools/Resources/Prompts 数量。
  - 详情页可查看能力清单与权限声明。
- 接口/命令（建议）：
  - `GET /capabilities/:skill_id`

### T6 MCP 依赖检查与缺失提醒
- 验收标准：
  - 对缺失 MCP 依赖给出明确提示与修复建议。
  - 安装前诊断可阻断 critical 缺失。
- 接口/命令（建议）：
  - `POST /diagnostics`（body: skill_id 或 share_id）

### T7 Publish Wizard（Preflight + 元数据 + 版本策略）
- 验收标准：
  - Preflight 必含结构/secret/license/依赖/权限检查结果。
  - 发布流程可选 visibility 与版本策略。
  - 发布后可获取作品页或分享链接。
- 接口/命令（建议）：
  - `POST /publish/preflight`
  - `POST /publish`（body: metadata, version_strategy）

### T8 Community Listing MVP
- 验收标准：
  - 支持搜索/排序/筛选（安全、兼容、最近更新）。
  - 列表可进入作品页。
- 接口/命令（建议）：
  - `GET /community/list`（query: q, sort, filter）
  - `GET /community/item/:id`

### T9 轻反馈系统
- 验收标准：
  - 用户可进行评分与“成功运行”标记。
  - 举报入口可提交原因与证据。
  - 反馈结果可在作品页展示。
- 接口/命令（建议）：
  - `POST /review`（rating, success_flag）
  - `POST /report`（reason, evidence）

### T10 E2E/集成测试 + 性能基线
- 验收标准：
  - Playwright 覆盖“分享→打开→安装→成功运行”。
  - 至少 1 条失败路径测试（缺依赖/风险阻断）。
  - 性能基线记录：首屏、列表滚动、图片加载。
- 接口/命令（建议）：
  - `npm run test:e2e`（或新增 `test:e2e`）

### T11 Marketplace Data DB Hosting
- 验收标准：
  - 前端不再加载 70MB+ JSON 文件。
  - 应用启动后后台自动同步/导入数据。
  - 市场列表滚动流畅，搜索响应 < 100ms。
- 接口/命令（建议）：
  - `get_marketplace_skills` (page, page_size, query)


