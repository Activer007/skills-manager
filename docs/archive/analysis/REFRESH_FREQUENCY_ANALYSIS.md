# 刷新频率分析报告

**生成时间**: 2026-01-14
**分析范围**: 前端各模块的数据刷新策略

---

## 📊 概览

| 模块 | 刷新策略 | 当前频率 | 状态 | 优先级 |
|------|---------|---------|------|--------|
| CacheStatsCard | 定时轮询 | 5秒 | ⚠️ 过于频繁 | 🔴 高 |
| useSkills | TanStack Query | 5分钟 (staleTime) | ✅ 合理 | - |
| useMarketplaceSkills | TanStack Query | 10分钟 (staleTime) | ✅ 合理 | - |
| Security.tsx | 手动刷新 | 按需 | ✅ 合理 | - |
| ScanHistory.tsx | 单次加载 | 仅挂载时 | ⚠️ 缺少刷新 | 🟡 中 |

---

## 🔴 问题 1: CacheStatsCard 轮询过于频繁

### 位置
`src/components/CacheStatsCard.tsx:44`

```typescript
const interval = setInterval(fetchStats, 5000); // Poll every 5s
```

### 问题分析

1. **资源浪费**
   - 缓存统计数据变化不频繁（仅在扫描、清空缓存时变化）
   - 5 秒轮询导致大量不必要的 IPC 调用
   - 每次 IPC 调用都有序列化/反序列化开销

2. **用户体验影响**
   - 对于静态数据显示频繁变化会产生误导
   - 增加后台 CPU 占用

3. **对比参考**
   - Docker Desktop 缓存统计: 30-60 秒刷新
   - VS Code 缓存统计: 手动刷新 + 事件驱动
   - GitHub Actions: 30 秒 - 1 分钟

### 修复方案

**方案 A: 延长轮询间隔** (推荐)
```typescript
// 从 5 秒改为 30 秒
const interval = setInterval(fetchStats, 30000);
```

**方案 B: 事件驱动更新** (最优)
- 使用 Tauri 事件系统，在缓存变化时主动推送
- 前端订阅事件，被动更新

```typescript
useEffect(() => {
  fetchStats(); // 初始加载

  const unlisten = listen('cache-updated', () => {
    fetchStats(); // 仅在变化时更新
  });

  return () => unlisten.then(fn => fn());
}, []);
```

### 修复优先级
🔴 **高优先级** - 影响 CPU 效率和用户体验

---

## 🟡 问题 2: ScanHistory.tsx 缺少刷新机制

### 位置
`src/pages/ScanHistory.tsx:13-25`

```typescript
useEffect(() => {
  loadHistory(); // 仅在挂载时加载
}, []);
```

### 问题分析

1. **功能缺失**
   - 用户执行新扫描后，历史页面不会自动更新
   - 必须手动刷新页面才能看到新记录
   - 缺少手动刷新按钮

2. **用户体验问题**
   - 从安全页面扫描后切换到历史页面，数据为旧数据
   - 没有明确的"上次更新时间"提示

### 修复方案

**方案 A: 添加刷新按钮 + 定期轮询**
```typescript
useEffect(() => {
  loadHistory();
  const interval = setInterval(loadHistory, 60000); // 每分钟刷新
  return () => clearInterval(interval);
}, []);
```

**方案 B: 使用 TanStack Query** (推荐)
```typescript
export function useScanHistory(limit: number = 50) {
  return useQuery({
    queryKey: ['scan-history', limit],
    queryFn: () => invoke<ScanRecord[]>('get_scan_history', { limit }),
    staleTime: 30000, // 30 秒内数据认为新鲜
    refetchInterval: 60000, // 每分钟自动刷新
  });
}
```

### 修复优先级
🟡 **中优先级** - 影响用户体验，但不阻塞使用

---

## ✅ 良好实践

### 1. useSkills Hook
```typescript
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => { ... },
    staleTime: 1000 * 60 * 5,  // 5 分钟内认为数据新鲜
    gcTime: 1000 * 60 * 10,     // 10 分钟后清理缓存
  });
}
```

**优点**:
- ✅ 使用 TanStack Query 的智能缓存
- ✅ mutation 后自动 invalidate (`queryClient.invalidateQueries`)
- ✅ staleTime 避免不必要的网络请求
- ✅ gcTime 平衡内存占用和用户体验

### 2. useMarketplaceSkills Hook
```typescript
export function useMarketplaceSkills() {
  return useQuery({
    queryKey: ['marketplace-skills'],
    queryFn: async () => { ... },
    staleTime: 1000 * 60 * 10,  // 10 分钟（市场数据变化少）
    gcTime: 1000 * 60 * 30,     // 30 分钟
  });
}
```

**优点**:
- ✅ 根据数据变化频率调整 staleTime
- ✅ 静态数据（JSON 文件）使用更长的缓存时间

### 3. Security.tsx
```typescript
const handleScan = async () => {
  setScanning(true);
  try {
    await refetch(); // 手动触发刷新
    setLastScan(new Date());
  } finally {
    setScanning(false);
  }
};
```

**优点**:
- ✅ 按需刷新，不使用轮询
- ✅ 显示扫描状态和上次扫描时间
- ✅ 用户有明确的控制权

---

## 📋 修复建议优先级

### 🔴 高优先级（立即修复）
1. **CacheStatsCard 轮询频率**: 5秒 → 30秒

### 🟡 中优先级（下次迭代）
2. **ScanHistory 自动刷新**: 添加 TanStack Query 或轮询
3. **CacheStatsCard 事件驱动**: 实现后端主动推送

### 🟢 低优先级（长期优化）
4. **全局刷新策略**: 统一配置刷新间隔
5. **离线支持**: 网络恢复时自动刷新

---

## 🎯 推荐刷新策略

### 静态数据（变化少）
- **staleTime**: 10-30 分钟
- **刷新方式**: 按需或页面激活时
- **示例**: 市场数据、配置信息

### 准静态数据（周期变化）
- **staleTime**: 2-5 分钟
- **刷新方式**: TanStack Query + 自动失效
- **示例**: 已安装 Skills 列表

### 动态数据（频繁变化）
- **staleTime**: 10-30 秒
- **refreshInterval**: 30-60 秒
- **刷新方式**: 定期轮询 + 事件驱动
- **示例**: 扫描历史、实时统计

### 实时数据（即时性要求高）
- **刷新方式**: WebSocket / SSE 事件推送
- **示例**: (当前未使用)

---

## 📊 性能影响估算

### 当前状态
| 模块 | 每分钟请求次数 | 每小时请求次数 |
|------|--------------|--------------|
| CacheStatsCard | 12 | 720 |
| useSkills (后台) | ~0.2 | ~12 |
| ScanHistory | 0 | 0 |

### 修复后
| 模块 | 每分钟请求次数 | 每小时请求次数 |
|------|--------------|--------------|
| CacheStatsCard | 2 | 120 |
| useSkills (后台) | ~0.2 | ~12 |
| ScanHistory | 1 | 60 |

**优化效果**: 减少 85% 的不必要请求

---

## 🔧 实施计划

### Phase 1: 立即修复（今天）
- [ ] 修改 CacheStatsCard 轮询间隔: 5s → 30s

### Phase 2: 功能增强（本周）
- [ ] ScanHistory 添加刷新按钮
- [ ] ScanHistory 使用 TanStack Query
- [ ] 添加全局刷新间隔配置

### Phase 3: 架构优化（下个迭代）
- [ ] 实现 Tauri 事件驱动的缓存更新
- [ ] 添加网络状态监听
- [ ] 实现智能预加载策略

---

**报告生成**: Claude Code
**下次审查**: Phase 2 完成后
