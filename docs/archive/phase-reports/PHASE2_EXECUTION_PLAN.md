# 🚀 Phase 2 执行计划 - Auto-Pilot 模式

**创建时间**: 2026-01-14
**执行模式**: Auto-Pilot (自动开发循环)
**基于**: PROMPT-AT.md v2.5 + PHASE2_PROGRESS_REPORT.md

---

## 📋 执行策略

### 核心原则
1. **Stacked Branching**: 直接基于上一 Feature 分支创建新分支，不等待 PR 合并
2. **Atomic Commit**: 每个任务对应一个清晰的 Commit
3. **Test First**: 代码完成后必须运行测试
4. **Context Compression**: 完成任务后压缩上下文

### 开发禁令
- ❌ **NO LOCAL MERGE**: 严禁在本地执行 `git merge master`
- ❌ 跳过测试步骤
- ❌ 不更新文档
- ❌ 在 main/master 分支直接开发

---

## 🎯 任务清单

### **Phase 1: 完成 P1-1 安全规则库** (预计 1-2天)

**目标**: 从 68条规则 → 80+条规则

#### Task 1.1: 创建功能分支 ✅
```bash
git checkout -b feature/complete-security-rules
```

#### Task 1.2: 补充 12条安全规则 📝
**目标规则**:

**Go 语言 (4条)**:
1. `GO_UNSAFE_PACKAGE` - unsafe 包使用
2. `GO_CGO_USAGE` - CGo 外部函数调用
3. `GO_GOROUTINE_LEAK` - goroutine 泄漏风险
4. `GO_RACE_CONDITION` - 数据竞争检测

**Python 语言 (4条)**:
5. `PYTHON_PICKLE_LOAD` - pickle.load 不安全反序列化
6. `PYTHON_YAML_LOAD` - yaml.load 不安全加载
7. `PYTHON_CODE_COMPILE` - compile() 动态编译
8. `PYTHON_INPUT_RAW` - input() 未验证输入

**Shell 脚本 (4条)**:
9. `SHELL_WORD_SPLITTING` - 单词分割漏洞
10. `SHELL_GLOB_EXPANSION` - 通配符扩展风险
11. `SHELL_COMMAND_SUBSTITUTION` - 命令替换注入
12. `SHELL_SOURCE_UNTRUSTED` - source 不可信文件

**文件**: `src-tauri/src/security/rules.rs`

**验收标准**:
- ✅ 新增 12条规则
- ✅ 每条规则包含：id, name, pattern, severity, category, weight, description, hard_trigger, confidence, remediation, cwe_id
- ✅ 规则总数达到 80条

#### Task 1.3: 更新单元测试 📝
**文件**: `src-tauri/src/security/rules.rs` (tests module)

**新增测试**:
- `test_go_unsafe_detection` - 测试 Go unsafe 检测
- `test_python_pickle_detection` - 测试 Python pickle 检测
- `test_shell_injection_detection` - 测试 Shell 注入检测

**验收标准**:
- ✅ 新增至少 3个测试用例
- ✅ 所有测试通过 `cargo test`

#### Task 1.4: 生成规则文档 📝
**文件**: `docs/security-rules.md`

**内容结构**:
```markdown
# 安全扫描规则库文档

## 概述
- 规则总数: 80+
- 分类统计
- 严重程度分布

## 规则详情

### A. 破坏性操作 (Destructive)
#### RM_RF_ROOT - 删除根目录
- **严重程度**: Critical
- **权重**: 100
- **检测模式**: `rm\s+(-[a-zA-Z]*)*\s*-r...`
- **CWE**: CWE-78
- **修复建议**: 检查命令参数，避免操作根目录
- **示例代码**:
  ```bash
  rm -rf /  # 危险
  ```

...（每条规则详细说明）

## 配置示例
...
```

**验收标准**:
- ✅ 所有 80+ 条规则都有文档
- ✅ 包含配置文件示例
- ✅ 包含最佳实践建议

#### Task 1.5: 验证构建和测试 🧪
**检查项**:
```bash
# 1. Rust 静态检查
cd src-tauri
cargo check
cargo clippy

# 2. 运行测试
cargo test

# 3. 验证构建
cd ..
npm run build
```

**验收标准**:
- ✅ `cargo check` 通过
- ✅ `cargo clippy` 无警告
- ✅ `cargo test` 全部通过 (预计 86+ 测试)
- ✅ `npm run build` 成功

#### Task 1.6: Git 提交并发起 PR 📤
**提交格式**:
```
feat(security): complete security rules library to 80+ rules

详细说明：
- 新增 12条安全规则 (Go: 4, Python: 4, Shell: 4)
- 补充单元测试用例
- 生成完整的规则文档

测试验证：
- cargo test: 86/86 passed
- cargo clippy: 0 warnings
- npm run build: success

相关文档：
- docs/security-rules.md (新增)
- PHASE2_PROGRESS_REPORT.md (更新)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**PR 标题**: `feat(security): complete security rules library to 80+ rules`

**PR 描述**:
```markdown
## 📋 任务描述
完成 P1-1 安全规则库扩展，从 68条规则扩展到 80+条规则。

## ✅ 完成内容
- ✅ 新增 12条安全规则
  - Go 语言: 4条 (unsafe, CGo, goroutine, race)
  - Python: 4条 (pickle, yaml, compile, input)
  - Shell: 4条 (word splitting, glob, substitution, source)
- ✅ 补充单元测试 (3个新测试)
- ✅ 生成规则文档 `docs/security-rules.md`

## 🧪 测试结果
- Rust 测试: 86/86 passed ✅
- Clippy: 0 warnings ✅
- Build: success ✅

## 📊 规则统计
| 类别 | 规则数 |
|------|-------|
| 总计 | 80 |
| 破坏性操作 | 4 |
| 远程执行 | 4 |
| 命令注入 | 13 |
| 网络外传 | 6 |
| 权限提升 | 3 |
| 持久化 | 2 |
| 敏感泄露 | 10 |
| 敏感文件访问 | 6 |
| JavaScript/TypeScript | 10 |
| Rust | 5 |
| Tauri | 3 |
| **Go** | **4** (新增)
| **Python** | **4** (新增)
| **Shell** | **4** (新增)

## 📝 相关文档
- [Security Rules Documentation](./docs/security-rules.md)
- [Phase 2 Progress Report](./PHASE2_PROGRESS_REPORT.md)

## 🔗 依赖
无

🤖 Generated with Claude Code (Sonnet 4.5)
```

---

### **Phase 2: 实现前端缓存系统** (预计 2-3天)

**基于分支**: `feature/complete-security-rules`

#### Task 2.1: 创建功能分支 ✅
```bash
# 基于 feature/complete-security-rules 创建新分支 (Stacked Branching)
git checkout -b feature/frontend-cache-system
```

#### Task 2.2: 安装 TanStack Query 📦
```bash
npm install @tanstack/react-query
```

**文件修改**:
- `package.json` - 新增依赖

#### Task 2.3: 配置 QueryClient 📝
**文件**: `src/main.tsx`

**代码实现**:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟 (原 cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// 包裹 App 组件
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

#### Task 2.4: 创建 useSkills Hook 📝
**文件**: `src/hooks/useSkills.ts` (新建)

**代码实现**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledSkill, MarketplaceSkill } from '@/types';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const result = await invoke<InstalledSkill[]>('scan_skills');
      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useImportSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: MarketplaceSkill) => {
      return await invoke('import_github_skill', {
        request: { repoUrl: skill.githubUrl }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useUninstallSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillPath: string) => {
      return await invoke('uninstall_skill', { skillPath });
    },
    onMutate: async (skillPath) => {
      // 乐观更新
      await queryClient.cancelQueries({ queryKey: ['skills'] });
      const previousSkills = queryClient.getQueryData<InstalledSkill[]>(['skills']);

      queryClient.setQueryData<InstalledSkill[]>(['skills'], (old) =>
        old?.filter(s => s.path !== skillPath)
      );

      return { previousSkills };
    },
    onError: (_err, _skillPath, context) => {
      // 回滚
      queryClient.setQueryData(['skills'], context?.previousSkills);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}
```

#### Task 2.5: 更新前端组件使用 Hook 📝
**文件**:
- `src/pages/MySkills.tsx`
- `src/pages/Marketplace.tsx`

**替换**: Zustand 调用 → TanStack Query Hook

#### Task 2.6: 实现请求去重 📝
**文件**: `src/utils/requestDeduplication.ts` (新建)

**代码实现**:
```typescript
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupedRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

#### Task 2.7: 验证构建和测试 🧪
```bash
npm run lint
npx tsc -b
npm run build
```

**验收标准**:
- ✅ `npm run lint` 通过
- ✅ `npx tsc -b` 无类型错误
- ✅ `npm run build` 成功

#### Task 2.8: Git 提交并发起 PR 📤
**提交格式**:
```
feat(frontend): implement TanStack Query for smart caching

详细说明：
- 安装并配置 TanStack Query
- 创建 useSkills, useImportSkill, useUninstallSkill hooks
- 实现乐观更新
- 实现请求去重

测试验证：
- npm run lint: passed
- npx tsc -b: passed
- npm run build: success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**PR 标题**: `feat(frontend): implement TanStack Query for smart caching`

**PR 描述**: (基于 feature/complete-security-rules)
- Depends on PR #X (feature/complete-security-rules)

---

### **Phase 3: 性能优化与测试** (预计 1天)

**基于分支**: `feature/frontend-cache-system`

#### Task 3.1: 创建性能基准测试 📝
#### Task 3.2: 添加缓存监控 📝
#### Task 3.3: 验证缓存命中率 🧪

---

### **Phase 4: 扫描历史记录功能** (预计 2-3天)

**基于分支**: `feature/frontend-cache-system`

#### Task 4.1: 数据库表设计 📝
#### Task 4.2: 后端 CRUD 实现 📝
#### Task 4.3: 前端历史页面 📝
#### Task 4.4: 趋势图表 (Recharts) 📝

---

## 🔄 循环执行流程

### 每个任务的执行步骤:
1. **上下文加载**: 读取 CLAUDE.md 和相关代码
2. **任务规划**: 使用 TodoWrite 创建子任务
3. **代码实施**: 使用 Edit/Write 工具编写代码
4. **静态检查**:
   - 前端: `npm run lint` + `npx tsc -b`
   - 后端: `cargo check` + `cargo clippy`
5. **测试执行**:
   - 后端: `cargo test`
   - 前端: `npm run build` (替代单元测试)
6. **Git 提交**: 使用规范的提交格式
7. **上下文压缩**: 总结变更并清理

---

## 📊 进度追踪

| Phase | 任务 | 预计工时 | 状态 | 开始时间 | 完成时间 |
|-------|------|---------|------|---------|---------|
| Phase 1 | P1-1 完整安全规则库 | 1-2天 | 🟡 进行中 | 2026-01-14 | - |
| Phase 2 | P1-2 前端缓存系统 | 2-3天 | ⚪ 待开始 | - | - |
| Phase 3 | P1-2 性能优化 | 1天 | ⚪ 待开始 | - | - |
| Phase 4 | P1-3 扫描历史记录 | 2-3天 | ⚪ 待开始 | - | - |

**总预计工时**: 6-9天
**当前进度**: Phase 1 - Task 1.1

---

## 🚀 立即开始

**当前任务**: Phase 1 - Task 1.1: 创建功能分支

**下一步**:
```bash
git checkout -b feature/complete-security-rules
```

---

**创建时间**: 2026-01-14
**执行者**: Claude Sonnet 4.5 (Auto-Pilot Mode)
**文档版本**: 1.0
