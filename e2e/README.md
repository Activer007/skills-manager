# E2E Tests

Skill Master 端到端测试套件。

## 测试报告

所有测试报告已移至 [`docs/reports/e2e/`](../docs/reports/e2e/)。

## 运行测试

```bash
# 运行所有 E2E 测试
npm run e2e

# 运行特定测试
npm run e2e -- share-link-complete-flow.spec.ts

# 调试模式
npm run e2e:debug
```

## 测试文件

测试规范文件位于 `specs/` 目录：
- `concurrent-tasks.spec.ts` - 并发任务测试
- `share-link-complete-flow.spec.ts` - 分享链接完整流程
- `skill-management.spec.ts` - Skill 管理测试
- 等等...
