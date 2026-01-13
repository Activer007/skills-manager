# Skill Manager Client

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

一个用于管理 Claude Code 技能的桌面应用程序

[下载](https://github.com/Activer007/skills-manager/releases) • [文档](#-使用) • [构建](#-构建)

</div>

## 🎯 简介

Skill Manager 是一个为 Claude Code 设计的技能管理工具，采用纯 Rust 架构，提供零依赖的桌面应用体验。

### 核心特性
- 🚀 **零依赖**: 纯 Rust 实现，单文件可执行，无需 Node.js
- 🔒 **安全第一**: 内置安全扫描引擎，9 大类安全规则
- 📦 **一键导入**: 从 GitHub 或本地快速导入技能
- 🌐 **远程配置**: 首次启动自动从云端下载配置和预装技能

## 📥 下载

访问 [Releases](https://github.com/Activer007/skills-manager/releases/latest) 下载最新版本。

### Windows (x64)
- `skill-manager.exe` - 绿色版单文件 (~10MB)
- `Skill Manager_1.0.0_x64_en-US.msi` - 安装包 (~3.5MB)

## 🚀 快速开始

1. 下载 `skill-manager.exe`
2. 双击运行（首次启动需要网络连接）
3. 应用会自动下载配置到 `C:\Users\你的用户名\.skills-manager\`

## 📂 目录结构

```
C:\Users\你的用户名\.skills-manager\
├── config.json              # 应用配置
├── marketplace.json         # 市场数据
└── skills\                  # 已安装的技能
    ├── example-skill\
    └── ...
```

## 🛠️ 本地构建

```bash
# 克隆仓库
git clone https://github.com/Activer007/skills-manager.git
cd skills-manager-client

# 安装依赖
npm install

# 构建
npm run build
npm run tauri:build:windows
```

## 📦 自定义初始化数据

修改 `release-data/` 目录后重新打包：

```bash
cd release-data
powershell -Command "Compress-Archive -Path * -DestinationPath init-data.zip -Force"
```

在 GitHub Release 中上传新的 `init-data.zip`。

## 📄 许可证

MIT License

---

<div align="center">
Made with ❤️ for Claude Code Community
</div>
