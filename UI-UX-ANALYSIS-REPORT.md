# Skill Manager UI/UX 对比分析与改进方案

> 基于 Antigravity-Manager 项目的参考分析，针对 Skill Manager 项目的全面 UI/UX 升级建议

**分析日期**: 2026-01-18
**分析范围**: 全项目 UI/UX 审查
**参考项目**: Antigravity-Manager

---

## 📊 执行摘要

### 核心发现

**优势** ✅
- 现代化技术栈（React 19 + Tauri v2 + Tailwind CSS）
- 良好的暗色模式支持
- 使用 DaisyUI 提供基础组件
- Framer Motion 动画流畅

**主要问题** ❌
- 缺乏统一的设计系统规范
- UI 组件库不完整（缺少 15+ 关键组件）
- 样式代码重复严重（卡片/空状态/Tab 等）
- 可访问性支持不足
- 国际化覆盖不完整

**改进优先级**
1. 🔴 **高优先级** - 设计系统统一化 + 缺失组件补充
2. 🟡 **中优先级** - 可访问性改进 + 交互增强
3. 🟢 **低优先级** - 性能优化 + 国际化完善

---

## 🎨 设计系统对比

### 1. Antigravity-Manager 设计规范

#### 1.1 间距系统
```javascript
基于 Tailwind 默认间距，明确使用场景：
- gap-1: 4px  (最小间距 - 紧密元素)
- gap-2: 8px  (紧密元素 - 图标与文字)
- gap-3: 12px (常规间距 - 表单元素)
- gap-4: 16px (舒适间距 - 卡片内边距)
- gap-6: 24px (大间距 - 区块分隔)
- gap-8: 32px (超大间距 - 页面级)
```

#### 1.2 圆角规范
```javascript
rounded-sm:   2px  // 小元素（tag、badge）
rounded:      4px  // 默认
rounded-md:   6px  // 中等
rounded-lg:   8px  // 按钮、输入框（主要使用）
rounded-xl:  12px  // 卡片（主要使用）
rounded-2xl: 16px  // 对话框
```

**关键发现**: Antigravity 主要使用 `rounded-lg (8px)` 和 `rounded-xl (12px)`

#### 1.3 阴影层级
```javascript
shadow-sm:    卡片、小元素
shadow-md:    悬停状态
shadow-lg:    Toast
shadow-xl:    弹出层
shadow-2xl:   对话框
```

#### 1.4 颜色系统
```javascript
// 主色调
Primary:    #3b82f6 (blue-500)   // 主按钮、链接
Secondary:  #64748b (slate-500)  // 次要文本
Accent:     #10b981 (emerald-500)// 成功状态

// 背景色
亮色模式:
  - 主背景: bg-white (#ffffff)
  - 次背景: bg-gray-50 (#f9fafb)
  - 三级背景: bg-gray-100 (#f3f4f6)

暗色模式:
  - 主背景: bg-base-100 (#0f172a)
  - 次背景: bg-base-200 (#1e293b)
  - 三级背景: bg-base-300 (#334155)
```

#### 1.5 动画规范
```javascript
transition-colors      // 颜色过渡
transition-all         // 所有属性过渡
duration-200          // 200ms (快速过渡)
duration-300          // 300ms (标准过渡)
```

---

### 2. Skill Manager 当前问题

#### 2.1 间距混乱 ❌

**问题代码示例**:
```tsx
// MySkills.tsx
<div className="space-y-6">  // 24px

// Marketplace.tsx
<div className="space-y-8">  // 32px

// Settings.tsx
<div className="space-y-6">  // 24px
<div className="grid grid-cols-3 gap-3">  // 12px

// Dashboard.tsx
<div className="space-y-6">  // 24px
```

**影响**:
- 页面之间节奏感不一致
- 视觉连贯性差
- 用户难以建立预期

#### 2.2 圆角不统一 ❌

**问题代码示例**:
```tsx
// Card.tsx
<div className="rounded-2xl">  // 16px

// SkillCard.tsx
<div className="rounded-xl">   // 12px
<div className="rounded-lg">   // 8px (某些情况)

// Modal.tsx
<div className="rounded-2xl">  // 16px

// Settings.tsx
<div className="rounded-lg">   // 8px (某些卡片)
```

**影响**:
- 视觉层次不清晰
- 界面显得不专业

#### 2.3 阴影使用随意 ❌

**问题代码示例**:
```tsx
// 大量使用 shadow-sm
<div className="shadow-sm">

// 少数使用 shadow-md
<div className="hover:shadow-md">

// 缺少明确的阴影层级定义
```

**影响**:
- 深度感不明确
- 元素层级关系模糊

---

## 🔍 组件对比分析

### 3.1 输入框（Input）

#### Antigravity-Manager 实现 ✅

```tsx
// 搜索输入框 - 焦点时自动扩展
<div className="flex-none w-40 relative transition-all focus-within:w-48">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input
    type="text"
    className="w-full pl-9 pr-4 py-2
              bg-white dark:bg-base-100
              text-sm text-gray-900 dark:text-base-content
              border border-gray-200 dark:border-base-300
              rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder:text-gray-400"
  />
</div>
```

**特点**:
- ✅ 焦点时宽度自动扩展（w-40 → w-48）
- ✅ 左侧图标定位
- ✅ 清晰的焦点环（ring-2）
- ✅ 平滑过渡动画

#### Skill Manager 当前实现 ⚠️

```tsx
// Input.tsx
<input
  className={cn(
    "w-full px-4 py-3",
    "border border-gray-200 dark:border-gray-700",
    "rounded-lg",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
    // 缺少过渡动画
  )}
/>
```

**缺失**:
- ❌ 无前缀/后缀图标插槽
- ❌ 无焦点时宽度变化
- ❌ 无动画过渡

#### 改进建议 🚀

```tsx
// 增强的 Input 组件
interface InputProps {
  // 原有属性...
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  focusExpand?: boolean;
}

// 使用示例
<Input
  startIcon={<Search className="w-4 h-4" />}
  focusExpand          // 焦点时自动扩展
  className="w-40 focus-within:w-48 transition-all"
/>
```

---

### 3.2 按钮（Button）

#### Antigravity-Manager 实现 ✅

```tsx
// 主要按钮
<button className="px-4 py-2
                bg-blue-500 text-white text-sm rounded-lg
                hover:bg-blue-600 transition-colors
                flex items-center gap-2 shadow-sm">
  <Save className="w-4 h-4" />
  保存
</button>

// 图标按钮
<button className="p-1.5 text-gray-400 hover:text-sky-600
                dark:hover:text-sky-400
                hover:bg-sky-50 dark:hover:bg-sky-900/30
                rounded-lg transition-all">
  <Info className="w-3.5 h-3.5" />
</button>

// 危险按钮
<button className="px-2.5 py-2 bg-red-500 text-white text-xs
                font-medium rounded-lg
                hover:bg-red-600 transition-colors
                flex items-center gap-1.5 shadow-sm">
  <Trash2 className="w-3.5 h-3.5" />
  删除
</button>
```

**特点**:
- ✅ 统一的高度系统（py-2 = 32px）
- ✅ 图标尺寸规范（w-4 h-4 = 16px）
- ✅ 彩色悬停效果
- ✅ 阴影语义化

#### Skill Manager 当前实现 ⚠️

```tsx
// Button.tsx
const variants = {
  primary: "bg-blue-500 text-white hover:bg-blue-600",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  error: "bg-red-500 text-white hover:bg-red-600",
  // 缺少 ghost 变体
  // 缺少 link 变体
}
```

**问题**:
- ⚠️ 缺少 icon-only 尺寸
- ⚠️ 缺少彩色悬停效果
- ⚠️ 图标尺寸不统一（某些地方用 w-3.5）

#### 改进建议 🚀

```tsx
// 添加新变体
const variants = {
  // ...现有变体
  ghost: "hover:bg-gray-100 dark:hover:bg-base-200",
  link: "text-blue-500 hover:underline p-0",
}

// 添加 icon-only 尺寸
const sizes = {
  // ...现有尺寸
  icon: "p-1.5", // 图标按钮专用
}

// 添加彩色悬停效果
const colorHover = {
  info: "hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-600",
  success: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600",
  warning: "hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600",
  error: "hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600",
}
```

---

### 3.3 对话框（Modal）

#### Antigravity-Manager 实现 ✅

```tsx
<div className="modal modal-open z-[100]">
  {/* 拖拽区域 */}
  <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-8 z-[110]" />

  <div className="modal-box relative max-w-sm
                bg-white dark:bg-base-100
                shadow-2xl rounded-2xl p-0 overflow-hidden
                transform transition-all
                animate-in fade-in zoom-in-95 duration-200">
    {/* 内容 */}
  </div>

  <div className="modal-backdrop bg-black/40 backdrop-blur-sm
               fixed inset-0 z-[-1]" />
</div>
```

**特点**:
- ✅ 拖拽区域明确
- ✅ 背景模糊效果
- ✅ 进入动画（fade + zoom）
- ✅ 最大宽度变体（max-w-sm, max-w-md, max-w-lg）

#### Skill Manager 当前实现 ⚠️

```tsx
// Modal.tsx
<dialog
  ref={dialogRef}
  className={cn(
    "rounded-2xl",
    "bg-white dark:bg-base-100",
    "shadow-2xl",
    // 缺少动画类
    // 缺少拖拽区域
  )}
>
```

**问题**:
- ⚠️ 缺少尺寸变体
- ⚠️ 缺少动画效果
- ⚠️ 拖拽区域在 Layout.tsx 中全局设置（不够灵活）

#### 改进建议 🚀

```tsx
// 添加尺寸变体
interface ModalProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
}

// 添加动画
const animationClasses = animation
  ? "animate-in fade-in zoom-in-95 duration-200"
  : "";
```

---

### 3.4 消息提示（Toast）

#### Antigravity-Manager 实现 ✅

```tsx
<div className={`fixed top-24 right-8 z-[200] ...`}>
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl
                   shadow-lg border transition-all duration-300
                   ${isVisible ? 'opacity-100 translate-y-0'
                               : 'opacity-0 translate-y-2'}`}>
    {getIcon()}
    <p className="flex-1 text-sm font-medium">
      {message}
    </p>
    <button onClick={onClose}>
      <X className="w-4 h-4" />
    </button>
  </div>
</div>
```

**特点**:
- ✅ 固定位置（top-24 right-8）
- ✅ 最小宽度（300px）
- ✅ 进入/退出动画（opacity + translate-y）
- ✅ 自动消失（3000ms）

#### Skill Manager 当前实现 ✅

```tsx
// Toast.tsx - 已经很完善！
<m.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
  className="fixed top-4 right-4 z-[9999]"
>
  {/* 内容 */}
</m.div>
```

**评价**: 当前实现已经很优秀，使用了 Framer Motion，动画流畅

**唯一建议**: 添加最小宽度约束
```tsx
className="min-w-[300px]"
```

---

### 3.5 下拉列表（Select）

#### Antigravity-Manager 实现 ✅

```tsx
<select className="w-full px-4 py-4
               border border-gray-200 dark:border-base-300
               rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500
               bg-gray-50 dark:bg-base-200
               text-gray-900 dark:text-base-content">
  <option value="zh">简体中文</option>
  <option value="en">English</option>
</select>
```

**特点**:
- ✅ 统一的高度（py-4 = 48px）
- ✅ 清晰的焦点环
- ✅ 灰色背景区分

#### Skill Manager 当前实现 ⚠️

```tsx
// Select.tsx
<select className={cn(
  "w-full px-4 py-3",  // py-3 而非 py-4
  "border border-gray-200 dark:border-gray-700",
  "rounded-lg",
  "focus:outline-none focus:ring-2 focus:ring-blue-500"
)}>
```

**问题**:
- ⚠️ 高度与其他表单元素不一致（py-3 vs py-4）
- ⚠️ 缺少搜索功能
- ⚠️ 缺少分组选项支持

#### 改进建议 🚀

```tsx
// 1. 统一高度
className="py-4"  // 改为 py-4（48px）

// 2. 可选：实现自定义 Select 组件（支持搜索）
// 使用 react-select 或 headlessui
interface CustomSelectProps {
  options: { value: string; label: string; group?: string }[];
  searchable?: boolean;
  groupBy?: string;
}
```

---

### 3.6 Tab 系统

#### Antigravity-Manager 实现 ✅

```tsx
// 胶囊样式 Tab
<div className="flex gap-1 bg-gray-100 dark:bg-base-200 rounded-full p-1">
  <button className={cn(
    "px-6 py-2 rounded-full text-sm font-medium transition-all",
    isActive
      ? "bg-white shadow-sm text-gray-900"
      : "text-gray-500 hover:bg-gray-200"
  )}>
    仪表板
  </button>
  <button className={cn(...)}>账号</button>
  <button className={cn(...)}>订阅</button>
</div>
```

**特点**:
- ✅ 胶囊样式（灰色背景 + 白色激活项）
- ✅ 平滑过渡动画
- ✅ 阴影效果增强层次感

#### Skill Manager 当前实现 ❌

```tsx
// MySkills.tsx - 硬编码的 Tab
<div className="border-b border-gray-200 dark:border-gray-700">
  <button className={cn(
    "pb-3 text-sm font-medium border-b-2 transition-all",
    activeTab === tab.id
      ? "border-blue-500 text-blue-600"
      : "border-transparent text-gray-500"
  )}>
    {tab.label}
  </button>
</div>

// SlideOver.tsx - 另一种 Tab 样式
<div className="flex gap-2">
  <button className={active ? "bg-blue-500 text-white" : ""}>
    {tab}
  </button>
</div>
```

**问题**:
- ❌ **样式不统一**（border-bottom vs 背景）
- ❌ 代码重复（多处硬编码）
- ❌ 缺少统一的 Tabs 组件

#### 改进建议 🚀

```tsx
// 创建统一的 Tabs 组件
// src/components/ui/Tabs.tsx

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  variant?: 'underline' | 'pills';
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  badge?: number | string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

// 使用示例
<Tabs value={activeTab} onValueChange={setActiveTab} variant="pills">
  <TabsList>
    <TabsTrigger value="overview">
      概览
      <Badge>12</Badge>
    </TabsTrigger>
    <TabsTrigger value="config">配置</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">{/* ... */}</TabsContent>
</Tabs>
```

---

### 3.7 卡片组件（Card）

#### Antigravity-Manager 实现 ✅

```tsx
<div className="bg-white dark:bg-base-100
            rounded-xl p-4
            shadow-sm border
            border-gray-100 dark:border-base-200">
  <div className="flex items-center justify-between mb-2">
    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
      <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
    </div>
  </div>
  <div className="text-2xl font-bold text-gray-900 dark:text-base-content mb-0.5">
    10
  </div>
  <div className="text-xs text-gray-500 dark:text-gray-400">
    总账号数
  </div>
</div>
```

**特点**:
- ✅ 图标背景容器
- ✅ 统一的圆角（rounded-xl）
- ✅ 统一的阴影（shadow-sm）
- ✅ 统一的边框

#### Skill Manager 当前实现 ⚠️

```tsx
// Card.tsx
<div className={cn(
  "rounded-2xl",  // 16px，不同于 Antigravity 的 12px
  "bg-white dark:bg-base-100",
  "shadow-sm border",
  "border-gray-100 dark:border-base-200"
)}>
```

**问题**:
- ⚠️ 圆角过大（rounded-2xl vs rounded-xl）
- ⚠️ 缺少统一的内边距规范（有些用 p-4，有些用 p-6）

#### 改进建议 🚀

```tsx
// 统一圆角为 rounded-xl (12px)
className="rounded-xl"

// 添加内边距变体
interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};
```

---

### 3.8 空状态（Empty State）

#### Antigravity-Manager 实现 ✅

```tsx
<div className="flex flex-col items-center justify-center
                py-20 text-center">
  <div className="w-16 h-16 mb-4 rounded-full bg-gray-100
                 flex items-center justify-center">
    <Inbox className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    暂无数据
  </h3>
  <p className="text-sm text-gray-500 max-w-md mb-6">
    描述文字
  </p>
  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
    添加数据
  </button>
</div>
```

**特点**:
- ✅ 图标圆形背景
- ✅ 清晰的层次（标题 > 描述 > 操作）
- ✅ 操作按钮引导用户

#### Skill Manager 当前实现 ❌

```tsx
// MySkills.tsx - 硬编码的空状态
<div className="text-center py-20
                bg-white dark:bg-base-100
                rounded-xl border border-dashed">
  <FolderOpen size={32} className="mx-auto mb-4 text-gray-400" />
  <p className="text-gray-500">暂无 Skills</p>
</div>

// Marketplace.tsx - 另一种样式
<div className="flex flex-col items-center justify-center py-12">
  <PackageSearch className="w-12 h-12 mb-3" />
  <p>未找到匹配的 Skills</p>
</div>

// Security.tsx - 又一种样式
<div className="text-center py-8">
  <ShieldAlert className="mx-auto mb-2" />
  <p>该功能尚未实现</p>
</div>
```

**问题**:
- ❌ **样式不统一**（3+ 种不同样式）
- ❌ 代码重复严重
- ❌ 缺少统一的 EmptyState 组件

#### 改进建议 🚀

```tsx
// 创建统一的 EmptyState 组件
// src/components/ui/EmptyState.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'centered' | 'minimal';
}

// 使用示例
<EmptyState
  icon={<Inbox className="w-8 h-8" />}
  title="暂无数据"
  description="开始添加您的第一个 Skill"
  action={{ label: '添加 Skill', onClick: handleAdd }}
/>
```

---

## 🚨 缺失的关键组件

### 4.1 高优先级（P0）

#### Table 组件 ❌
**当前状态**: 各页面使用原生 `<table>` 或 DaisyUI table

**问题**:
- 样式不统一
- 缺少排序功能
- 缺少筛选功能
- 缺少行选择
- 缺少虚拟滚动

**参考**: Antigravity-Manager 的表格实现
```tsx
<table className="w-full">
  <thead>
    <tr className="border-b bg-gray-50 dark:bg-base-200">
      <th className="px-4 py-3 text-left text-xs font-medium
                  text-gray-500 uppercase tracking-wider">
        邮箱
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100 dark:divide-base-200">
    <tr className="hover:bg-gray-50 dark:hover:bg-base-200">
      <td className="px-4 py-3">{/* 内容 */}</td>
    </tr>
  </tbody>
</table>
```

**建议实现**:
```tsx
// src/components/ui/Table.tsx
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortable?: boolean;
  filterable?: boolean;
  selectionMode?: 'single' | 'multiple';
  onRowClick?: (row: T) => void;
  virtualized?: boolean;
}
```

#### Tooltip 组件 ❌
**当前状态**: 完全缺失

**建议**: 使用 `@radix-ui/react-tooltip` 或 `tippy.js`

```tsx
// src/components/ui/Tooltip.tsx
interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  children: React.ReactNode;
}

// 使用示例
<Tooltip content="查看详情">
  <button><Info className="w-4 h-4" /></button>
</Tooltip>
```

#### Progress/ProgressBar 组件 ❌
**当前状态**: 使用 DaisyUI progress

**问题**: 缺少高级功能（标签、百分比、颜色编码）

**参考**: Antigravity-Manager 的配额进度条
```tsx
<div className="relative h-[26px] flex items-center px-1
                rounded-lg overflow-hidden border
                bg-gray-50/30">
  <div className={`absolute inset-y-0 left-0
                  transition-all duration-700
                  ${getColorClass(percentage)}`}
       style={{ width: `${percentage}%` }} />
  <div className="relative z-10 flex justify-between text-[9px] font-mono">
    <span>G3 Pro</span>
    <span>{percentage}%</span>
  </div>
</div>
```

**建议实现**:
```tsx
// src/components/ui/Progress.tsx
interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  colorScheme?: 'blue' | 'green' | 'orange' | 'red' | 'auto';
}
```

---

### 4.2 中优先级（P1）

#### Dropdown Menu 组件 ❌
**当前状态**: 缺失

**建议**: 使用 `@radix-ui/react-dropdown-menu`

```tsx
// src/components/ui/DropdownMenu.tsx
interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}
```

#### Alert/Banner 组件 ❌
**当前状态**: 使用 Toast 代替

**问题**: Toast 不适合持久显示的消息

**建议实现**:
```tsx
// src/components/ui/Alert.tsx
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

// 使用示例
<Alert variant="warning" title="注意">
  该操作不可撤销
</Alert>
```

#### Pagination 组件 ❌
**当前状态**: 缺失

**建议实现**:
```tsx
// src/components/ui/Pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showSizeChanger?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}
```

#### Breadcrumb 组件 ❌
**当前状态**: 缺失

**建议实现**:
```tsx
// src/components/ui/Breadcrumb.tsx
interface BreadcrumbProps {
  items: {
    label: string;
    href?: string;
  }[];
}

// 使用示例
<Breadcrumb
  items={[
    { label: '首页', href: '/' },
    { label: '我的 Skills' },
  ]}
/>
```

---

## 📋 页面级改进建议

### 5.1 MySkills.tsx

#### 当前问题 ❌
1. Tab 样式硬编码（border-bottom）
2. 缺少搜索/筛选功能
3. 缺少批量操作
4. 列表无虚拟滚动
5. 删除操作无撤销功能

#### 改进方案 🚀

```tsx
// 1. 添加搜索栏
<div className="flex items-center gap-2">
  <Input
    startIcon={<Search className="w-4 h-4" />}
    placeholder="搜索 Skills..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-64 focus-within:w-80 transition-all"
  />
  <Dropdown>
    <DropdownTrigger>
      <Button variant="outline">
        <Filter className="w-4 h-4" />
        筛选
      </Button>
    </DropdownTrigger>
    <DropdownContent>
      <Checkbox label="系统级" />
      <Checkbox label="项目级" />
      <Checkbox label="已启用" />
    </DropdownContent>
  </Dropdown>
</div>

// 2. 添加批量操作栏
{selectedItems.length > 0 && (
  <div className="fixed bottom-0 left-0 right-0
                  bg-blue-50 dark:bg-blue-900/20
                  border-t border-blue-200 dark:border-blue-800
                  px-6 py-3
                  flex items-center justify-between">
    <span>已选择 {selectedItems.length} 项</span>
    <div className="flex gap-2">
      <Button variant="error" onClick={handleBatchDelete}>
        <Trash2 className="w-4 h-4" />
        批量删除
      </Button>
    </div>
  </div>
)}

// 3. 添加撤销功能
const handleDelete = async (skill: InstalledSkill) => {
  await deleteSkill(skill.id);
  toast.success('已删除', {
    action: {
      label: '撤销',
      onClick: () => restoreSkill(skill),
    },
  });
};
```

---

### 5.2 Marketplace.tsx

#### 当前问题 ❌
1. Hero section 装饰元素可能影响性能
2. 缺少 Skill 预览截图
3. 缺少收藏功能
4. Filter chips 滚动提示不明显

#### 改进方案 🚀

```tsx
// 1. 优化 Hero section（移除持续动画）
<div className="relative overflow-hidden">
  {/* 静态装饰元素 */}
  <div className="absolute top-0 right-0 w-96 h-96
                  bg-gradient-to-br from-blue-400/10 to-purple-400/10
                  rounded-full blur-3xl" />

  <div className="relative">
    <h1>发现优质 Skills</h1>
    <Input startIcon={<Search />} placeholder="搜索 Skills..." />
    <Button>导入 Skill</Button>
  </div>
</div>

// 2. 添加预览截图
<SkillCard>
  {/* 现有内容 */}
  <div className="relative h-40 bg-gray-100 rounded-lg overflow-hidden
                  group cursor-pointer">
    <img src={skill.preview} alt={skill.name} />
    <div className="absolute inset-0 bg-black/50
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition-opacity">
      <Eye className="w-8 h-8 text-white" />
    </div>
  </div>
</SkillCard>

// 3. 添加收藏功能
<Button
  variant="ghost"
  size="icon"
  onClick={() => toggleFavorite(skill.id)}
>
  <Heart
    className={cn(
      "w-4 h-4",
      skill.isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
    )}
  />
</Button>

// 4. 优化 Filter chips
<div className="relative">
  <div className="flex gap-2 overflow-x-auto pb-2">
    {filters.map(filter => (
      <button
        key={filter.id}
        className={cn(
          "px-4 py-2 rounded-full text-sm whitespace-nowrap",
          activeFilter === filter.id
            ? "bg-blue-500 text-white"
            : "bg-gray-100 dark:bg-base-200"
        )}
      >
        {filter.label}
        {filter.count > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-black/10">
            {filter.count}
          </span>
        )}
      </button>
    ))}
  </div>
  {/* 滚动指示器 */}
  <div className="absolute right-0 top-0 bottom-2 w-12
                  bg-gradient-to-l from-white to-transparent
                  pointer-events-none" />
</div>
```

---

### 5.3 Security.tsx

#### 当前问题 ❌
1. 缺少扫描进度条
2. 缺少筛选/排序功能
3. 缺少批量扫描
4. 缺少白名单管理入口

#### 改进方案 🚀

```tsx
// 1. 添加扫描进度条
{isScanning && (
  <Card className="mb-4">
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">正在扫描...</span>
          <span className="text-sm text-gray-500">
            {scanProgress.current} / {scanProgress.total}
          </span>
        </div>
        <Progress value={scanProgress.percentage} />
      </div>
      <Button variant="ghost" onClick={cancelScan}>
        取消
      </Button>
    </div>
  </Card>
)}

// 2. 添加筛选栏
<div className="flex items-center gap-2">
  <Select
    value={securityLevelFilter}
    onChange={setSecurityLevelFilter}
    options={[
      { value: 'all', label: '全部等级' },
      { value: 'safe', label: '安全' },
      { value: 'warning', label: '警告' },
      { value: 'critical', label: '危险' },
    ]}
  />
  <Dropdown>
    <DropdownTrigger>
      <Button variant="outline">
        <Settings className="w-4 h-4" />
      </Button>
    </DropdownTrigger>
    <DropdownContent>
      <MenuItem onClick={openWhitelist}>
        <Shield className="w-4 h-4" />
        白名单管理
      </MenuItem>
      <MenuItem onClick={exportReport}>
        <Download className="w-4 h-4" />
        导出报告
      </MenuItem>
    </DropdownContent>
  </Dropdown>
</div>
```

---

### 5.4 ScanHistory.tsx

#### 当前问题 ❌
1. 图表数据限制 100 条
2. 缺少日期范围选择器
3. 缺少详细报告查看
4. 表格行操作缺失

#### 改进方案 🚀

```tsx
// 1. 添加日期范围选择器
<div className="flex items-center gap-2">
  <DatePicker
    value={dateRange}
    onChange={setDateRange}
    range
    placeholder="选择日期范围"
  />
  <Button variant="outline" onClick={exportToCSV}>
    <Download className="w-4 h-4" />
    导出 CSV
  </Button>
</div>

// 2. 添加行操作
<Table
  columns={[
    { key: 'timestamp', header: '时间', sortable: true },
    { key: 'skillName', header: 'Skill 名称' },
    { key: 'securityLevel', header: '安全等级' },
    {
      key: 'actions',
      header: '操作',
      cell: (row) => (
        <Dropdown>
          <DropdownTrigger>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <MenuItem onClick={() => viewDetail(row)}>
              <Eye className="w-4 h-4" />
              查看详情
            </MenuItem>
            <MenuItem onClick={() => rescan(row)}>
              <RefreshCw className="w-4 h-4" />
              重新扫描
            </MenuItem>
          </DropdownContent>
        </Dropdown>
      ),
    },
  ]}
  data={scanHistory}
/>

// 3. 优化图表数据聚合
const chartData = useMemo(() => {
  // 按日期聚合数据，而不是硬截断 100 条
  return aggregateByDate(scanHistory, dateRange);
}, [scanHistory, dateRange]);
```

---

### 5.5 Dashboard.tsx

#### 当前问题 ❌
1. 数据完全 mock
2. 缺少交互功能
3. 图表配置固定
4. 活动时间线 mock

#### 改进方案 🚀

```tsx
// 1. 添加交互功能
<div className="cursor-pointer hover:shadow-md transition-shadow"
     onClick={() => navigate('/my-skills')}>
  <StatCard>
    <div className="flex justify-between items-start">
      <div>
        <div className="text-3xl font-bold">{stats.installed}</div>
        <div className="text-sm text-gray-500">已安装 Skills</div>
      </div>
      <TrendingUp className="w-5 h-5 text-green-500" />
    </div>
  </StatCard>
</div>

// 2. 添加时间范围选择
<div className="flex justify-between items-center mb-4">
  <h3 className="text-lg font-semibold">使用趋势</h3>
  <Select
    value={timeRange}
    onChange={setTimeRange}
    options={[
      { value: '7d', label: '近 7 天' },
      { value: '30d', label: '近 30 天' },
      { value: '90d', label: '近 90 天' },
    ]}
  />
</div>

// 3. 添加真实数据
const { data: dashboardData } = useQuery({
  queryKey: ['dashboard', timeRange],
  queryFn: () => invoke('get_dashboard_stats', { timeRange }),
});

// 4. 优化活动时间线
<ActivityTimeline
  events={realEvents}
  onEventClick={(event) => {
    // 导航到相关页面
    if (event.type === 'scan') {
      navigate(`/security?skill=${event.skillId}`);
    }
  }}
/>
```

---

## ♿ 可访问性改进

### 6.1 当前问题

```typescript
❌ Button 组件缺少 aria-label 支持
❌ Icon-only 按钮缺少 screen reader text
❌ 表格缺少 caption/summary
❌ Filter chips 缺少 aria-selected
❌ Tab 系统缺少 role="tablist"/role="tab"
❌ Focus indicator 不够明显
❌ Modal 焦点 trap 未验证
❌ Toast 通知缺少 role="alert"
```

### 6.2 改进方案

#### Button 组件
```tsx
// src/components/ui/Button.tsx
interface ButtonProps {
  // ...现有属性
  ariaLabel?: string;  // 新增
}

// 使用示例
<Button
  ariaLabel="关闭对话框"
  variant="ghost"
  size="icon"
>
  <X className="w-4 h-4" />
</Button>

// 内部实现
<button
  aria-label={ariaLabel || (children && typeof children === 'string' ? children : undefined)}
  // ...
>
  {ariaLabel && !children && (
    <span className="sr-only">{ariaLabel}</span>
  )}
  {children}
</button>
```

#### Tabs 组件
```tsx
// src/components/ui/Tabs.tsx
<div role="tablist" aria-label="选项卡">
  <button
    role="tab"
    aria-selected={isActive}
    aria-controls={`${id}-panel`}
    id={`${id}-tab`}
    tabIndex={isActive ? 0 : -1}
  >
    {label}
  </button>
</div>

<div
  role="tabpanel"
  id={`${id}-panel`}
  aria-labelledby={`${id}-tab`}
  hidden={!isActive}
>
  {children}
</div>
```

#### Table 组件
```tsx
<table>
  <caption className="sr-only">已安装 Skills 列表</caption>
  <thead>
    <tr>
      <th scope="col">名称</th>
      <th scope="col">状态</th>
      <th scope="col">操作</th>
    </tr>
  </thead>
  {/* ... */}
</table>
```

#### Focus 管理优化
```css
/* index.css */
/* 增强焦点指示器 */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 跳过导航链接 */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
}

.skip-to-content:focus {
  top: 0;
}
```

---

## 🚀 实施路线图

### Phase 1: 设计系统统一（1-2 周）

**目标**: 建立统一的设计规范

**任务**:
- [ ] 创建 `src/styles/design-tokens.css`
  - 定义间距变量
  - 定义圆角变量
  - 定义阴影变量
  - 定义颜色变量
- [ ] 更新 `tailwind.config.js`
  - 添加自定义主题
  - 统一间距、圆角、阴影
- [ ] 创建设计规范文档 `DESIGN-SYSTEM.md`
- [ ] 提取重复样式到工具类

**预期成果**:
- 所有组件使用统一的设计 token
- 减少样式代码重复 50%+

---

### Phase 2: 组件库补充（2-3 周）

**目标**: 完善组件库，减少硬编码

**优先级 P0**:
- [ ] 创建 `Tabs` 组件
- [ ] 创建 `Table` 组件
- [ ] 创建 `EmptyState` 组件
- [ ] 创建 `Tooltip` 组件
- [ ] 创建 `Progress` 组件

**优先级 P1**:
- [ ] 创建 `DropdownMenu` 组件
- [ ] 创建 `Alert` 组件
- [ ] 创建 `Pagination` 组件
- [ ] 创建 `Breadcrumb` 组件
- [ ] 创建 `Avatar` 组件

**预期成果**:
- 组件库覆盖率 80%+
- 减少 60%+ 的样式重复代码

---

### Phase 3: 页面重构（3-4 周）

**目标**: 应用新组件，统一页面风格

**任务**:
- [ ] 重构 `MySkills.tsx`
  - 使用 Tabs 组件
  - 使用 Table 组件
  - 添加搜索/筛选
  - 添加批量操作
- [ ] 重构 `Marketplace.tsx`
  - 优化 Hero section
  - 使用 EmptyState 组件
  - 添加收藏功能
- [ ] 重构 `Security.tsx`
  - 添加进度条
  - 使用 Table 组件
  - 添加筛选功能
- [ ] 重构 `ScanHistory.tsx`
  - 添加日期选择器
  - 使用 Table 组件
  - 添加行操作
- [ ] 重构 `Dashboard.tsx`
  - 连接真实数据
  - 添加交互功能

**预期成果**:
- 所有页面风格统一
- 用户体验显著提升
- 代码可维护性提高

---

### Phase 4: 可访问性改进（1 周）

**目标**: 达到 WCAG 2.1 AA 标准

**任务**:
- [ ] 添加 aria-label 支持
- [ ] 实现焦点 trap（Modal）
- [ ] 添加键盘导航
- [ ] 颜色对比度检查
- [ ] 添加 screen reader 支持
- [ ] 添加跳过导航链接
- [ ] 优化焦点指示器

**预期成果**:
- 通过 axe-core 检测无严重问题
- 键盘导航完整
- Screen reader 友好

---

### Phase 5: 性能优化（1 周）

**目标**: 提升应用性能

**任务**:
- [ ] 使用 React.memo 优化组件
- [ ] 实现虚拟滚动（Table, List）
- [ ] 优化 Recharts 渲染
- [ ] 减少内联样式
- [ ] 使用 useMemo 优化计算
- [ ] 优化动画性能

**预期成果**:
- 首屏加载时间 < 2s
- 列表滚动 60fps
- 动画流畅无卡顿

---

### Phase 6: 国际化完善（1 周）

**目标**: 完整的中英文支持

**任务**:
- [ ] Dashboard 国际化
- [ ] 统一日期格式
- [ ] 移除硬编码文本
- [ ] 添加 RTL 支持（可选）

**预期成果**:
- 所有页面支持 i18n
- 日期格式统一
- 无硬编码文本

---

## 📦 推荐的依赖包

```json
{
  "dependencies": {
    // 组件库
    "@radix-ui/react-tooltip": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-avatar": "^1.0.0",
    "@radix-ui/react-progress": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",

    // 表格
    "@tanstack/react-table": "^8.11.0",
    "react-virtualized": "^9.22.0",

    // 表单
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    // 日期选择
    "react-day-picker": "^8.10.0",
    "date-fns": "^3.0.0",

    // 动画
    "framer-motion": "^12.26.2",

    // 工具
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

---

## 📚 设计规范参考

### 创建 `src/styles/design-tokens.css`

```css
:root {
  /* 间距系统 */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */

  /* 圆角 */
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* 字体 */
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 1.875rem; /* 30px */

  /* 动画 */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}

.dark {
  /* 暗色模式覆盖 */
}
```

---

## 📖 总结

### 核心问题

1. **设计系统不统一** ❌
   - 间距、圆角、阴影使用随意
   - 缺少设计规范文档

2. **组件库不完整** ❌
   - 缺少 15+ 关键组件
   - 大量硬编码样式

3. **代码重复严重** ❌
   - 卡片、空状态、Tab 等样式重复
   - 维护成本高

4. **可访问性不足** ❌
   - 缺少 aria 属性
   - 键盘导航不完整

5. **国际化不完整** ⚠️
   - Dashboard 完全未支持
   - 硬编码文本存在

### 改进优先级

**立即开始** 🔴
1. 统一设计系统（间距、圆角、阴影）
2. 创建关键缺失组件（Tabs, Table, EmptyState）

**近期计划** 🟡
3. 页面重构（应用新组件）
4. 可访问性改进

**长期规划** 🟢
5. 性能优化
6. 国际化完善

### 预期收益

- **代码质量**: 减少 60%+ 样式重复
- **开发效率**: 组件复用率提升 80%+
- **用户体验**: 风格统一，交互流畅
- **可维护性**: 设计规范明确，易于扩展
- **可访问性**: 达到 WCAG 2.1 AA 标准

---

**下一步行动**: 开始 Phase 1 - 设计系统统一

如有任何问题或需要进一步说明，请随时提出！
