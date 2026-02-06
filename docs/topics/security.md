# 🛡️ Skill Master 安全体系

**文档版本**: 1.0
**更新日期**: 2026-02-06
**相关组件**: 安全扫描系统、TrustShield、白名单管理

---

## 📋 概述

Skill Master 拥有完整的安全扫描和质量评分体系，确保用户安装的 Skills 安全可靠。

**核心特性**：
- ✅ **80+ 安全规则**，覆盖 9 大风险类别
- ✅ **三种扫描模式**（Strict/Standard/Relaxed）
- ✅ **智能缓存系统**（SHA-256 校验）
- ✅ **白名单管理**（Skill 白名单 + 规则白名单）
- ✅ **扫描历史记录**（搜索、筛选、导出）

---

## 1. 安全规则库

### 1.1 规则分类统计

| 类别 | 规则数量 | 说明 |
|------|---------|------|
| **Destructive** | 7 | 破坏性操作（rm -rf、格式化等） |
| **RemoteExec** | 6 | 远程代码执行 |
| **CmdInjection** | 28 | 命令注入 |
| **Network** | 9 | 网络请求 |
| **Privilege** | 3 | 权限提升 |
| **Persistence** | 2 | 持久化后门 |
| **Secrets** | 10 | 密钥泄露 |
| **SensitiveFileAccess** | 7 | 敏感文件访问 |

### 1.2 关键规则示例

#### Critical 级别（硬触发，直接阻止安装）

| 规则 ID | 描述 | 检测模式 |
|---------|------|----------|
| `RM_RF_ROOT` | 删除根目录 | `rm -rf /` |
| `CURL_PIPE_SH` | 远程脚本执行 | `curl ... \| sh` |
| `PYTHON_PICKLE_LOAD` | 不安全反序列化 | `pickle.load()` |
| `AWS_KEY` | AWS 密钥泄露 | `AKIA[0-9A-Z]{16}` |
| `GITHUB_TOKEN` | GitHub Token | `ghp_[a-zA-Z0-9]{36}` |
| `SSH_KEYS` | SSH 密钥写入 | 写入 `~/.ssh/` |

#### High 级别（警告，需用户确认）

| 规则 ID | 描述 | 检测模式 |
|---------|------|----------|
| `NODE_CHILD_EXEC` | Node.js 进程执行 | `child_process.exec` |
| `JS_EVAL` | JavaScript eval | `eval()` |
| `SUDO` | sudo 权限提升 | `sudo` |
| `PRIVATE_KEY` | 私钥泄露 | `-----BEGIN PRIVATE KEY-----` |

---

## 2. 安全扫描系统架构

### 2.1 扫描流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  用户安装   │ -> │  安全扫描   │ -> │  风险评估   │
│   Skill     │    │   (Rust)    │    │  (0-100分)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              v
                                      ┌─────────────┐
                                      │  决策:      │
                                      │  - 通过     │
                                      │  - 警告     │
                                      │  - 阻止     │
                                      └─────────────┘
```

### 2.2 扫描模式

| 模式 | 行为 | 误报率 | 适用场景 |
|------|------|--------|---------|
| **Strict** | 报告所有规则 | 高 | 安全审计 |
| **Standard** | 跳过低置信度规则 | 中 | 默认模式 |
| **Relaxed** | 仅报告高置信度规则 | 低 | 信任来源 |

### 2.3 硬触发机制

检测到 **Critical** 级别规则时，直接阻止安装：

```rust
// src-tauri/src/security/mod.rs
if findings.iter().any(|f| f.rule.severity == Severity::Critical) {
    return Err(Error::BlockedBySecurityCheck);
}
```

---

## 3. TrustShield 质量评分

### 3.1 评分维度（100 分制）

| 维度 | 权重 | 评分项 |
|------|------|--------|
| **内容质量** | 50 分 | 清晰度、技术深度、文档完整性、可操作性 |
| **技术实现** | 30 分 | 代码质量、模式设计、错误处理 |
| **维护性** | 10 分 | 更新频率、社区活跃度、兼容性 |
| **用户体验** | 10 分 | 易用性、可读性 |

### 3.2 评分等级

| 等级 | 分数范围 | 描述 |
|------|---------|------|
| **S** | 90-100 | 卓越 |
| **A** | 80-89 | 优秀 |
| **B** | 70-79 | 良好 |
| **C** | 60-69 | 合格 |
| **D** | 0-59 | 需改进 |

---

## 4. 白名单管理

### 4.1 Skill 白名单

信任的 Skill 直接跳过扫描：

```typescript
interface WhitelistEntry {
  skill_name: string;
  reason: string;
  added_at: string;
}
```

### 4.2 规则白名单

忽略特定安全规则的误报：

```typescript
interface RuleWhitelist {
  rule_id: string;
  skill_name: string;
  reason: string;
  added_at: string;
}
```

---

## 5. 扫描历史

### 5.1 历史记录功能

- ✅ **搜索**：按 Skill 名称搜索
- ✅ **筛选**：按安全等级筛选（All/Safe/Risk/Blocked）
- ✅ **导出**：JSON/CSV 格式
- ✅ **可视化**：Recharts 折线图展示趋势

### 5.2 数据存储

使用 SQLite 持久化存储：

```sql
CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY,
    skill_name TEXT NOT NULL,
    scan_time TEXT NOT NULL,
    security_level TEXT,
    score INTEGER,
    findings_count INTEGER
);
```

---

## 6. 智能缓存系统

### 6.1 SHA-256 校验

检测文件变更，避免重复扫描：

```rust
// src-tauri/src/security/cache.rs
fn calculate_checksum(dir: &Path) -> Result<String> {
    let files = WalkDir::new(dir).into_iter();
    // ... 计算所有文件的 SHA-256 哈希
}
```

### 6.2 缓存失效条件

- ✅ 文件内容变更（SHA-256 变化）
- ✅ 扫描模式变更
- ✅ 白名单变更
- ✅ 手动刷新

---

## 7. 相关命令

### Tauri Commands

| 命令 | 功能 |
|------|------|
| `scan_skill_security` | 扫描单个 Skill |
| `batch_scan_skills` | 批量扫描 Skills |
| `get_security_config` | 获取安全配置 |
| `update_security_config` | 更新安全配置 |
| `add_whitelist_entry` | 添加白名单条目 |
| `get_scan_history` | 获取扫描历史 |

---

## 8. 参考资源

### 文档
- [安全规则详细列表](../reference/security-rules.md)
- [Agent Skills Guard 对比分析](../reference/agent-skills-guard-analysis.md)

### 代码
- `src-tauri/src/security/` - 安全扫描引擎
- `src-tauri/src/commands/security.rs` - 安全命令
- `src/pages/Security.tsx` - 安全中心页面
- `src/pages/ScanHistory.tsx` - 扫描历史页面

---

**最后更新**: 2026-02-06
