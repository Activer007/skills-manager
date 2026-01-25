# GitHub Release 部署指南

## 📦 准备文件清单

已准备好的文件：

### 1. 初始化数据包
- ✅ `release-data/init-data.zip` (746 bytes)
  - 包含 config.json
  - 包含 marketplace.json
  - 包含示例技能 skills/example-skill/

### 2. 应用程序（需要构建）
- ⏸️ `skill-manager.exe` (~10MB) - 绿色版单文件
- ⏸️ `Skill Manager_1.0.0_x64_en-US.msi` (~3.5MB) - 安装包

### 3. 文档
- ✅ `RELEASE_NOTES.md` - Release 说明
- ✅ `README-GITHUB.md` - GitHub 仓库 README

## 🚀 部署步骤

### 步骤 1: 推送代码到 GitHub

```bash
cd C:\Users\17136\Desktop\work\project\others\creat\skill-manager

# 设置 remote
git remote set-url origin https://github.com/Activer007/skills-manager.git

# 推送代码
git push -u origin main
```

如果网络问题无法推送，可以使用 GitHub Desktop 或者：
1. 访问 https://github.com/Activer007/skills-manager
2. 点击 "Add file" > "Upload files"
3. 上传整个项目

### 步骤 2: 重新构建应用（包含正确的下载地址）

```bash
# 前端构建
npm run build

# Tauri 构建
npm run tauri:build:windows

# Linux 版本
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```


构建产物位置：
- EXE: `src-tauri\target\x86_64-pc-windows-msvc\release\skill-manager.exe`
- MSI: `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\Skill Manager_1.0.0_x64_en-US.msi`

### 步骤 3: 创建 GitHub Release

1. **访问 Releases 页面**
   ```
   https://github.com/Activer007/skills-manager/releases/new
   ```

2. **填写 Release 信息**
   - Tag version: `v1.0.0`
   - Release title: `Skill Manager v1.0.0`
   - Description: 复制 `RELEASE_NOTES.md` 的内容

3. **上传文件** (⭐ 重要顺序)

   **必须先上传** (应用依赖这个)：
   - ✅ `init-data.zip` (从 release-data/ 目录)

   **然后上传**：
   - ✅ `skill-manager.exe`
   - ✅ `Skill Manager_1.0.0_x64_en-US.msi`

4. **发布 Release**
   - 点击 "Publish release"

### 步骤 4: 验证部署

测试下载链接是否正确：
```
https://github.com/Activer007/skills-manager/releases/latest/download/init-data.zip
```

应该能下载到 746 bytes 的 ZIP 文件。

### 步骤 5: 测试应用

1. 下载 `skill-manager.exe`
2. 删除 `C:\Users\用户名\.skills-manager\` 目录（如果存在）
3. 运行 exe
4. 检查是否自动下载并解压 init-data.zip
5. 检查 `C:\Users\用户名\.skills-manager\` 是否有：
   - config.json
   - marketplace.json
   - skills/example-skill/SKILL.md

## 📝 更新 README

将 `README-GITHUB.md` 的内容复制到仓库根目录的 `README.md`：

```bash
# 在 GitHub 网页上编辑
# 或本地：
cp README-GITHUB.md README.md
git add README.md
git commit -m "docs: update README"
git push
```

## 🔄 后续更新

### 更新配置数据

1. 修改 `release-data/` 目录内容
2. 重新打包 ZIP：
   ```powershell
   cd release-data
   powershell -Command "Compress-Archive -Path * -DestinationPath init-data.zip -Force"
   ```
3. 创建新的 Release 并上传新的 init-data.zip

### 更新应用

1. 修改 `src-tauri/Cargo.toml` 中的版本号
2. 重新构建
3. 创建新的 Release

## ⚠️ 注意事项

### init-data.zip 的重要性

- ⭐ **必须先上传 init-data.zip**
- 应用首次启动会从以下地址下载：
  ```
  https://github.com/Activer007/skills-manager/releases/latest/download/init-data.zip
  ```
- 如果这个文件不存在，应用会使用默认配置继续运行

### 下载地址配置

已在 `src-tauri/src/main.rs` 第 13 行配置：
```rust
const INIT_DATA_URL: &str = "https://github.com/Activer007/skills-manager/releases/latest/download/init-data.zip";
```

这个地址指向 **latest release**，所以每次发布新 Release 时：
- 用户会自动获取最新的 init-data.zip
- 无需修改代码

## 📊 文件清单

### 需要上传到 Release 的文件

| 文件 | 位置 | 大小 | 必需 |
|------|------|------|------|
| init-data.zip | release-data/ | ~750B | ⭐ 是 |
| skill-manager.exe | src-tauri/target/.../release/ | ~10MB | 是 |
| Skill Manager_1.0.0_x64_en-US.msi | src-tauri/target/.../bundle/msi/ | ~3.5MB | 否 |

### 已生成的文档

- `RELEASE_NOTES.md` - Release 说明（复制到 GitHub Release 描述）
- `README-GITHUB.md` - GitHub README（替换仓库 README.md）
- `DIRECTORY_STRUCTURE.md` - 目录结构说明
- `REMOTE_INIT.md` - 远程初始化技术文档
- `SECURITY.md` - 安全功能文档
- `PACKAGING.md` - 打包指南

## 🎯 快速部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] 已重新构建应用（包含正确的 GitHub 地址）
- [ ] 创建了 GitHub Release (v1.0.0)
- [ ] ⭐ 已上传 init-data.zip
- [ ] 已上传 skill-manager.exe
- [ ] 已上传 MSI 安装包（可选）
- [ ] 已更新仓库 README.md
- [ ] 已测试下载链接
- [ ] 已测试应用首次启动自动下载

---

**当前状态**: 代码已提交，等待推送到 GitHub 并创建 Release。

**下一步**:
1. 推送代码到 GitHub（使用 GitHub Desktop 或网页上传）
2. 重新构建应用
3. 创建 Release 并上传文件
