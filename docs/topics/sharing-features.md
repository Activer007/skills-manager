# 🎉 Skill Master 分享功能完整指南

**文档版本**: 2.0
**更新日期**: 2026-02-06
**相关版本**: v2.5.0 - v2.6.2

---

## 📋 概述

Skill Master 提供完整的分享生态系统，让用户可以轻松分享和发现 Skills。

**核心功能**：
- ✅ **6 种分享方式**：链接、文本、图片、包导出、嵌入代码、发布到市场
- ✅ **Share Sheet 统一入口**
- ✅ **分享链接系统**（生成、解析、预览、安装）
- ✅ **实时进度显示**
- ✅ **QR 码识别**（前端 jsQR 实现）
- ✅ **修改检测**（SHA-256 校验）

---

## 1. 分享功能演进历史

### v2.5.0 - Skill 分享功能（Phase 1-5）

| Phase | 功能 | 说明 |
|-------|------|------|
| **Phase 1** | 文本分享 | 支持多平台（Twitter、微博、Mastodon） |
| **Phase 2** | 图片分享 | 多主题卡片、QR 码生成 |
| **Phase 3** | 从图片导入 | QR 码识别、数据解析（前端实现） |
| **Phase 4** | 修改检测 | SHA-256 校验、GitHub 元数据持久化 |
| **Phase 5** | 包导出/导入 | .zip 包离线分享 |

### v2.6.0 - Share-First 生态

| 功能 | 说明 |
|------|------|
| **Share Sheet** | 统一分享入口，整合 6 种方式 |
| **Share Link** | 分享链接系统（生成、解析、预览） |
| **SharePreview** | 分享预览页面（`/share/:shareId`） |
| **任务管理集成** | 实时进度显示 |
| **useShare Hook** | 统一分享逻辑 |

### v2.6.2 - 新增功能

| 功能 | 说明 |
|------|------|
| **ShareEmbedPanel** | 嵌入代码生成（Markdown/HTML/BBCode） |
| **集合包导出** | `export_collection_package` 支持收藏集合导出 |
| **发布向导集成** | 直接从 ShareSheet 发布到市场 |

---

## 2. 技术架构

### 2.1 前端组件

```
src/
├── components/
│   ├── ShareSheet/           # 统一分享入口
│   │   ├── ShareSheet.tsx
│   │   ├── ShareTextPanel.tsx
│   │   ├── ShareImagePanel.tsx
│   │   ├── SharePackagePanel.tsx
│   │   ├── ShareEmbedPanel.tsx    # 嵌入代码面板（新增）
│   │   └── __tests__/
│   ├── ShareTextDialog.tsx   # 文本分享对话框（旧版，保留兼容）
│   └── ShareImageDialog.tsx  # 图片分享对话框（旧版，保留兼容）
├── utils/
│   ├── shareTextGenerator.ts   # 文本生成器
│   ├── shareCardGenerator.ts   # 卡片生成器
│   ├── shareLink.ts            # 链接工具
│   ├── qrCodeImporter.ts       # QR 码识别（jsQR）
│   └── embedCardGenerator.ts   # 嵌入卡片生成器
├── hooks/
│   └── useShare.ts             # 统一分享 Hook
├── pages/
│   └── SharePreview.tsx        # 分享预览页面
└── types/
    └── share.ts                # 分享类型定义
```

### 2.2 后端命令

**分享链接系统**（`src-tauri/src/commands/share.rs`）：
| 命令 | 功能 |
|------|------|
| `generate_share_link` | 生成分享链接（返回 share_id，UUID v4） |
| `resolve_share_link` | 解析分享链接（返回 ShareRecord） |
| `get_git_remote_url` | 获取本地仓库的远程 URL |

**包管理命令**（`src-tauri/src/commands/package_cmds.rs`）：
| 命令 | 功能 |
|------|------|
| `calculate_skill_checksum` | 计算 SHA-256 校验和 |
| `export_skill_package` | 导出单个 Skill 为 .skillpack.zip |
| `import_skill_package` | 从 .zip 包导入 Skill |
| `export_collection_package` | 导出收藏集合为 .collection.zip（新增） |

**导入命令**（`src-tauri/src/commands/import_cmds.rs`）：
| 命令 | 功能 |
|------|------|
| `import_github_skill_with_progress` | 带进度的 GitHub 导入（5 阶段进度） |

> **注意**：QR 码识别由前端使用 `jsQR` 库直接处理，不需要后端命令。

### 2.3 数据结构

```typescript
// ShareMetadata - 分享元数据
interface ShareMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  source_url?: string;  // GitHub 仓库链接（主要字段）
  url?: string;         // @deprecated: 已废弃，向后兼容
  security_score?: number;
  security_level?: string;
}

// ShareRecord - 分享记录（后端返回）
interface ShareRecord {
  share_id: string;       // UUID v4
  metadata: ShareMetadata;
  created_at: string;
  expires_at?: string;
}

// ShareImageData - QR 码嵌入数据结构
interface ShareImageData {
  version: string;
  type: string;          // "skill"
  data: {
    id: string;
    name: string;
    sourceUrl?: string;
    installUrl?: string;
    description: string;
    author?: string;
  };
  timestamp: number;
  signature?: string;
}
```

---

## 3. 分享方式详解

### 3.1 链接分享（推荐）⭐

**特点**：
- ✅ 最简单（一键复制）
- ✅ 最安全（实时验证）
- ✅ 最丰富（包含所有信息）

**流程**：
```
点击分享 → 生成链接 → 复制到剪贴板
```

**示例**：
```
https://skillmaster.example/share/abc123-def4-5678-9012
```

### 3.2 文本分享

**平台支持**：
- Twitter / X（280 字符限制）
- 微博（140 字符限制）
- Mastodon（500 字符限制）
- Markdown（无限制）
- 通用文本（自定义）

**模板**：
```
🎉 发现一个超赞的 Skill！

【Skill 名称】
描述：...
评分：⭐ 95分 (A)
安全：✅ 安全

链接：https://...
```

### 3.3 图片分享

**主题**：
- 默认（彩色渐变）- 适合社交媒体
- 简约（黑白）- 适合文档嵌入
- 暗色（深色模式）- 适合夜间模式

**包含内容**：
- Skill 名称和描述
- QR 码（可扫描导入）
- 质量评分和安全等级
- 作者和版本信息

**生成流程**：
```
HTML 模板 → Canvas 渲染 → PNG 下载
```

### 3.4 包导出

**文件格式**：`.skillpack.zip`

**包含内容**：
- `SKILL.md` - Skill 说明文档
- `skill-package.json` - 元数据文件
- 可选依赖文件（跳过 node_modules、.git 等）

**安全特性**：
- ✅ SHA-256 完整性校验
- ✅ 路径验证（防止穿越攻击）
- ✅ 文件大小限制（默认 2MB）
- ✅ 恶意文件检测

**集合包导出**（新增）：
- 文件格式：`.collection.zip`
- 支持导出整个收藏集合
- 包含多个 Skills 和集合元数据

### 3.5 嵌入代码（新增）✨

**支持格式**：
- Markdown
- HTML
- BBCode（论坛）

**主题选项**：
- Light（浅色）
- Dark（深色）
- Auto（自动跟随系统）

**尺寸选项**：
- Compact（紧凑）
- Normal（正常）
- Full（完整）

**示例（Markdown）**：
```markdown
[![Skill Name](https://skillmaster.example/card/abc123.png)](https://skillmaster.example/share/abc123)
```

### 3.6 发布到市场（新增）✨

**功能**：
- 集成 PublishWizard 组件
- 4 步发布流程（Preflight → Metadata → Publishing → Success）
- 自动安全扫描（Strict 模式）
- 发布历史记录系统
- Mock API 集成（便于开发测试）

---

## 4. Share Link 工作流程

### 4.1 生成分享链接

```
用户点击"分享"
  → useShare(skill) 自动生成
  → 调用 generate_share_link
  → 后端生成 UUID v4 作为 share_id
  → 存储元数据到 SQLite 数据库
  → 返回 share_id
  → 构建完整 URL
  → 复制链接到剪贴板
```

### 4.2 解析和安装

```
用户打开分享链接 /share/:shareId
  → SharePreview.tsx 渲染
  → 调用 resolve_share_link(shareId)
  → 后端查询数据库返回 ShareRecord
  → 显示 Skill 信息卡片
  → URL 验证（检查 source_url 是否为有效 GitHub URL）
  → 用户点击"安装"
  → 显示安装目标选择（System / Project）
  → 调用 import_github_skill_with_progress
  → 实时进度显示（5 个阶段）
  → 安装完成或错误处理
```

### 4.3 进度显示

| 阶段 | 进度范围 | 说明 |
|------|---------|------|
| **Queued** | 0% | 任务排队 |
| **Preparing** | 0-10% | 准备阶段 |
| **Downloading** | 10-40% | 下载仓库 |
| **Scanning** | 40-70% | 安全扫描 |
| **Installing** | 70-90% | 安装 Skill |
| **Completed** | 100% | 完成或失败 |
| **Failed** | - | 失败状态 |

---

## 5. QR 码识别功能

### 5.1 实现方式

**前端实现**（`src/utils/qrCodeImporter.ts`）：
- 使用 `jsQR` 库进行 QR 码识别
- 无需后端命令支持
- 完全在浏览器中处理

### 5.2 工作流程

```
用户上传或拖拽分享图片
  → FileReader 读取图片
  → jsQR 解析 QR 码
  → 提取数据字符串
  → atob + decodeURIComponent 解码
  → JSON.parse 解析数据
  → 验证 ShareImageData 结构
  → 提取 Skill 信息
  → 调用 import_github_skill 导入
```

### 5.3 数据验证

- ✅ 版本号检查
- ✅ 数据类型检查
- ✅ 必需字段验证
- ✅ 错误提示和处理

---

## 6. 字段映射规范

**重要**：ShareMetadata 字段映射已在 v2.6.0+ 统一

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | Skill 名称 |
| `description` | string | ✅ | Skill 描述 |
| `version` | string | ✅ | 版本号（默认 "1.0.0"） |
| `author` | string? | ❌ | 作者名称 |
| `source_url` | string? | ❌ | **主要字段**：GitHub 仓库链接 |
| `url` | string? | ❌ | **@deprecated**：已废弃，向后兼容 |
| `security_score` | number? | ❌ | 质量评分（0-100） |
| `security_level` | string? | ❌ | 安全等级（safe/risk/blocked/unknown） |

**向前兼容策略**：
- 生成时仅设置 `source_url`
- 解析时优先使用 `source_url`，回退到 `url`
- 安装 URL：`source_url || url || fallback`

---

## 7. 边界情况处理

### 7.1 缺少 source_url

**处理**：显示黄色警告
```
⚠️ 无法安装 - 此分享链接缺少源地址信息
```
**操作**：禁用安装按钮

### 7.2 非 GitHub URL

**处理**：显示蓝色警告
```
ℹ️ 非标准 GitHub 链接 - 安装可能失败，请谨慎操作
```
**操作**：允许安装，但提示风险

### 7.3 无效链接

**处理**：
- shareId 不存在 → "链接已过期或不存在"
- shareId 格式错误（非 UUID v4）→ "无效的分享链接格式"
- 网络错误 → "加载分享内容失败，请稍后重试"

### 7.4 安装失败

**处理**：
- 显示错误消息
- 提供重试按钮
- 返回到预览页面

---

## 8. 安全特性

### 8.1 修改检测

**SHA-256 校验和比对**：
- 持久化 GitHub 来源元数据
- 检测本地 Skill 是否被修改
- 提醒用户更新分享

**实现**：
- 后端命令：`calculate_skill_checksum`
- 前端 Hook：`useShare` 自动检测
- UI 提示：显示"本地已修改"警告

### 8.2 安全扫描

**自动扫描**：
- 导入时自动执行安全检查
- 显示安全等级（safe/risk/blocked）
- 显示安全评分（0-100）
- Critical 级别规则阻止安装

### 8.3 包导入安全

**安全检查**：
- ✅ 文件路径验证（防止穿越）
- ✅ 文件大小限制
- ✅ 恶意文件检测
- ✅ SHA-256 完整性验证

---

## 9. 相关资源

### 文档
- [产品需求文档 v2 (Share-First PRD)](../verification/prd-v2.md)
- [任务路线图](../TASK-ROADMAP.md)
- [分享类型定义](../../src/types/share.ts)

### 代码
- `src/components/ShareSheet/` - 分享组件
- `src/utils/share*.ts` - 分享工具
- `src/utils/qrCodeImporter.ts` - QR 码识别
- `src/utils/embedCardGenerator.ts` - 嵌入卡片生成
- `src/hooks/useShare.ts` - 分享 Hook
- `src/pages/SharePreview.tsx` - 预览页面

### 后端
- `src-tauri/src/commands/share.rs` - 分享链接命令
- `src-tauri/src/services/share_service.rs` - 分享服务
- `src-tauri/src/commands/package_cmds.rs` - 包管理命令
- `src-tauri/src/services/package_service.rs` - 包服务

---

**最后更新**: 2026-02-06
