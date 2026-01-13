# Rust 开发环境安装指南

## 📋 系统信息

- **操作系统：** WSL2 (Linux on Windows)
- **架构：** x86_64
- **可用空间：** 911GB ✅

---

## 🚀 安装步骤

### 步骤 1：安装 Rust 工具链（使用 rustup）

**推荐方法：使用官方安装脚本**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**安装过程中的选项：**
- 提示 `Proceed with installation (default)` 时，按 **Enter**（选择默认安装）
- 这将安装：
  - `rustc`（Rust 编译器）
  - `cargo`（包管理器和构建工具）
  - `rustup`（工具链管理器）

**预计下载大小：** ~300-400MB
**安装后占用：** ~1.5-2GB

---

### 步骤 2：配置环境变量

安装完成后，需要重新加载环境变量：

```bash
source $HOME/.cargo/env
```

**或者重启终端，然后自动生效。**

---

### 步骤 3：验证安装

```bash
# 检查 Rust 编译器版本
rustc --version

# 检查 Cargo 版本
cargo --version

# 检查 rustup 版本
rustup --version
```

**预期输出示例：**
```
rustc 1.75.0 (或更新版本)
cargo 1.75.0 (或更新版本)
rustup 1.26.0 (或更新版本)
```

---

### 步骤 4：安装常用组件（可选但推荐）

```bash
# 安装 Rust 代码格式化工具
rustup component add rustfmt

# 安装 Rust 代码检查工具（linter）
rustup component add clippy

# 安装 Rust 语言服务器（用于 IDE 支持）
rustup component add rust-analyzer
```

---

### 步骤 5：配置国内镜像源（可选，加速依赖下载）

如果你在中国大陆，建议配置镜像源加速依赖下载：

**创建/编辑配置文件：**

```bash
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[http]
check-revoke = false
EOF
```

**其他可选镜像源：**
- USTC（中科大）：`https://mirrors.ustc.edu.cn/crates.io-index`
- TUNA（清华）：`https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git`
- SJTU（上海交大）：`https://mirrors.sjtug.sjtu.edu.cn/git/crates.io-index/`

---

## 📦 为本项目安装依赖

安装完成后，返回项目目录并下载依赖：

```bash
cd /root/workspace/skills-manager/src-tauri

# 下载并编译依赖（首次运行会比较慢）
cargo check
```

**预计时间：**
- 首次运行：5-10 分钟（需要下载和编译所有依赖）
- 后续编译：几秒到几分钟

**缓存位置：**
- 依赖缓存：`~/.cargo/registry/`（会逐渐增长，可能达到 1-3GB）
- 编译产物：`src-tauri/target/`（开发模式约 1-2GB，可随时删除重建）

---

## 🔍 常见问题

### Q1: 安装脚本无法下载？

**解决方案：手动下载并安装**

```bash
# 1. 下载安装脚本
wget https://sh.rustup.rs -O rustup-init.sh

# 2. 运行安装脚本
sh rustup-init.sh
```

### Q2: 如何卸载 Rust？

```bash
rustup self uninstall
```

### Q3: 如何更新 Rust 到最新版本？

```bash
rustup update
```

### Q4: 编译时内存不足？

如果系统内存较小（<4GB），可以限制并行编译任务数：

```bash
# 在 ~/.cargo/config.toml 中添加：
[build]
jobs = 2  # 限制为 2 个并行任务
```

### Q5: cargo check 速度太慢？

可以使用更快的链接器：

```bash
# Ubuntu/Debian
sudo apt install lld

# 然后在 ~/.cargo/config.toml 添加：
[target.x86_64-unknown-linux-gnu]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]
```

---

## 📊 磁盘空间预估

| 组件 | 大小 |
|------|------|
| Rust 工具链 | ~500MB |
| Cargo 缓存（随项目增长） | 1-3GB |
| src-tauri/target/ (Debug) | 1-2GB |
| src-tauri/target/ (Release) | 500MB-1GB |
| **总计（预估）** | **3-6GB** |

**你的可用空间：911GB** ✅ 完全足够

---

## ✅ 安装完成检查清单

安装完成后，请运行以下命令验证：

```bash
# 1. 检查 Rust 版本
rustc --version

# 2. 检查 Cargo 版本
cargo --version

# 3. 测试编译项目
cd /root/workspace/skills-manager/src-tauri
cargo check

# 4. 查看已安装的组件
rustup component list --installed
```

如果以上命令都成功运行，说明安装完成！🎉

---

## 🔗 有用的资源

- **Rust 官方文档：** https://doc.rust-lang.org/
- **Cargo 文档：** https://doc.rust-lang.org/cargo/
- **Rust 中文社区：** https://rustcc.cn/
- **Tauri 文档：** https://tauri.app/

---

**下一步：** 安装完成后，我们将开始实现评分系统的核心数据结构（阶段1）。
