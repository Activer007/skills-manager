# Skill Manager

[中文文档](./README.md)

A desktop application for managing Claude Code Skills, supporting browsing, installation, import, and security scanning of both system-level and project-level Skills.

## Quick Start

Download the latest version from [Releases](https://github.com/Activer007/skills-manager/releases).

For smarter skill discovery, try this CLI tool: https://github.com/buzhangsan/skill-manager

Report issues on [GitHub Issues](https://github.com/Activer007/skills-manager/issues).

## Features

### 1. **My Skills**
- Automatically scan installed Skills at system and project levels
- View detailed Skill information
- One-click uninstall for unwanted Skills

![My Skills](mySkill.png)

### 2. **Skill Marketplace**
- Browse 53,000+ open-source Skills
- Search and filter functionality
- One-click install to local

![Marketplace](marketplace.png)

### 3. **Skill Import**
Four import methods supported:
- **GitHub Import**: Enter a GitHub repository URL to automatically clone locally
- **Local Folder**: Import existing Skills from a local folder
- **Package Import**: Import Skills from `.zip` package files (supports offline sharing)
- **Share Image Import**: Scan QR codes in share cards for quick Skill import

### 4. **Skill Sharing** 🎉
- ✅ **Text Sharing**: One-click share text generation for multiple platforms (Twitter, Weibo, Mastodon, etc.)
- ✅ **Image Sharing**: Generate beautiful share cards (with QR code, quality score, security level)
- ✅ **Multiple Themes**: Default, minimal, and dark share card themes
- ✅ **Import from Image**: Scan share card QR codes for quick Skill import
- ✅ **Skill Package Export/Import**: Package Skills as `.zip` files for easy offline sharing and backup
- ✅ **Modification Detection**: Intelligently detect locally modified Skills and remind users to update shares

### 5. **Security Scanning** 🛡️
- ✅ **Automatic Security Scanning**: Automatically scan 80+ security rules before installation
- ✅ **Hard Trigger Mechanism**: Automatically block installation when dangerous code is detected (e.g., `rm -rf /`, `eval()`, `curl | sh`, `pickle.load`)
- ✅ **Security Scoring**: 0-100 scoring system to visually display Skill security
- ✅ **Detailed Reports**: Provide security issue details, fix suggestions, and file locations
- ✅ **Manual Scanning**: Scan installed Skills at any time
- ✅ **Three Scanning Modes**:
  - **Strict Mode**: Report all matched rules, including low-confidence rules
  - **Standard Mode**: Default mode, skip low-confidence rules to reduce false positives
  - **Relaxed Mode**: Only report high-confidence rules with minimal false positives
- ✅ **Whitelist Management**:
  - **Skill Whitelist**: Trusted Skills skip scanning
  - **Rule Whitelist**: Ignore false positives from specific rules
  - Support for adding whitelist reason descriptions
- ✅ **Smart Caching**:
  - SHA-256 checksum detection for file changes
  - Unchanged Skills return cached results directly
  - Cache auto-invalidates on configuration changes (scan mode/whitelist)
  - Support for force re-scan
- ✅ **Scan History**: View historical scan records and track security status changes

**Dangerous Patterns Detected Include**:
- Destructive file system operations (deletion, overwriting)
- Remote code execution (reverse shell, curl pipe)
- Command injection (eval, exec, dynamic code execution)
- Network data exfiltration (sensitive information transmission)
- Privilege escalation (sudo, chmod 777)
- Sensitive file access (/etc/passwd, key files)
- Persistence mechanisms (startup items, scheduled tasks)
- Credential leakage (API Key, private keys, passwords)
- Symbolic links (prevent boundary violations)

**Multi-language Security Detection Support**:
- **JavaScript/TypeScript**: `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `Function` constructor, `localStorage` sensitive data, `document.write`
- **Rust**: `unsafe` blocks, raw pointers, `transmute`, FFI calls, Tauri `Command::new`
- **Go**: `unsafe` package, CGo usage
- **Python**: `pickle.load` (hard trigger), `yaml.load`, `compile()`, `exec()`
- **Shell**: Word splitting injection, wildcard injection, command substitution injection

**Rule Confidence Levels**:
- 🔴 **High Confidence**: Definite security issues
- 🟡 **Medium Confidence**: Potential security risks
- 🟢 **Low Confidence**: Patterns that may have false positives

*Tip: Choose appropriate confidence threshold via scanning mode*

**Scanning Performance Optimization**:
- Maximum scan depth: 20 levels
- Maximum files scanned: 2000
- Single file size limit: 2MB
- Auto-skip large dependency directories (`node_modules`, `target`, `.git`, `dist`, `build`, etc.)

### 6. **Skill Quality Scoring** ⭐
- ✅ **100-Point Scoring System**: Content quality (50 points), technical implementation (30 points), maintainability (10 points), user experience (10 points)
- ✅ **Grade Rating**: S (90-100), A (80-89), B (70-79), C (60-69), D (0-59)
- ✅ **Four-Dimensional Radar Chart**: Visualize Skill scores across four dimensions
- ✅ **Improvement Suggestions**: Provide specific optimization recommendations and best practices
- ✅ **Batch Scoring**: Support batch analysis of multiple Skills with smart caching for performance
- ✅ **Rust Scoring Engine**: High-performance static analysis supporting Markdown and code quality detection

### 7. **Security Center** 🔒
- ✅ **Centralized Monitoring**: Unified view of security status for all Skills
- ✅ **Security Level Classification**: Safe, Risk, Blocked
- ✅ **One-Click Scanning**: Manually trigger security scans for individual or all Skills
- ✅ **Quick Filtering**: Filter Skills by security level
- ✅ **Detailed Reports**: View complete security scan reports for each Skill

### 8. **Scan History** 📊
- ✅ **History Records**: SQLite database storage for all scan records
- ✅ **Search Function**: Search history records by Skill name
- ✅ **Filter Function**: Filter by security level (All/Safe/Risk/Blocked)
- ✅ **Export Function**: Support export to JSON/CSV formats
- ✅ **Data Visualization**: Recharts line charts showing historical trends
- ✅ **Auto Refresh**: Auto-refresh data every minute

### 9. **Project Path Configuration**
- Customize multiple project paths
- Automatically scan `.claude/skills` folders under projects
- Cross-platform support (Windows, macOS)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **UI Library**: Tailwind CSS 3.4, DaisyUI 5.5
- **State Management**: TanStack Query 5.90 (server state)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Charts**: Recharts
- **Desktop**: Tauri v2 (Rust backend)
- **Database**: SQLite (scan history)

## Development

### Prerequisites
- Node.js 20+
- Rust (latest stable)
- npm

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run tauri dev
```

This will start both the Vite dev server and the Tauri application.

### 3. Build for Production

```bash
npm run tauri build
```

Build artifacts will be in `src-tauri/target/release/bundle/`.

## Skill Directory Structure

### System-Level Skills
- **Windows**: `C:\Users\[username]\.claude\skills`
- **macOS/Linux**: `~/.claude/skills`

### Project-Level Skills
Configure project root directories in Settings, and the system will automatically scan:
```
[Project Root]/.claude/skills/
```

### Skill Format Requirements
Each Skill folder must contain a `SKILL.md` file in the following format:

```markdown
---
name: skill-name
description: Skill description
author: Your Name
version: 1.0.0
---

# Skill Instructions

Your skill content here...
```

## Downloads

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Skill.Manager_x.x.x_arm64.dmg` |
| macOS (Intel) | `Skill.Manager_x.x.x_x64.dmg` |
| Windows (Installer) | `Skill.Manager_x.x.x_x64-setup.exe` |
| Windows (MSI) | `Skill.Manager_x.x.x_x64_en-US.msi` |

## Contributing

Issues and Pull Requests are welcome!

## License

MIT License
