# Skill Manager 设计系统

> 版本: 1.1.0
> 更新日期: 2026-01-18
> 状态: Phase 3 已完成 ✅

本文档定义了 Skill Manager 应用的统一设计规范，确保整个应用的视觉一致性和可维护性。

---

## 📐 设计令牌（Design Tokens）

设计令牌是设计系统的核心，定义了所有视觉相关的变量。

### 1. 间距系统（Spacing）

基于 Tailwind 默认间距，定义明确的使用场景：

| Token | 值 | CSS 变量 | 使用场景 | Tailwind 类 |
|-------|---|---------|---------|-----------|
| `xs` | 4px | `--spacing-xs` | 最小间距，紧密元素 | `space-xs`, `gap-xs` |
| `sm` | 8px | `--spacing-sm` | 紧密元素，图标与文字 | `space-sm`, `gap-sm` |
| `md` | 16px | `--spacing-md` | 舒适间距，卡片内边距 | `space-md`, `gap-md` |
| `lg` | 24px | `--spacing-lg` | 大间距，区块分隔 | `space-lg`, `gap-lg` |
| `xl` | 32px | `--spacing-xl` | 超大间距，页面级 | `space-xl`, `gap-xl` |
| `2xl` | 48px | `--spacing-2xl` | 特大间距 | `space-2xl`, `gap-2xl` |
| `3xl` | 64px | `--spacing-3xl` | 巨大间距 | `space-3xl`, `gap-3xl` |

**使用示例**:
```tsx
<div className="space-y-md">      {/* 16px 垂直间距 */}
<div className="flex gap-sm">      {/* 8px 水平间距 */}
<div className="p-lg">            {/* 24px 内边距 */}
```

---

### 2. 圆角系统（Border Radius）

统一使用 `rounded-md` 和 `rounded-lg`：

| Token | 值 | CSS 变量 | 使用场景 | Tailwind 类 |
|-------|---|---------|---------|-----------|
| `none` | 0 | `--radius-none` | 禁用圆角 | `rounded-none` |
| `sm` | 4px | `--radius-sm` | 小元素（tag、badge） | `rounded-sm` |
| `md` | 8px | `--radius-md` | 按钮、输入框（主要使用） | `rounded-md` |
| `lg` | 12px | `--radius-lg` | 卡片（主要使用） | `rounded-lg` |
| `xl` | 16px | `--radius-xl` | 对话框 | `rounded-xl` |
| `2xl` | 24px | `--radius-2xl` | 特殊容器 | `rounded-2xl` |
| `full` | 9999px | `--radius-full` | 圆形（徽章、头像） | `rounded-full` |

**使用指南**:
- **默认圆角**: `rounded-md` (8px) - 适用于按钮、输入框
- **卡片圆角**: `rounded-lg` (12px) - 适用于卡片、面板
- **对话框圆角**: `rounded-xl` (16px) - 适用于 Modal、Drawer
- **避免使用**: `rounded-2xl` (24px) - 仅特殊场景使用

---

### 3. 阴影系统（Box Shadow）

明确的深度层级，从浅到深：

| Token | 值 | CSS 变量 | 使用场景 | Tailwind 类 |
|-------|---|---------|---------|-----------|
| `xs` | 0 1px 2px | `--shadow-xs` | 极浅阴影（少用） | `shadow-xs` |
| `sm` | 0 1px 3px | `--shadow-sm` | 卡片默认阴影 | `shadow-sm` |
| `md` | 0 4px 6px | `--shadow-md` | 悬停状态 | `shadow-md` |
| `lg` | 0 10px 15px | `--shadow-lg` | Toast | `shadow-lg` |
| `xl` | 0 20px 25px | `--shadow-xl` | 弹出层 | `shadow-xl` |
| `2xl` | 0 25px 50px | `--shadow-2xl` | 对话框 | `shadow-2xl` |

**彩色阴影**（用于按钮等元素）:
```tsx
shadow-blue    // 蓝色按钮阴影
shadow-green   // 绿色按钮阴影
shadow-red     // 红色按钮阴影
shadow-amber   // 橙色按钮阴影
```

**使用指南**:
- **默认**: `shadow-sm` - 所有卡片
- **悬停**: `hover:shadow-md` - 卡片、按钮悬停
- **对话框**: `shadow-2xl` - Modal、Drawer
- **按钮**: `shadow-sm hover:shadow-md` - 主要按钮、次要按钮

---

### 4. 字体系统（Typography）

#### 字体大小

| Token | 值 | 行高 | 使用场景 | Tailwind 类 |
|-------|---|------|---------|-----------|
| `xs` | 12px | 1rem | 说明文字、标签 | `text-xs` |
| `sm` | 14px | 1.25rem | 正文、默认字号 | `text-sm` |
| `base` | 16px | 1.5rem | 基础字号 | `text-base` |
| `lg` | 18px | 1.75rem | 副标题 | `text-lg` |
| `xl` | 20px | 1.75rem | 标题 | `text-xl` |
| `2xl` | 24px | 2rem | 大标题 | `text-2xl` |
| `3xl` | 30px | 2.25rem | 特大标题 | `text-3xl` |
| `4xl` | 36px | 2.5rem | 巨大标题 | `text-4xl` |

#### 字重

| Token | 值 | 使用场景 | Tailwind 类 |
|-------|---|---------|-----------|
| `normal` | 400 | 正文 | `font-normal` |
| `medium` | 500 | 中等强调 | `font-medium` |
| `semibold` | 600 | 半粗体 | `font-semibold` |
| `bold` | 700 | 粗体、标题 | `font-bold` |

**使用指南**:
- **标题**: `text-lg font-bold` 或 `text-xl font-bold`
- **正文**: `text-sm font-medium` 或 `text-base font-normal`
- **说明**: `text-xs` 或 `text-sm text-slate-500`

---

### 5. 颜色系统（Color）

#### 语义化颜色

| 颜色 | 用途 | 亮色模式 | 暗色模式 |
|-----|------|---------|---------|
| Primary | 主按钮、链接 | `#3b82f6` (blue-500) | `#3b82f6` |
| Primary Hover | 主按钮悬停 | `#2563eb` (blue-600) | `#2563eb` |
| Secondary | 次要按钮 | `#64748b` (slate-500) | `#94a3b8` |
| Success | 成功状态 | `#10b981` (emerald-500) | `#10b981` |
| Warning | 警告状态 | `#f59e0b` (amber-500) | `#f59e0b` |
| Error | 错误状态 | `#ef4444` (red-500) | `#ef4444` |
| Info | 信息状态 | `#0ea5e9` (sky-500) | `#0ea5e9` |

#### 文本颜色

| 场景 | 亮色模式 | 暗色模式 | CSS 变量 | Tailwind 类 |
|-----|---------|---------|---------|-----------|
| 主文本 | `#111827` | `#f9fafb` | `--text-primary` | `text-gray-900` / `dark:text-gray-50` |
| 次要文本 | `#374151` | `#d1d5db` | `--text-secondary` | `text-gray-700` / `dark:text-gray-300` |
| 三级文本 | `#6b7280` | `#9ca3af` | `--text-tertiary` | `text-gray-500` / `dark:text-gray-400` |
| 禁用文本 | `#9ca3af` | `#6b7280` | `--text-disabled` | `text-gray-400` / `dark:text-gray-500` |

#### 背景颜色

| 场景 | 亮色模式 | 暗色模式 | CSS 变量 | Tailwind 类 |
|-----|---------|---------|---------|-----------|
| 主背景 | `#ffffff` | `#0f172a` | `--bg-primary` | `bg-white` / `dark:bg-base-100` |
| 次背景 | `#f9fafb` | `#1e293b` | `--bg-secondary` | `bg-gray-50` / `dark:bg-base-200` |
| 三级背景 | `#f3f4f6` | `#334155` | `--bg-tertiary` | `bg-gray-100` / `dark:bg-base-300` |

#### 边框颜色

| 场景 | 亮色模式 | 暗色模式 | CSS 变量 | Tailwind 类 |
|-----|---------|---------|---------|-----------|
| 默认边框 | `#e5e7eb` | `#334155` | `--border-color` | `border-gray-200` / `dark:border-base-300` |
| 深色边框 | `#d1d5db` | `#475569` | `--border-color-dark` | `border-gray-300` / `dark:border-base-400` |

---

### 6. 动画系统（Animation）

#### 动画时长

| Token | 值 | CSS 变量 | 使用场景 | Tailwind 类 |
|-------|---|---------|---------|-----------|
| `fast` | 150ms | `--duration-fast` | 快速过渡 | `duration-fast` |
| `normal` | 200ms | `--duration-normal` | 标准过渡（主要使用） | `duration-normal` |
| `slow` | 300ms | `--duration-slow` | 慢速过渡 | `duration-slow` |
| `slower` | 500ms | `--duration-slower` | 更慢过渡 | `duration-slower` |

**使用指南**:
- **默认过渡**: `duration-normal` (200ms) - 所有标准交互
- **快速过渡**: `duration-fast` (150ms) - 微交互
- **慢速过渡**: `duration-slow` (300ms) - 复杂动画

#### 内置动画

| 动画名称 | 效果 | Tailwind 类 |
|---------|-----|-----------|
| `fade-in` | 淡入 | `animate-fade-in` |
| `fade-out` | 淡出 | `animate-fade-out` |
| `slide-in-from-top` | 从顶部滑入 | `animate-slide-in-from-top` |
| `slide-in-from-bottom` | 从底部滑入 | `animate-slide-in-from-bottom` |
| `slide-in-from-left` | 从左侧滑入 | `animate-slide-in-from-left` |
| `slide-in-from-right` | 从右侧滑入 | `animate-slide-in-from-right` |
| `zoom-in` | 缩放进入 | `animate-zoom-in` |
| `zoom-out` | 缩放退出 | `animate-zoom-out` |

**使用示例**:
```tsx
// Modal 进入动画
<div className="animate-in fade-in zoom-in-95 duration-normal">

// 页面过渡
<div className="animate-slide-in-from-bottom duration-normal">
```

---

### 7. Z-index 系统

明确的层级关系：

| Token | 值 | 使用场景 | Tailwind 类 |
|-------|---|---------|-----------|
| `dropdown` | 1000 | 下拉菜单 | `z-dropdown` |
| `sticky` | 1020 | 粘性元素 | `z-sticky` |
| `fixed` | 1030 | 固定元素 | `z-fixed` |
| `modal-backdrop` | 1040 | Modal 遮罩 | `z-modal-backdrop` |
| `modal` | 1050 | Modal 内容 | `z-modal` |
| `popover` | 1060 | Popover | `z-popover` |
| `tooltip` | 1070 | Tooltip | `z-tooltip` |
| `toast` | 1080 | Toast 通知 | `z-toast` |

---

## 🎨 组件样式规范

### Button（按钮）

#### 尺寸

| 尺寸 | 高度 | 字号 | 内边距 | 使用场景 |
|-----|------|------|--------|---------|
| `xs` | 24px | 12px | px-2 py-1 | 紧凑按钮 |
| `sm` | 32px | 14px | px-3 py-1.5 | 小按钮 |
| `md` | 40px | 14px | px-4 py-2 | 标准按钮（默认） |
| `lg` | 48px | 16px | px-6 py-3 | 大按钮 |

#### 变体

| 变体 | 样式 | 使用场景 |
|-----|------|---------|
| `primary` | 蓝色背景，白色文字，有阴影 | 主要操作 |
| `secondary` | 灰色背景，白色文字，有阴影 | 次要操作 |
| `outline` | 透明背景，边框 | 轮廓按钮 |
| `ghost` | 透明背景，无阴影，悬停彩色 | 幽灵按钮 |
| `error` | 红色背景，白色文字，有阴影 | 危险操作 |
| `link` | 无背景，下划线 | 链接按钮 |

#### 样式规范

```tsx
// ✅ 正确使用
<Button variant="primary" size="md">保存</Button>
<Button variant="ghost" size="sm">取消</Button>
<Button variant="error" size="md">删除</Button>

// ❌ 错误使用
<Button className="rounded-2xl">  // 应该使用默认的 rounded-md
<Button className="duration-500">  // 应该使用 duration-normal
```

---

### Input（输入框）

#### 样式规范

```tsx
// ✅ 正确的 Input 样式
<Input
  label="邮箱地址"
  placeholder="请输入邮箱"
  error={errors.email}
  helperText="我们将向您的邮箱发送验证链接"
/>

// 统一的样式类：
// - rounded-md: 8px 圆角
// - duration-normal: 200ms 过渡
// - focus:ring-2: 2px 焦点环
// - focus:border-primary: 焦点时蓝色边框
```

---

### Card（卡片）

#### 样式规范

```tsx
// ✅ 正确的 Card 样式
<Card className="hover:shadow-md transition-all duration-normal">
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>内容</CardContent>
  <CardFooter>底部</CardFooter>
</Card>

// 统一的样式类：
// - rounded-lg: 12px 圆角
// - shadow-sm: 默认阴影
// - hover:shadow-md: 悬停时阴影
// - transition-all duration-normal: 标准过渡
```

---

### Modal（对话框）

#### 尺寸变体

| 尺寸 | 最大宽度 | 使用场景 |
|-----|---------|---------|
| `sm` | 384px (max-w-sm) | 小对话框 |
| `md` | 448px (max-w-md) | 中等对话框 |
| `lg` | 512px (max-w-lg) | 大对话框（默认） |
| `xl` | 576px (max-w-xl) | 超大对话框 |
| `full` | 100% (带边距) | 全屏对话框 |

#### 使用示例

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="对话框标题"
  size="lg"           // 尺寸变体
  animation={true}    // 开启动画（默认）
>
  对话框内容
</Modal>

// 统一的样式类：
// - rounded-lg: 12px 圆角
// - shadow-2xl: 对话框阴影
// - animate-in fade-in zoom-in-95: 进入动画
```

---

## 🚀 最佳实践

### 1. 间距使用

```tsx
// ✅ 推荐：使用预定义的间距
<div className="space-y-md gap-sm">
<div className="p-lg">

// ❌ 避免：使用自定义间距
<div className="space-y-[13px]">
<div className="p-[27px]">
```

### 2. 圆角使用

```tsx
// ✅ 推荐：使用预定义的圆角
<Button className="rounded-md">     // 8px
<Card className="rounded-lg">       // 12px
<Modal className="rounded-xl">      // 16px

// ❌ 避免：随意使用圆角
<Button className="rounded-2xl">    // 24px（过大的圆角）
<div className="rounded-[13px]">    // 自定义圆角
```

### 3. 阴影使用

```tsx
// ✅ 推荐：使用预定义的阴影
<Card className="shadow-sm hover:shadow-md">
<Button className="shadow-sm hover:shadow-md">
<Modal className="shadow-2xl">

// ❌ 避免：使用自定义阴影
<div className="shadow-[0_4px_6px]">
```

### 4. 过渡动画

```tsx
// ✅ 推荐：使用预定义的过渡时长
<Button className="transition-all duration-normal">
<Card className="transition-all duration-normal">

// ❌ 避免：使用自定义过渡时长
<Button className="transition-all duration-[213ms]">
```

### 5. 颜色使用

```tsx
// ✅ 推荐：使用语义化颜色
<Button className="bg-primary hover:bg-primary-hover">
<span className="text-primary">

// ❌ 避免：直接使用颜色值
<Button className="bg-[#3b82f6]">
<span className="text-blue-500">
```

---

## 📦 设计令牌文件

所有设计令牌定义在以下文件中：

### CSS 变量
- **文件**: `src/styles/design-tokens.css`
- **用途**: 定义所有 CSS 变量（间距、圆角、阴影、颜色等）
- **导入**: 在 `src/index.css` 顶部导入

### Tailwind 配置
- **文件**: `tailwind.config.js`
- **用途**: 扩展 Tailwind 默认配置
- **包含**: 自定义间距、圆角、阴影、动画等

---

## 🔧 工具函数

### `cn()` - 类名合并

使用 `clsx` + `tailwind-merge` 合并条件类名：

```tsx
import { cn } from '@/utils/cn';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes",
  className
)} />
```

---

## 🎨 新增组件（Phase 2）

### Tabs 组件

**文件**: `src/components/ui/Tabs.tsx`

#### 使用示例
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

// Underline variant（默认）
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList variant="underline">
    <TabsTrigger value="all">
      全部
      <Badge>12</Badge>
    </TabsTrigger>
    <TabsTrigger value="system">系统级</TabsTrigger>
  </TabsList>
  <TabsContent value="all">
    {/* 全部内容 */}
  </TabsContent>
  <TabsContent value="system">
    {/* 系统级内容 */}
  </TabsContent>
</Tabs>

// Pills variant
<Tabs value={activeTab} onValueChange={setActiveTab} variant="pills">
  <TabsList variant="pills">
    <TabsTrigger value="overview">概览</TabsTrigger>
    <TabsTrigger value="config">配置</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">{/* ... */}</TabsContent>
</Tabs>
```

#### Props
- **value**: 当前激活的 tab 值
- **onValueChange**: 值变化回调
- **variant**: `underline`（默认）或 `pills`
- **TabsTrigger badge**: 徽章数量

#### 特性
- ✅ 键盘导航（方向键切换）
- ✅ 徽章显示（badge）
- ✅ 进入动画（fade-in + zoom-in-95）
- ✅ 焦点环样式统一
- ✅ 暗色模式支持

---

### EmptyState 组件

**文件**: `src/components/ui/EmptyState.tsx`

#### 使用示例
```tsx
import { EmptyState } from '@/components/ui/EmptyState';

// Centered variant（默认）- 带边框
<EmptyState
  icon={<FolderOpen />}
  title="暂无数据"
  description="开始添加您的第一个项目吧"
  action={{
    label: '添加项目',
    onClick: handleAdd,
    variant: 'primary',
  }}
/>

// Minimal variant - 无边框
<EmptyState
  variant="minimal"
  icon={<Search />}
  title="未找到相关结果"
  description="尝试使用不同的关键词"
/>

// 内置预设
import { EmptyStateNoData, EmptyStateNoResults } from '@/components/ui/EmptyState';

<EmptyStateNoSkills
  action={{
    label: '浏览市场',
    onClick: () => navigate('/marketplace'),
  }}
/>
```

#### Props
- **icon**: 图标（React 节点）
- **title**: 标题
- **description**: 描述文本
- **action**: 操作按钮（可选）
- **variant**: `centered`（默认）或 `minimal`
- **size**: `sm` | `md` | `lg`

#### 内置预设
- `EmptyStateNoData` - 通用无数据
- `EmptyStateNoResults` - 搜索无结果
- `EmptyStateNoSkills` - 无 Skills
- `EmptyStateError` - 错误状态

---

### Progress 组件

**文件**: `src/components/ui/Progress.tsx`

#### 使用示例
```tsx
import { Progress, CircularProgress } from '@/components/ui/Progress';

// 线性进度条 - 默认变体
<Progress
  value={75}
  label="配额使用情况"
  showPercentage
  colorScheme="auto"
/>

// 分段变体（类似 Antigravity Manager）
<Progress
  value={75}
  label="G3 Pro"
  variant="segmented"
  showPercentage
  colorScheme="green"
/>

// 圆形进度条
<CircularProgress
  value={75}
  size="lg"
  showPercentage
  colorScheme="blue"
/>
```

#### Props
##### Progress Props
- **value**: 当前进度值（0-max）
- **max**: 最大值（默认 100）
- **size**: `sm` | `md` | `lg`
- **showLabel**: 显示标签
- **showPercentage**: 显示百分比
- **colorScheme**: `blue` | `green` | `orange` | `red` | `auto`
- **label**: 主标签文本
- **secondaryLabel**: 次标签文本
- **variant**: `default` | `segmented`

##### CircularProgress Props
- **value**: 当前进度值（0-max）
- **max**: 最大值（默认 100）
- **size**: `sm` | `md` | `lg`
- **showPercentage**: 显示百分比
- **colorScheme**: `blue` | `green` | `orange` | `red`
- **strokeWidth**: 圆环宽度（默认 8）

#### 特性
- ✅ 自动颜色编码（auto 模式）
  - ≥50%: 绿色
  - 20-50%: 橙色
  - <20%: 红色
- ✅ 平滑动画（700ms ease-out）
- ✅ 半透明背景填充
- ✅ 支持暗色模式

---

### Tooltip 组件

**文件**: `src/components/ui/Tooltip.tsx`

#### 使用示例
```tsx
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content="查看详情" side="top">
  <button>
    <Info className="w-4 h-4" />
  </button>
</Tooltip>

<Tooltip content="删除此项目" side="right" align="start">
  <button>
    <Trash2 className="w-4 h-4" />
  </button>
</Tooltip>

// 可选：不显示箭头
<Tooltip content="提示信息" arrow={false}>
  <button>按钮</button>
</Tooltip>
```

#### Props
- **content**: 提示内容
- **children**: 触发元素
- **delayDuration**: 延迟显示时间（默认 200ms）
- **side**: `top` | `right` | `bottom` | `left`
- **sideOffset**: 偏移距离（默认 8px）
- **align**: `start` | `center` | `end`
- **alignOffset**: 对齐偏移（默认 0）
- **arrow**: 是否显示箭头（默认 true）

#### 特性
- ✅ 基 Radix UI，可访问性优秀
- ✅ 智能定位（自动避免边界溢出）
- ✅ 统一的样式和动画
- ✅ 支持 HTML 内容

---

## 📝 检查清单

在提交代码前，请确保：

- [ ] 使用预定义的间距（`gap-sm`, `p-md` 等）
- [ ] 使用预定义的圆角（`rounded-md`, `rounded-lg` 等）
- [ ] 使用预定义的阴影（`shadow-sm`, `shadow-md` 等）
- [ ] 使用预定义的过渡时长（`duration-normal`）
- [ ] 使用语义化颜色（`bg-primary`, `text-error` 等）
- [ ] 组件有统一的焦点环（`focus:ring-2`）
- [ ] 暗色模式样式正常

---

## 🚧 未来改进

### Phase 2: 组件库补充 ✅ 已完成
- [x] 创建 Tabs 组件
- [x] 创建 EmptyState 组件
- [x] 创建 Progress 组件
- [x] 创建 Tooltip 组件
- [ ] 创建 Table 组件（待未来补充）

### Phase 3: 页面重构 ✅ 已完成
- [x] ScanHistory.tsx 重构
  - [x] 替换 dropdown 为 Tabs 组件
  - [x] 替换手写空状态为 EmptyState 组件
  - [x] 替换 radial-progress 为 CircularProgress
- [x] Security.tsx 重构
  - [x] 替换 DaisyUI card 为 Card 组件
  - [x] 添加空状态处理
- [x] Settings.tsx 评估（功能性为主，暂不重构）
- [x] Dashboard.tsx 评估（代码质量良好，无需重构）

**重构收益**:
- ✅ 减少重复代码约 90 行
- ✅ 提高视觉一致性
- ✅ 改善用户体验（一次点击筛选、友好的空状态）
- ✅ 增强可访问性（键盘导航、焦点环）

### Phase 4: 可访问性改进
- [ ] 添加 aria-label 支持
- [ ] 实现焦点 trap
- [ ] 优化键盘导航

---

## 📚 参考资源

- [Tailwind CSS 文档](https://tailwindcss.com/)
- [DaisyUI 文档](https://daisyui.com/)
- [Antigravity-Manager 项目](https://github.com/Activer007/Antigravity-Manager)

---

**维护者**: Skill Manager Team
**最后更新**: 2026-01-18 (Phase 3 完成)
