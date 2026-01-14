# Security Rules Reference

**Version**: 1.1.0
**Last Updated**: 2026-01-14
**Total Rules**: 68

---

## Table of Contents

1. [Overview](#overview)
2. [Rule Categories](#rule-categories)
3. [Severity Levels](#severity-levels)
4. [Rules Reference](#rules-reference)
   - [A. Destructive Operations](#a-destructive-operations)
   - [B. Remote Code Execution](#b-remote-code-execution)
   - [C. Command Injection](#c-command-injection)
   - [D. Network Operations](#d-network-operations)
   - [E. Privilege Escalation](#e-privilege-escalation)
   - [F. Persistence](#f-persistence)
   - [G. Secrets Leakage](#g-secrets-leakage)
   - [H. Sensitive File Access](#h-sensitive-file-access)
   - [I. Node.js Command Injection](#i-nodejs-command-injection)
   - [J. Enhanced Secrets Detection](#j-enhanced-secrets-detection)
   - [K. Enhanced Network Detection](#k-enhanced-network-detection)
   - [L. JavaScript/TypeScript Specific](#l-javascripttypescript-specific)
   - [M. Rust Specific](#m-rust-specific)
   - [N. Tauri Specific](#n-tauri-specific)
5. [Configuration](#configuration)
6. [Best Practices](#best-practices)

---

## Overview

The Skill Manager Security Scanner uses **68 pattern-based rules** to detect potentially dangerous code patterns in Skills. Each rule has:
- **Unique ID**: For referencing and configuration
- **Name**: Human-readable description
- **Regex Pattern**: Detection pattern
- **Severity**: Critical, High, Medium, or Low
- **Category**: Rule classification
- **Weight**: Score deduction (0-100)
- **Confidence**: High, Medium, or Low
- **Remediation**: Security fix recommendations
- **CWE ID**: MITRE CWE mapping (if applicable)

### Key Statistics
| Category | Rule Count | Hard Triggers |
|----------|-----------|---------------|
| Destructive Operations | 4 | 4 |
| Remote Code Execution | 4 | 4 |
| Command Injection | 17 | 0 |
| Network Operations | 10 | 0 |
| Privilege Escalation | 3 | 1 |
| Persistence | 2 | 1 |
| Secrets Leakage | 11 | 0 |
| Sensitive File Access | 6 | 2 |
| JavaScript/TypeScript | 10 | 0 |
| Rust | 5 | 0 |
| Tauri | 3 | 0 |
| **TOTAL** | **68** | **12** |

---

## Rule Categories

### Category Definitions

| Category | Description |
|----------|-------------|
| `Destructive` | File system destruction (rm, mkfs, dd) |
| `RemoteExec` | Remote code execution (curl\|sh, wget\|sh) |
| `CmdInjection` | Command injection vulnerabilities |
| `Network` | Network operations and data exfiltration |
| `Privilege` | Privilege escalation attempts |
| `Persistence` | Persistence mechanisms (cron, SSH keys) |
| `Secrets` | Hardcoded credentials and secrets |
| `SensitiveFileAccess` | Access to sensitive system files |
| `FileSystem` | File system operations |

---

## Severity Levels

| Severity | Description | Block Installation | Score Deduction |
|----------|-------------|-------------------|-----------------|
| **Critical** | Immediate threat, data loss | **Yes (Hard Trigger)** | 80-100 |
| **High** | Serious security risk | No | 60-75 |
| **Medium** | Moderate security issue | No | 40-55 |
| **Low** | Minor security concern | No | 15-35 |

**Hard Triggers**: Rules with `hard_trigger: true` will **block Skill installation** even if `skipSecurityCheck` is false.

---

## Rules Reference

### A. Destructive Operations (4 rules)

#### A1. RM_RF_ROOT
- **ID**: `RM_RF_ROOT`
- **Name**: 删除根目录
- **Pattern**: `rm\s+(-[a-zA-Z]*)*\s*-r[a-zA-Z]*\s+(-[a-zA-Z]*\s+)*/($|\s|;|\|)`
- **Severity**: Critical 🔴
- **Weight**: 100
- **Hard Trigger**: ✅ Yes
- **Description**: `rm -rf /` deletes root directory
- **CWE**: CWE-78
- **Remediation**: Check command parameters, avoid operating on root directory

#### A2. RM_RF_HOME
- **ID**: `RM_RF_HOME`
- **Name**: 删除用户目录
- **Pattern**: `rm\s+(-[a-zA-Z]*)*\s*-r[a-zA-Z]*\s+(-[a-zA-Z]*\s+)*(~|\$HOME)`
- **Severity**: Critical 🔴
- **Weight**: 90
- **Hard Trigger**: ✅ Yes
- **CWE**: CWE-78

#### A3. DD_WIPE
- **ID**: `DD_WIPE`
- **Name**: 磁盘擦除
- **Pattern**: `dd\s+.*of=/dev/(sd[a-z]|nvme|hd[a-z]|vd[a-z])`
- **Severity**: Critical 🔴
- **Weight**: 100
- **Hard Trigger**: ✅ Yes
- **CWE**: CWE-78

#### A4. MKFS_FORMAT
- **ID**: `MKFS_FORMAT`
- **Name**: 格式化磁盘
- **Pattern**: `mkfs(\.[a-z0-9]+)?\s+/dev/`
- **Severity**: Critical 🔴
- **Weight**: 100
- **Hard Trigger**: ✅ Yes
- **CWE**: CWE-78

---

### B. Remote Code Execution (4 rules)

#### B1. CURL_PIPE_SH
- **ID**: `CURL_PIPE_SH`
- **Name**: Curl管道执行
- **Pattern**: `curl\s+[^|]*\|\s*(ba)?sh`
- **Severity**: Critical 🔴
- **Weight**: 90
- **Hard Trigger**: ✅ Yes
- **Remediation**: Download and inspect scripts before execution
- **CWE**: CWE-78

#### B2. WGET_PIPE_SH
- **ID**: `WGET_PIPE_SH`
- **Name**: Wget管道执行
- **Pattern**: `wget\s+[^|]*\|\s*(ba)?sh`

#### B3. BASE64_EXEC
- **ID**: `BASE64_EXEC`
- **Name**: Base64解码执行
- **Pattern**: `base64\s+(-d|--decode)[^|]*\|\s*(ba)?sh`
- **CWE**: CWE-506

#### B4. REVERSE_SHELL
- **ID**: `REVERSE_SHELL`
- **Name**: 反弹Shell
- **Pattern**: `(socket\.socket|s\.connect|os\.dup2|subprocess\.call.*bin/(ba)?sh)`
- **CWE**: CWE-506

---

### C. Command Injection (17 rules)

#### Python Command Injection (5 rules)

##### C1. PY_EVAL
- **ID**: `PY_EVAL`
- **Pattern**: `\beval\s*\(`
- **Severity**: High 🟠
- **Weight**: 70
- **CWE**: CWE-94

##### C2. PY_EXEC
- **ID**: `PY_EXEC`
- **Pattern**: `\bexec\s*\(`
- **CWE**: CWE-94

##### C3. OS_SYSTEM
- **ID**: `OS_SYSTEM`
- **Pattern**: `os\.system\s*\(`
- **Weight**: 65
- **CWE**: CWE-78

##### C4. SUBPROCESS_SHELL
- **ID**: `SUBPROCESS_SHELL`
- **Pattern**: `subprocess\.(run|call|Popen)\s*\([^)]*shell\s*=\s*True`
- **Weight**: 65

##### C5. SUBPROCESS_CALL
- **ID**: `SUBPROCESS_CALL`
- **Pattern**: `subprocess\.(run|call|Popen)\s*\(`
- **Weight**: 25

#### Node.js Command Injection (3 rules)

##### C6. NODE_CHILD_EXEC
- **ID**: `NODE_CHILD_EXEC`
- **Pattern**: `child_process\.exec\s*\(`
- **Weight**: 70
- **CWE**: CWE-78

##### C7. NODE_VM_RUN
- **ID**: `NODE_VM_RUN`
- **Pattern**: `vm\.runInNewContext\s*\(`
- **Weight**: 65
- **CWE**: CWE-94

##### C8. NODE_EVAL
- **ID**: `NODE_EVAL`
- **Pattern**: `\beval\s*\(`
- **Weight**: 70
- **Note**: eval has legitimate uses in JavaScript

---

### L. JavaScript/TypeScript Specific (10 rules)

#### L1. JS_DANGEROUSLY_SET_INNER_HTML
- **ID**: `JS_DANGEROUSLY_SET_INNER_HTML`
- **Name**: React dangerouslySetInnerHTML
- **Pattern**: `dangerouslySetInnerHTML\s*=\s*\{\{`
- **Severity**: High 🟠
- **Weight**: 60
- **Remediation**: Avoid using dangerouslySetInnerHTML, or sanitize with DOMPurify
- **CWE**: CWE-79 (XSS)

#### L2. JS_INNER_HTML
- **ID**: `JS_INNER_HTML`
- **Pattern**: `\.innerHTML\s*=`
- **Severity**: Medium 🟡
- **Weight**: 50
- **Remediation**: Use textContent or createElement instead
- **CWE**: CWE-79

#### L3. JS_DOCUMENT_WRITE
- **ID**: `JS_DOCUMENT_WRITE`
- **Pattern**: `document\.write\s*\(`
- **Severity**: High 🟠
- **Weight**: 55
- **CWE**: CWE-79

#### L4. JS_SET_TIMEOUT_STRING
- **ID**: `JS_SET_TIMEOUT_STRING`
- **Pattern**: `setTimeout\s*\(\s*['"]`
- **Severity**: Medium 🟡
- **Weight**: 45
- **Remediation**: Use function parameter instead of string
- **CWE**: CWE-94

#### L5. JS_SET_INTERVAL_STRING
- **ID**: `JS_SET_INTERVAL_STRING`
- **Pattern**: `setInterval\s*\(\s*['"]`
- **Weight**: 45

#### L6. JS_POST_MESSAGE
- **ID**: `JS_POST_MESSAGE`
- **Pattern**: `\.postMessage\s*\(`
- **Severity**: Low 🟢
- **Weight**: 30
- **Remediation**: Verify origin parameter when receiving messages
- **CWE**: CWE-346

#### L7. JS_LOCAL_STORAGE_SENSITIVE
- **ID**: `JS_LOCAL_STORAGE_SENSITIVE`
- **Pattern**: `localStorage\.(setItem|setItem)\s*\(\s*['"]*(token|password|secret|key)`
- **Severity**: Medium 🟡
- **Weight**: 50
- **Remediation**: Use sessionStorage or httpOnly cookie for sensitive data
- **CWE**: CWE-922

#### L8. JS_LOCATION_ASSIGN
- **ID**: `JS_LOCATION_ASSIGN`
- **Pattern**: `location\.(assign|replace|href)\s*=`
- **Severity**: Medium 🟡
- **Weight**: 40
- **Remediation**: Validate redirect URLs to prevent open redirects
- **CWE**: CWE-601

#### L9. JS_FUNCTION_CONSTRUCTOR
- **ID**: `JS_FUNCTION_CONSTRUCTOR`
- **Pattern**: `new\s+Function\s*\(`
- **Severity**: High 🟠
- **Weight**: 65
- **Remediation**: Avoid dynamically generating code with Function constructor
- **CWE**: CWE-94

#### L10. JS_DYNAMIC_IMPORT
- **ID**: `JS_DYNAMIC_IMPORT`
- **Pattern**: `import\s*\(\s*[^)]*['"][^'"]*['"]`
- **Severity**: Low 🟢
- **Weight**: 35
- **Remediation**: Validate dynamic import paths
- **CWE**: CWE-94

---

### M. Rust Specific (5 rules)

#### M1. RUST_UNSAFE_BLOCK
- **ID**: `RUST_UNSAFE_BLOCK`
- **Pattern**: `\bunsafe\b\s*\{`
- **Severity**: Medium 🟡
- **Weight**: 55
- **Remediation**: Review unsafe code for memory safety, consider safe abstractions
- **CWE**: CWE-119

#### M2. RUST_RAW_POINTER
- **ID**: `RUST_RAW_POINTER`
- **Pattern**: `\*const\s+\w+|\*mut\s+\w+`
- **Severity**: High 🟠
- **Weight**: 60
- **Remediation**: Prefer references and smart pointers (Box, Rc, Arc)
- **CWE**: CWE-119

#### M3. RUST_TRANSMUTE
- **ID**: `RUST_TRANSMUTE`
- **Pattern**: `(std::mem::|mem::)?transmute\s*\(`
- **Severity**: High 🟠
- **Weight**: 70
- **Remediation**: Use safe type conversion methods instead
- **CWE**: CWE-758

#### M4. RUST_EXTERN_C
- **ID**: `RUST_EXTERN_C`
- **Pattern**: `extern\s+['"]C['"]`
- **Severity**: Medium 🟡
- **Weight**: 50
- **Remediation**: Ensure FFI calls use trusted, safe external libraries
- **CWE**: CWE-78

#### M5. RUST_MEM_FORGET
- **ID**: `RUST_MEM_FORGET`
- **Pattern**: `std::mem::forget\s*\(`
- **Severity**: Low 🟢
- **Weight**: 30
- **Remediation**: Review memory management logic for leaks
- **CWE**: CWE-404

---

### N. Tauri Specific (3 rules)

#### N1. TAURI_INVOKE
- **ID**: `TAURI_INVOKE`
- **Pattern**: `invoke\s*\(\s*['"]`
- **Severity**: Low 🟢
- **Weight**: 25
- **Remediation**: Ensure only registered Tauri commands are called

#### N2. TAURI_COMMAND_NEW
- **ID**: `TAURI_COMMAND_NEW`
- **Pattern**: `Command::new\s*\(`
- **Severity**: High 🟠
- **Weight**: 65
- **Remediation**: Validate command parameters to prevent injection
- **CWE**: CWE-78

#### N3. TAURI_FS_API
- **ID**: `TAURI_FS_API`
- **Pattern**: `(read|write|remove|rename)File|readDir|createDir`
- **Severity**: Medium 🟡
- **Weight**: 45
- **Remediation**: Ensure file path validation to prevent path traversal
- **CWE**: CWE-22

---

## Configuration

### Config File Location
```
~/.skill-manager/security-config.json
```

### Configuration Schema

```json
{
  "enabled_rules": ["RULE_ID_1", "RULE_ID_2"],
  "whitelist": ["*.md", "README*"],
  "blacklist": ["*.sh", "*.py"],
  "block_on_hard_trigger": true
}
```

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `enabled_rules` | `string[]` | List of enabled rule IDs (empty = all enabled) |
| `whitelist` | `string[]` | File patterns to skip scanning |
| `blacklist` | `string[]` | File patterns to force scan |
| `block_on_hard_trigger` | `boolean` | Whether to block on hard trigger rules |

### Tauri Commands

#### Get Security Config
```typescript
import { invoke } from '@tauri-apps/api/core';

const config = await invoke('get_security_config');
console.log(config);
```

#### Update Security Config
```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('update_security_config', {
  config: {
    enabled_rules: [],
    whitelist: ['*.md'],
    blacklist: ['*.sh'],
    block_on_hard_trigger: true
  }
});
```

---

## Best Practices

### 1. Rule Management
- **Default**: All rules enabled (empty `enabled_rules`)
- **Disable with Caution**: Only disable rules if you understand the risk
- **Custom Whitelist**: Use for known-safe files (e.g., documentation)
- **Blacklist**: Force scanning of high-risk files

### 2. Hard Triggers
The following 12 rules will **block Skill installation**:
1. `RM_RF_ROOT` - rm -rf /
2. `RM_RF_HOME` - rm -rf ~
3. `DD_WIPE` - dd disk wipe
4. `MKFS_FORMAT` - mkfs format
5. `CURL_PIPE_SH` - curl | sh
6. `WGET_PIPE_SH` - wget | sh
7. `BASE64_EXEC` - base64 decode | sh
8. `REVERSE_SHELL` - Reverse shell backdoor
9. `SUDOERS` - sudoers modification
10. `SSH_KEYS` - SSH key injection
11. `READ_SHADOW` - Reading /etc/shadow
12. Symbolic links (symlink detection)

### 3. Score Calculation
- **Base Score**: 100
- **Deduction**: Sum of matched rule weights
- **Final Score**: `max(0, 100 - total_deduction)`

### 4. Security Levels
| Score Range | Level | Description |
|-------------|-------|-------------|
| 90-100 | Safe | ✅ No significant issues |
| 70-89 | Low | ⚠️ Minor issues, review recommended |
| 50-69 | Medium | ⚠️ Moderate risks, caution advised |
| 30-49 | High | 🚨 Serious risks, use with caution |
| 0-29 | Critical | 🛑 Severe risks, not recommended |

### 5. Development Workflow
1. **Write Skill**: Develop your Skill normally
2. **Scan Locally**: Use Security Scanner before publishing
3. **Review Issues**: Check security report for findings
4. **Fix Issues**: Apply remediation recommendations
5. **Re-scan**: Verify all critical issues are resolved
6. **Publish**: Share with confidence

---

## Contributing

### Adding New Rules

To add a new security rule:

1. **Edit** `src-tauri/src/security/rules.rs`
2. **Add PatternRule**:
   ```rust
   PatternRule::new(
       "RULE_ID",
       "Rule Name",
       r"pattern",
       Severity::High,
       Category::CmdInjection,
       60,  // weight
       "Description",
       false,  // hard_trigger
       Confidence::High,
       "Remediation advice",
       Some("CWE-XXX"),
   ),
   ```
3. **Write Test**: Add test case in `scanner.rs`
4. **Run Tests**: `cargo test`
5. **Update Docs**: Add entry to this file

### Testing New Rules

```rust
#[test]
fn test_new_rule() {
    let scanner = SecurityScanner::new();
    let content = r#"
    // Code that should trigger the rule
    "#;
    let report = scanner.scan_file(content, "test.ext", "en").unwrap();
    assert!(report.issues.iter().any(|i|
        i.description.contains("keyword")
    ));
}
```

---

## Changelog

### v1.1.0 (2026-01-14)
- ✅ Added 10 JavaScript/TypeScript rules
- ✅ Added 5 Rust-specific rules
- ✅ Added 3 Tauri-specific rules
- ✅ Implemented SecurityConfig system
- ✅ Added `get_security_config` and `update_security_config` Tauri commands
- ✅ Total rules: 50 → 68

### v1.0.0 (Initial)
- ✅ 50 base security rules
- ✅ Hard trigger blocking
- ✅ Security scoring system
- ✅ Comprehensive test coverage

---

## References

- **CWE Dictionary**: https://cwe.mitre.org/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Rust Security Guidelines**: https://doc.rust-lang.org/nomicon/
- **Tauri Security**: https://tauri.app/v2/guides/security/

---

**Document Version**: 1.1.0
**Maintained By**: Skill Manager Security Team
**License**: MIT
