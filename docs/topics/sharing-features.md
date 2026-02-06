# 🎉 Skill Master 分享功能完整指南

**文档版本**: 1.0
**更新日期**: 2026-02-06
**相关版本**: v2.5.0 - v2.6.0

---

## 📋 概述

Skill Master 提供完整的分享生态系统，让用户可以轻松分享和发现 Skills。

**核心功能**：
- ✅ **4 种分享方式**：链接、文本、图片、包导出
- ✅ **Share Sheet 统一入口**
- ✅ **分享链接系统**（生成、解析、预览、安装）
- ✅ **实时进度显示**
- ✅ **QR 码识别**
- ✅ **修改检测**

---

## 1. 分享功能演进历史

### v2.5.0 - Skill 分享功能（Phase 1-5）

| Phase | 功能 | 说明 |
|-------|------|------|
| **Phase 1** | 文本分享 | 支持多平台（Twitter、微博、Mastodon） |
| **Phase 2** | 图片分享 | 多主题卡片、QR 码生成 |
| **Phase 3** | 从图片导入 | QR 码识别、数据解析 |
| **Phase 4** | 修改检测 | SHA-256 校验、GitHub 元数据持久化 |
| **Phase 5** | 包导出/导入 | .zip 包离线分享 |

### v2.6.0 - Share-First 生态

| 功能 | 说明 |
|------|------|
| **Share Sheet** | 统一分享入口，整合 4 种方式 |
| **Share Link** | 分享链接系统（生成、解析、预览） |
| **SharePreview** | 分享预览页面（`/share/:shareId`） |
| **任务管理集成** | 实时进度显示 |
| **useShare Hook** | 统一分享逻辑 |

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
│   │   └── SharePackagePanel.tsx
│   ├── ShareTextDialog.tsx   # 文本分享对话框（旧版）
│   └── ShareImageDialog.tsx  # 图片分享对话框（旧版）
├── utils/
│   ├── shareTextGenerator.ts # 文本生成器
│   ├── shareCardGenerator.ts # 卡片生成器
│   └── shareLink.ts          # 链接工具
├── hooks/
│   └── useShare.ts           # 统一分享 Hook
├── pages/
│   └── SharePreview.tsx      # 分享预览页面
└── types/
    └── share.ts              # 分享类型定义
```

### 2.2 后端命令

| 命令 | 功能 |
|------|------|
| `generate_share_link` | 生成分享链接（返回 share_id） |
| `resolve_share_link` | 解析分享链接（返回 ShareRecord） |
| `calculate_skill_checksum` | 计算 SHA-256 校验和 |
| `export_skill_package` | 导出 .zip 包 |
| `import_skill_package` | 导入 .zip 包 |
| `parse_share_image_qr` | 解析 QR 码 |
| `import_github_skill_with_progress` | 带进度的导入 |

### 2.3 数据结构

```typescript
// ShareMetadata - 分享元数据
interface ShareMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  source_url?: string;  // GitHub 仓库链接
  security_score?: number;
  security_level?: string;
}

// ShareRecord - 分享记录（后端返回）
interface ShareRecord {
  share_id: string;
  metadata: ShareMetadata;
  created_at: string;
}
```

---

## 3. 分享方式详解

### 3.1 链接分享（推荐）

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
https://skillmaster.example/share/abc123
```

### 3.2 文本分享

**平台支持**：
- Twitter / X
- 微博
- Mastodon
- Markdown

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
- 默认（彩色渐变）
- 简约（黑白）
- 暗色（深色模式）

**包含内容**：
- Skill 名称和描述
- QR 码（可扫描导入）
- 质量评分和安全等级

**生成流程**：
```
HTML → Canvas → PNG
```

### 3.4 包导出

**文件格式**：`.zip`

**包含内容**：
- SKILL.md
- 元数据文件
- 可选依赖文件

**安全特性**：
- 路径验证（防止穿越）
- 文件大小限制（2MB）
- 恶意文件检测

---

## 4. Share Link 工作流程

### 4.1 生成分享链接

```
用户点击"分享"
  → useShare(skill) 自动生成
  → 调用 generate_share_link
  → 存储元数据到数据库
  → 返回 share_id
  → 复制链接到剪贴板
```

### 4.2 解析和安装

```
用户打开分享链接
  → SharePreview.tsx 渲染
  → 调用 resolve_share_link
  → 显示 Skill 信息
  → 用户点击"安装"
  → 调用 import_github_skill_with_progress
  → 实时进度显示（5 个阶段）
  → 安装完成
```

### 4.3 进度显示

| 阶段 | 说明 |
|------|------|
| **Preparing** | 准备（0-10%） |
| **Downloading** | 下载（10-40%） |
| **Scanning** | 扫描（40-70%） |
| **Installing** | 安装（70-90%） |
| **Completed** | 完成（100%） |

---

## 5. 字段映射规范

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

---

## 6. 边界情况处理

### 6.1 缺少 source_url

**处理**：显示黄色警告
```
⚠️ 无法安装 - 此分享链接缺少源地址信息
```
**操作**：禁用安装按钮

### 6.2 非 GitHub URL

**处理**：显示蓝色警告
```
ℹ️ 非标准 GitHub 链接 - 安装可能失败，请谨慎操作
```
**操作**：允许安装，但提示风险

### 6.3 无效链接

**处理**：
- shareId 不存在 → "链接已过期或不存在"
- shareId 格式错误 → "无效的分享链接格式"

---

## 7. 安全特性

### 7.1 修改检测

**SHA-256 校验和比对**：
- 持久化 GitHub 来源元数据
- 检测本地修改
- 提醒用户更新分享

### 7.2 安全扫描

**自动扫描**：
- 导入时自动执行安全检查
- 显示安全等级和评分
- 危险操作阻止安装

---

## 8. 相关资源

### 文档
- [产品需求文档 v2 (Share-First PRD)](../prd-v2.md)
- [任务路线图](../TASK-ROADMAP.md)
- [分享类型定义](../../src/types/share.ts)

### 代码
- `src/components/ShareSheet/` - 分享组件
- `src/utils/share*.ts` - 分享工具
- `src/hooks/useShare.ts` - 分享 Hook
- `src/pages/SharePreview.tsx` - 预览页面

---

**最后更新**: 2026-02-06
