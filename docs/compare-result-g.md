# 项目对比分析报告：Agent Skills Guard vs Skills Manager

**分析日期**: 2026-01-15
**分析人**: Gemini CLI
**分析对象**:
- **Agent Skills Guard**: v0.9.5 (参考基准)
- **Skills Manager**: 当前开发版本 (基于本地源码)

---

## 📋 执行摘要 (Executive Summary)

经过对 `skills-manager` 源代码的最新核查，**之前的假设（认为 Skills Manager 缺乏安全检查）是不准确的**。

当前版本的 `skills-manager` **已经集成了** 完整的安全扫描引擎，其核心逻辑与 `agent-skills-guard` 高度一致，甚至直接复用了其规则库和扫描器代码。因此，两个项目在**安全防护能力上已处于同等水平**。

**核心差异**现在转移到了：
1.  **下载机制**：`skills-manager` 仍依赖 `git clone`，而 `agent-skills-guard` 使用更轻量的 GitHub API。
2.  **评估维度**：`skills-manager` 拥有独有的**多维质量评分系统**（内容、技术、维护、UX），这是其超越 `agent-skills-guard` 的关键优势。

---

## 🔍 深度事实核查 (Fact Check)

### 1. 安全扫描能力
*   **Agent Skills Guard**: ✅ 60+ 规则，硬触发拦截，0-100 评分。
*   **Skills Manager**: ✅ **已实现**。
    *   **证据**: `src-tauri/src/lib.rs` 在 `import_github_skill` 和 `import_local_skill` 命令中显式调用了 `SecurityScanner`。
    *   **机制**: 扫描发现 `report.blocked` (硬触发) 时，会自动执行 `fs::remove_dir_all` 删除文件并报错拦截。
    *   **规则库**: `src-tauri/src/security/rules.rs` 包含完整的 60+ 条规则（JS, Rust, Python, Go 等）。
    *   **符号链接防护**: `src-tauri/src/security/scanner.rs` 中明确实现了符号链接检测和拦截逻辑。

### 2. 下载机制
*   **Agent Skills Guard**: ✅ **GitHub API + Zip 缓存**。
    *   只下载 `SKILL.md` 和必要文件，无需 Git 环境，速度快，无历史记录负担。
*   **Skills Manager**: ⚠️ **Git Clone**。
    *   **证据**: `src-tauri/src/lib.rs` 中使用 `Command::new("git")`。
    *   **逻辑**: 默认执行 `git clone --depth 1`。虽然支持 `sparse-checkout` (部分检出)，但仍依赖本地 Git 环境，且下载开销相对较大。

### 3. 评分系统
*   **Agent Skills Guard**: 🛡️ **仅安全评分**。
*   **Skills Manager**: 🌟 **双重评分 (安全 + 质量)**。
    *   **安全**: 复用了相同的 0-100 安全分模型。
    *   **质量**: 独有的 `SkillAnalyzer` 模块 (`src-tauri/src/analyzer/`)，从清晰度、技术深度、文档完整性、易用性四个维度对 Skill 进行打分，并生成改进建议。

---

## 📊 更新后的对比表

| 特性 | Agent Skills Guard | Skills Manager (当前) | 状态 |
| :--- | :--- | :--- | :--- |
| **安全规则引擎** | 60+ 规则 (Rust Regex) | ✅ **完全一致** (已集成) | 🤝 持平 |
| **硬触发拦截** | 有 (阻止安装) | ✅ **有** (删除并报错) | 🤝 持平 |
| **符号链接防护** | 有 | ✅ **有** | 🤝 持平 |
| **下载方式** | **GitHub API** (轻量, 无需 Git) | ⚠️ **Git Clone** (依赖 Git, 较重) | 🔴 SM 劣势 |
| **安装前扫描** | 内存/缓存扫描 | ⚠️ **落地后扫描** (先写盘再扫) | 🟡 SM 风险 |
| **质量评分** | 无 | 🌟 **全维度质量分析** | 🟢 SM 优势 |
| **缓存机制** | 完善的 Zip 缓存 | ✅ **已有缓存统计** (LruCache) | 🤝 持平 |

---

## 💡 修正后的改进建议

基于最新的代码现状，Skills Manager 不需要"重新实现"安全功能，而是需要**优化**和**差异化**。

### 1. 优化下载机制 (高优先级)
目前 `skills-manager` 最大的短板是依赖 `git clone`。
*   **建议**: 迁移至 `agent-skills-guard` 的 **GitHub API 下载模式**。
*   **收益**:
    *   **移除 Git 依赖**: 用户无需安装 Git 即可使用。
    *   **提升速度**: 仅下载 `SKILL.md` 和资源文件，避免下载 `.git` 目录。
    *   **提升安全性**: 避免 Git 协议潜在的漏洞或钩子触发。

### 2. 调整扫描时机 (中优先级)
目前逻辑是 `git clone` -> `target_dir` -> `scan` -> `blocked ? delete : keep`。
*   **风险**: 恶意文件确实"落地"到了目标目录，虽然很快被删除，但存在极短的时间窗口。
*   **建议**: 下载到**系统临时目录** (Temp Dir)，扫描通过后，再移动到 `My Skills` 目录。

### 3. 强化"质量评分"优势 (产品差异化)
Skills Manager 拥有独特的质量分析引擎，应将其作为核心卖点。
*   **建议**: 在 UI 中更突出显示"质量分" (Quality Score) 而不仅仅是"安全分"。例如："安全分 100，但质量分仅 40（文档缺失）"，帮助用户筛选高质量 Skill。

---

## 📝 结论

**Skills Manager 已经是一个安全且功能强大的工具。** 它成功吸收了 `agent-skills-guard` 的安全能力，并在此基础上叠加了独有的质量分析能力。

**下一步的最佳行动**不是"添加安全检查"（因为已经有了），而是**优化底层下载器**，使其摆脱对 Git 命令行的依赖，成为一个真正独立、轻量的 Skill 管理平台。
