# 🎨 Skill Master UI/UX 设计体系

**文档版本**: 1.0
**更新日期**: 2026-02-06
**设计语言**: Antigravity Core

---

## 📋 概述

Skill Master 采用现代化的设计语言，提供清晰、一致、高效的用户体验。

**核心设计原则**：
- ✅ **简洁优先**：减少认知负担，突出核心功能
- ✅ **一致性**：统一的组件库和交互模式
- ✅ **可访问性**：100% 键盘导航支持
- ✅ **响应式**：适配不同屏幕尺寸

---

## 1. 设计系统基础

### 1.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tailwind CSS** | 3.4 | 原子化 CSS 框架 |
| **DaisyUI** | 5.5 | UI 组件库 |
| **Lucide React** | 最新 | 图标库 |
| **Framer Motion** | 最新 | 动画库 |
| **Recharts** | 3.6 | 数据可视化 |

### 1.2 主题配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',    // Indigo 500
        secondary: '#8b5cf6',  // Violet 500
        accent: '#ec4899',     // Pink 500
        success: '#10b981',     // Emerald 500
        warning: '#f59e0b',     // Amber 500
        danger: '#ef4444',      // Red 500
      }
    }
  }
}
```

---

## 2. 核心组件库

### 2.1 Button 组件

统一的按钮组件，支持多种变体和尺寸。

**变体**：
- `primary` - 主要操作
- `secondary` - 次要操作
- `ghost` - 幽灵按钮
- `outline` - 轮廓按钮

**尺寸**：
- `sm` - 小号（紧凑布局）
- `md` - 中号（默认）
- `lg` - 大号（CTA）

**可访问性**：
- ✅ Tab 键导航
- ✅ Enter/Space 激活
- ✅ 焦点可见
- ✅ `data-testid` 属性

```tsx
<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  data-testid="install-button"
>
  安装 Skill
</Button>
```

### 2.2 Badge 组件

状态徽章，用于显示等级、标签等。

**类型**：
- `quality` - 质量等级（S/A/B/C/D）
- `security` - 安全等级（safe/risk/blocked）
- `status` - 状态徽章

```tsx
<Badge type="quality" grade="A" />
<Badge type="security" level="safe" />
```

### 2.3 Card 组件

卡片容器，统一的内容展示单元。

```tsx
<Card>
  <CardHeader>
    <CardTitle>Skill 名称</CardTitle>
    <CardDescription>描述文本</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
  <CardFooter>
    {/* 底部操作 */}
  </CardFooter>
</Card>
```

---

## 3. UI/UX 改进历程

### 3.1 按钮改进（v2.6.1）

**改进内容**：
- ✅ 统一 Button 组件使用（8 个文件优化）
- ✅ 事件冒泡处理改进
- ✅ 键盘可访问性增强（100% 覆盖）
- ✅ 测试 ID 覆盖率 100%

**影响文件**：
- ShareSheet.tsx
- SkillCard.tsx
- MySkills.tsx
- 等 8 个组件

### 3.2 主题迁移

**Antigravity Core 设计语言**：
- 统一的 Tailwind Config 主题
- `cn()` 工具函数（类名合并）
- MainLayout 重构（Sidebar + DragRegion）

---

## 4. 页面布局

### 4.1 MainLayout

```
┌─────────────────────────────────────┐
│  DragRegion (Windows 标题栏拖拽区)  │
├──────┬──────────────────────────────┤
│      │                              │
│ Side │                              │
│ bar  │    Main Content Area         │
│      │                              │
│      │                              │
└──────┴──────────────────────────────┘
```

### 4.2 页面类型

| 页面 | 布局 | 说明 |
|------|------|------|
| **My Skills** | List 布局 | 带搜索、筛选、SlideOver |
| **Marketplace** | Grid 布局 | 虚拟滚动、Hero Banner |
| **Security** | Dashboard | 图表、统计、列表 |
| **Task Center** | Tabs | 任务列表、进度条 |

---

## 5. 交互模式

### 5.1 导航

- **Sidebar** - 主导航（我的 Skills、市场、安全中心等）
- **Breadcrumb** - 面包屑导航（ Skill 详情）
- **Tabs** - 标签页切换（任务中心）

### 5.2 反馈

- **Toast** - Sonner 通知系统
- **Progress** - 线性进度条
- **Skeleton** - 骨架屏加载
- **Modal** - 模态对话框

### 5.3 数据录入

- **Form** - 表单组件
- **Input** - 文本输入
- **Select** - 下拉选择
- **Switch** - 切换开关

---

## 6. UI 升级路线图

### ✅ 已完成

| Phase | 内容 | 完成度 |
|-------|------|--------|
| **Phase 1** | 设计系统统一 | 100% |
| **Phase 2** | 核心组件库 | 100% |
| **Phase 3** | Marketplace 重构 | 100% |
| **Phase 4** | My Skills 页面重构 | 100% |
| **Phase 5** | 设计文档完善 | 100% |
| **Phase 6** | 按钮改进 | 100% |

### 📋 可选增强（未来版本）

- [ ] 深色模式
- [ ] 动画优化
- [ ] 移动端适配
- [ ] 主题系统扩展

---

## 7. 设计规范

### 7.1 间距系统

使用 Tailwind 的间距单位：

```tsx
<div className="p-4">  {/* 16px */}
<div className="gap-2">  {/* 8px */}
<div className="my-6">  {/* 24px */}
```

### 7.2 字体系统

```tsx
<h1 className="text-2xl font-bold">标题</h1>
<p className="text-base text-gray-600">正文</p>
<span className="text-sm text-gray-500">辅助文本</span>
```

### 7.3 颜色使用

```tsx
{/* 语义化颜色 */}
<Button variant="primary">主要操作</Button>
<Badge type="security" level="safe">安全</Badge>
<Alert type="warning">警告信息</Alert>
```

---

## 8. 可访问性

### 8.1 键盘导航

- ✅ Tab 键遍历所有可交互元素
- ✅ Enter/Space 激活按钮和链接
- ✅ Escape 关闭模态框和抽屉
- ✅ 方向键导航列表

### 8.2 焦点管理

```tsx
<button
  onFocus={() => console.log('focused')}
  onBlur={() => console.log('blurred')}
  className="focus:ring-2 focus:ring-primary"
>
  Focus Visible
</button>
```

### 8.3 ARIA 属性

```tsx
<button
  aria-label="关闭对话框"
  aria-expanded={isOpen}
  aria-controls="dialog-panel"
>
  关闭
</button>
```

---

## 9. 相关资源

### 文档
- [设计系统](../DESIGN_SYSTEM.md)
- [UI 路线图](../reports/ui/UI-ROADMAP.md)
- [按钮改进报告](../reports/ui/BUTTON_IMPROVEMENTS.md)
- [UI/UX 分析报告](../reports/planning/UI-UX-ANALYSIS-REPORT.md)

### 代码
- `src/components/` - 组件库
- `src/utils/cn.ts` - 类名工具函数
- `tailwind.config.js` - Tailwind 配置

---

**最后更新**: 2026-02-06
