# 🛡️ Security Rules Reference

**Generated on**: 2026-01-14
**Total Rules**: 72

This document lists all security rules used by the Skills Manager scanner.

## 📊 Summary by Category

| Category | Count |
|----------|-------|
| Destructive | 7 |
| RemoteExec | 6 |
| CmdInjection | 28 |
| Network | 9 |
| Privilege | 3 |
| Persistence | 2 |
| Secrets | 10 |
| SensitiveFileAccess | 7 |

## 📋 Detailed Rules

### Destructive

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​RM_RF_ROOT​` | **Critical** | rm -rf / 删除根目录 |   | CWE-78 |
| `​RM_RF_HOME​` | **Critical** | rm -rf ~ 删除用户目录 |   | CWE-78 |
| `​DD_WIPE​` | **Critical** | dd 写入磁盘设备 |   | CWE-78 |
| `​MKFS_FORMAT​` | **Critical** | mkfs 格式化命令 |   | CWE-78 |
| `​RUST_MEM_FORGET​` | **Low** | Rust std::mem::forget 调用（内存泄漏风险） |   | CWE-404 |
| `​GO_GOROUTINE_LEAK​` | **Low** | Go goroutine 调用（可能泄漏） |   | CWE-404 |
| `​SHELL_GLOB_EXPANSION​` | **High** | Shell 通配符扩展（可能误删文件） |   | CWE-78 |

### RemoteExec

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​CURL_PIPE_SH​` | **Critical** | curl | sh 远程执行 |   | CWE-78 |
| `​WGET_PIPE_SH​` | **Critical** | wget | sh 远程执行 |   | CWE-78 |
| `​BASE64_EXEC​` | **Critical** | base64 解码后执行 |   | CWE-506 |
| `​REVERSE_SHELL​` | **Critical** | 反弹Shell后门 |   | CWE-506 |
| `​TAURI_INVOKE​` | **Low** | Tauri invoke() 调用后端命令 |   | - |
| `​SHELL_SOURCE_UNTRUSTED​` | **High** | Shell source 执行不可信文件 |   | CWE-94 |

### CmdInjection

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​PY_EVAL​` | **High** | eval() 动态执行 |   | CWE-94 |
| `​PY_EXEC​` | **High** | exec() 动态执行 |   | CWE-94 |
| `​OS_SYSTEM​` | **High** | os.system() Shell执行 |   | CWE-78 |
| `​SUBPROCESS_SHELL​` | **High** | subprocess shell=True |   | CWE-78 |
| `​SUBPROCESS_CALL​` | **Medium** | subprocess 进程调用 |   | CWE-78 |
| `​NODE_CHILD_EXEC​` | **High** | Node.js child_process.exec 执行 |   | CWE-78 |
| `​NODE_VM_RUN​` | **High** | Node.js 动态代码执行 |   | CWE-94 |
| `​NODE_EVAL​` | **High** | JavaScript eval() 动态执行 | // eval 在 JS 中有合法用途
             | CWE-94 |
| `​JS_DANGEROUSLY_SET_INNER_HTML​` | **High** | React dangerouslySetInnerHTML 使用（XSS 风险） |   | CWE-79 |
| `​JS_INNER_HTML​` | **Medium** | JavaScript innerHTML 赋值（XSS 风险） |   | CWE-79 |
| `​JS_DOCUMENT_WRITE​` | **High** | document.write() 调用（XSS 风险） |   | CWE-79 |
| `​JS_SET_TIMEOUT_STRING​` | **Medium** | setTimeout() 使用字符串参数(代码注入风险) |   | CWE-94 |
| `​JS_SET_INTERVAL_STRING​` | **Medium** | setInterval() 使用字符串参数(代码注入风险) |   | CWE-94 |
| `​JS_FUNCTION_CONSTRUCTOR​` | **High** | Function() 构造函数（代码生成风险） |   | CWE-94 |
| `​RUST_UNSAFE_BLOCK​` | **Medium** | Rust unsafe 块（绕过安全检查） |   | CWE-119 |
| `​RUST_RAW_POINTER​` | **High** | Rust 原始指针操作（内存安全风险） |   | CWE-119 |
| `​RUST_TRANSMUTE​` | **High** | Rust transmute 类型转换（未定义行为风险） |   | CWE-758 |
| `​RUST_EXTERN_C​` | **Medium** | Rust FFI 外部函数调用（潜在不安全） |   | CWE-78 |
| `​TAURI_COMMAND_NEW​` | **High** | Tauri Command 执行系统命令 |   | CWE-78 |
| `​GO_UNSAFE_PACKAGE​` | **Medium** | Go unsafe 包使用（绕过类型安全） |   | CWE-119 |
| `​GO_CGO_USAGE​` | **Medium** | Go CGo 调用 C 代码（潜在不安全） |   | CWE-78 |
| `​GO_RACE_CONDITION​` | **Medium** | Go 并发访问共享变量（数据竞争风险） |   | CWE-362 |
| `​PYTHON_PICKLE_LOAD​` | **Critical** | Python pickle.load 不安全反序列化（远程代码执行） |   | CWE-502 |
| `​PYTHON_YAML_LOAD​` | **High** | Python yaml.load 不安全加载（代码执行风险） |   | CWE-94 |
| `​PYTHON_CODE_COMPILE​` | **High** | Python compile() 动态编译代码 |   | CWE-94 |
| `​PYTHON_INPUT_RAW​` | **Low** | Python input() 接收用户输入（需验证） |   | CWE-20 |
| `​SHELL_WORD_SPLITTING​` | **Medium** | Shell 变量未引号包裹（单词分割风险） | 使用双引号包裹变量:  | CWE-78 |
| `​SHELL_COMMAND_SUBSTITUTION​` | **High** | Shell 命令替换包含变量（注入风险） |   | CWE-78 |

### Network

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​CURL_POST​` | **Medium** | curl POST 请求 |   | CWE-319 |
| `​NETCAT​` | **High** | netcat 网络连接 |   | CWE-319 |
| `​PY_URLLIB​` | **Medium** | urllib 网络请求 |   | - |
| `​HTTP_REQUEST​` | **Low** | Python requests HTTP 请求 |   | - |
| `​WEBSOCKET_CONNECT​` | **Low** | WebSocket 连接 |   | - |
| `​FTP_PROTOCOL​` | **Medium** | 使用不安全的 FTP 协议 |   | CWE-319 |
| `​JS_POST_MESSAGE​` | **Low** | postMessage() 调用（需验证 origin） |   | CWE-346 |
| `​JS_LOCATION_ASSIGN​` | **Medium** | location.assign/replace 调用（开放重定向风险） |   | CWE-601 |
| `​JS_DYNAMIC_IMPORT​` | **Low** | 动态 import() 加载模块 |   | CWE-94 |

### Privilege

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​SUDO​` | **High** | sudo 权限提升 |   | CWE-250 |
| `​CHMOD_777​` | **High** | chmod 777 开放权限 |   | CWE-732 |
| `​SUDOERS​` | **Critical** | sudoers 文件修改 |   | CWE-250 |

### Persistence

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​CRONTAB​` | **High** | crontab 持久化 |   | CWE-506 |
| `​SSH_KEYS​` | **Critical** | SSH 密钥写入 |   | CWE-506 |

### Secrets

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​PRIVATE_KEY​` | **High** | 硬编码私钥 |   | CWE-798 |
| `​API_KEY​` | **High** | 硬编码 API Key |   | CWE-798 |
| `​PASSWORD​` | **High** | 硬编码密码 |   | CWE-798 |
| `​AWS_KEY​` | **Critical** | AWS Access Key |   | CWE-798 |
| `​GITHUB_TOKEN​` | **Critical** | GitHub Token |   | CWE-798 |
| `​JWT_TOKEN​` | **High** | 硬编码的 JWT Token |   | CWE-798 |
| `​DB_CONNECTION_STRING​` | **High** | 硬编码的数据库连接字符串 |   | CWE-798 |
| `​SLACK_WEBHOOK​` | **Medium** | 硬编码的 Slack Webhook URL |   | CWE-798 |
| `​GENERIC_SECRET​` | **Medium** | 可能的硬编码密钥 | // 误报可能性较高
             | CWE-798 |
| `​JS_LOCAL_STORAGE_SENSITIVE​` | **Medium** | localStorage 存储敏感信息（明文存储） |   | CWE-922 |

### SensitiveFileAccess

| ID | Severity | Description | Remediation | CWE |
|----|----------|-------------|-------------|-----|
| `​READ_SSH_PRIVATE_KEY​` | **High** | 读取SSH私钥文件 |   | CWE-522 |
| `​READ_AWS_CREDENTIALS​` | **High** | 读取AWS凭证文件 |   | CWE-522 |
| `​READ_ENV_FILE​` | **Medium** | 读取环境变量配置文件 |   | CWE-522 |
| `​READ_PASSWD​` | **Medium** | 读取系统用户信息 |   | CWE-200 |
| `​READ_SHADOW​` | **Critical** | 读取系统密码哈希文件 |   | CWE-522 |
| `​READ_GIT_CREDENTIALS​` | **High** | 读取Git凭证存储文件 |   | CWE-522 |
| `​TAURI_FS_API​` | **Medium** | Tauri 文件系统 API 调用 |   | CWE-22 |

