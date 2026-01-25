import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // App
      appName: "Skill Master",

      // Navigation
      dashboard: "Dashboard",
      mySkills: "My Skills",
      marketplace: "Marketplace",
      security: "Security",
      settings: "Settings",

      // Dashboard
      installedSkills: "Installed Skills",
      systemLevel: "System Level",
      projectLevel: "Project Level",
      securityStatus: "Security Status",
      allActiveSkills: "All active skills",
      globallyAvailable: "Globally available",
      currentProjectOnly: "Current project only",
      safe: "Safe",
      noRisksFound: "No risks found",
      skillUsageTrend: "Skill Usage Trend",
      recentActivity: "Recent Activity",

      // My Skills
      scanSkills: "Scan Skills",
      importSkill: "Import Skill",
      totalSkills: "Total Skills",
      searchSkills: "Search skills...",
      name: "Name",
      type: "Type",
      location: "Location",
      description: "Description",
      actions: "Actions",
      view: "View",
      remove: "Remove",
      system: "System",
      project: "Project",

      // Marketplace
      availableSkills: "Available Skills",
      searchMarketplace: "Search marketplace...",
      install: "Install",
      installed: "Installed",
      author: "Author",
      downloads: "Downloads",
      rating: "Rating",

      // Security
      scanAllSkills: "Scan All Skills",
      securityScore: "Security Score",
      riskLevel: "Risk Level",
      issues: "Issues",
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",

      // TrustShield - Security Levels
      trustShield: {
        verified: "Verified",
        safe: "Safe",
        warning: "Warning",
        critical: "Critical",
        unknown: "Unknown",
        // Descriptions
        verifiedDesc: "This skill has passed security verification and is safe to use",
        safeDesc: "This skill has good security and no obvious risks found",
        warningDesc: "This skill has potential security risks, use with caution",
        criticalDesc: "This skill has serious security issues, not recommended for use",
        unknownDesc: "This skill has not been scanned for security",
        // Aria labels
        ariaLabel: "Security level: {{level}}. Score: {{score}}",
        scoreLabel: "Security Score: {{score}}",
      },

      // Settings
      generalSettings: "General Settings",
      defaultInstallLocation: "Default Install Location",
      installToSystem: "Install to System (.claude/skills)",
      installToProject: "Install to Project",
      projectPaths: "Project Paths",
      addProjectPath: "Add Project Path",
      selectDirectory: "Select Directory",
      removeProjectPath: "Remove Project Path",
      language: "Language",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      save: "Save",
      cancel: "Cancel",

      // Import Dialog
      importFromGitHub: "Import from GitHub",
      importFromLocal: "Import from Local",
      githubRepository: "GitHub Repository",
      githubPlaceholder: "username/repository",
      localPath: "Local Path",
      selectFolder: "Select Folder",
      importing: "Importing...",

      // Messages
      importSuccess: "Skill imported successfully",
      importError: "Failed to import skill",
      importPackageSuccess: "Skill package imported successfully!",
      importPackageSuccessWithName: "Skill package imported: {{name}} ({{path}})",
      importPackageHint: "Select an exported .skillpack.zip file",
      importPackageInvalid: "Please select a .skillpack.zip package",
      importPackageInvalidWithName: "Invalid file type: \"{{name}}\". Please select a .skillpack.zip package",
      importPackagePathUnavailable: "File path unavailable. Please use the file dialog or enter the full path.",
      importPackagePreviewTitle: "Package Preview",
      importPackagePreviewName: "Package",
      importPackagePreviewPath: "Path",
      selectFile: "Select File",
      removeSuccess: "Skill removed successfully",
      removeError: "Failed to remove skill",
      saveSuccess: "Settings saved successfully",
      saveError: "Failed to save settings",
      scanComplete: "Scan complete",

      // Common
      loading: "Loading...",
      noData: "No data available",
      confirm: "Confirm",
      error: "Error",
      success: "Success",
      warning: "Warning",

      // Repositories
      repositories: {
        title: "Repositories",
        subtitle: "Manage external skill repositories (Total: {{count}})",
        add: "Add Repository",
        myRepositories: "My Repositories",
        featured: {
          title: "Featured Repositories",
          refresh: "Refresh List"
        },
        featuredBadge: "Featured",
        addedAt: "Added",
        lastScanned: "Scanned",
        neverScanned: "Never scanned",
        scan: "Scan",
        delete: "Delete",
        addFirst: "Add your first repository",
        empty: "No repositories found. Add one to discover skills.",
        deleteConfirm: "Are you sure you want to delete {{name}}?",
        added: "Added",

        addDialog: {
          title: "Add Repository",
          url: "Repository URL",
          urlHelp: "Support GitHub URL (e.g. https://github.com/owner/repo)",
          name: "Name (Optional)",
          namePlaceholder: "My Skills Repo",
          scanSubdirs: "Scan subdirectories (Depth 1)",
          scanSubdirsHelp: "Enable this if skills are located in subfolders"
        },

        toast: {
          added: "Repository added successfully",
          error: "Failed to add repository",
          deleted: "Repository deleted",
          deleteError: "Failed to delete repository",
          foundSkills: "Scan complete. Skills updated.",
          scanError: "Scan failed",
          enabled: "Repository enabled",
          disabled: "Repository disabled"
        }
      },

      // Share - Embed Card
      share: {
        embedCard: {
          title: "Embed Card Generator",
          generationError: "Failed to generate embed card",
          format: "Format",
          theme: "Theme",
          themeLight: "Light",
          themeDark: "Dark",
          themeAuto: "Auto",
          size: "Size",
          sizeCompact: "Compact",
          sizeNormal: "Normal",
          sizeFull: "Full Width",
          displayOptions: "Display Options",
          showAuthor: "Show Author",
          showVersion: "Show Version",
          showSecurity: "Show Security Level",
          showRating: "Show Rating",
          showInstallButton: "Show Install Button",
          preview: "Preview",
          code: "Code",
          copy: "Copy",
          copied: "Copied!",
          copyCode: "Copy Code",
          formatInfo: "Generated {{format}} embed code"
        }
      }
    }
  },
  zh: {
    translation: {
      // 应用
      appName: "Skill Master",

      // 导航
      dashboard: "仪表盘",
      mySkills: "我的 Skills",
      marketplace: "市场",
      security: "安全",
      settings: "设置",

      // 仪表盘
      installedSkills: "已安装 Skills",
      systemLevel: "系统级",
      projectLevel: "项目级",
      securityStatus: "安全状态",
      allActiveSkills: "所有已激活的技能",
      globallyAvailable: "全局可用",
      currentProjectOnly: "当前项目专用",
      safe: "安全",
      noRisksFound: "未发现风险",
      skillUsageTrend: "Skill 调用趋势",
      recentActivity: "最近活动",

      // 我的 Skills
      scanSkills: "扫描 Skills",
      importSkill: "导入 Skill",
      totalSkills: "总计 Skills",
      searchSkills: "搜索 skills...",
      name: "名称",
      type: "类型",
      location: "位置",
      description: "描述",
      actions: "操作",
      view: "查看",
      remove: "移除",
      system: "系统",
      project: "项目",

      // 市场
      availableSkills: "可用 Skills",
      searchMarketplace: "搜索市场...",
      install: "安装",
      installed: "已安装",
      author: "作者",
      downloads: "下载量",
      rating: "评分",

      // 安全
      scanAllSkills: "扫描所有 Skills",
      securityScore: "安全评分",
      riskLevel: "风险等级",
      issues: "问题",
      low: "低",
      medium: "中",
      high: "高",
      critical: "严重",

      // TrustShield - 安全等级
      trustShield: {
        verified: "已验证",
        safe: "安全",
        warning: "警告",
        critical: "危险",
        unknown: "未知",
        // 描述
        verifiedDesc: "此 Skill 已通过安全验证，可以安全使用",
        safeDesc: "此 Skill 安全性良好，未发现明显风险",
        warningDesc: "此 Skill 存在潜在安全风险，请谨慎使用",
        criticalDesc: "此 Skill 存在严重安全问题，不建议使用",
        unknownDesc: "此 Skill 尚未进行安全扫描",
        // Aria 标签
        ariaLabel: "安全等级：{{level}}。评分：{{score}}",
        scoreLabel: "安全评分：{{score}}",
      },

      // 设置
      generalSettings: "通用设置",
      defaultInstallLocation: "默认安装位置",
      installToSystem: "安装到系统 (.claude/skills)",
      installToProject: "安装到项目",
      projectPaths: "项目路径",
      addProjectPath: "添加项目路径",
      selectDirectory: "选择目录",
      removeProjectPath: "移除项目路径",
      language: "语言",
      theme: "主题",
      light: "浅色",
      dark: "深色",
      save: "保存",
      cancel: "取消",

      // 导入对话框
      importFromGitHub: "从 GitHub 导入",
      importFromLocal: "从本地导入",
      githubRepository: "GitHub 仓库",
      githubPlaceholder: "用户名/仓库名",
      localPath: "本地路径",
      selectFolder: "选择文件夹",
      importing: "导入中...",

      // 消息
      importSuccess: "Skill 导入成功",
      importError: "导入 Skill 失败",
      importPackageSuccess: "成功导入 Skill 包！",
      importPackageSuccessWithName: "成功导入 Skill 包：{{name}}（{{path}}）",
      importPackageHint: "请选择导出的 .skillpack.zip 文件",
      importPackageInvalid: "请选择 .skillpack.zip 格式的包",
      importPackageInvalidWithName: "文件类型无效：\"{{name}}\"。请选择 .skillpack.zip 格式的包",
      importPackagePathUnavailable: "无法读取文件路径，请使用文件选择器或手动输入完整路径",
      importPackagePreviewTitle: "包信息预览",
      importPackagePreviewName: "包名",
      importPackagePreviewPath: "路径",
      selectFile: "选择文件",
      removeSuccess: "Skill 移除成功",
      removeError: "移除 Skill 失败",
      saveSuccess: "设置保存成功",
      saveError: "保存设置失败",
      scanComplete: "扫描完成",

      // 通用
      loading: "加载中...",
      noData: "暂无数据",
      confirm: "确认",
      error: "错误",
      success: "成功",
      warning: "警告",

      // 仓库管理
      repositories: {
        title: "仓库管理",
        subtitle: "管理外部 Skill 仓库 (共 {{count}} 个)",
        add: "添加仓库",
        myRepositories: "我的仓库",
        featured: {
          title: "精选仓库",
          refresh: "刷新列表"
        },
        featuredBadge: "精选",
        addedAt: "添加于",
        lastScanned: "上次扫描",
        neverScanned: "从未扫描",
        scan: "扫描",
        delete: "删除",
        addFirst: "添加第一个仓库",
        empty: "暂无仓库，添加仓库以发现更多 Skills",
        deleteConfirm: "确定要删除 {{name}} 吗？",
        added: "已添加",

        addDialog: {
          title: "添加仓库",
          url: "仓库地址",
          urlHelp: "支持 GitHub 链接 (如 https://github.com/owner/repo)",
          name: "名称 (可选)",
          namePlaceholder: "我的 Skills 仓库",
          scanSubdirs: "扫描子目录 (深度 1)",
          scanSubdirsHelp: "如果 Skills 位于子文件夹中，请启用此选项"
        },

        toast: {
          added: "仓库添加成功",
          error: "添加仓库失败",
          deleted: "仓库已删除",
          deleteError: "删除仓库失败",
          foundSkills: "扫描完成，Skills 已更新",
          scanError: "扫描失败",
          enabled: "仓库已启用",
          disabled: "仓库已禁用"
        }
      },

      // 分享 - 嵌入卡片
      share: {
        embedCard: {
          title: "嵌入卡片生成器",
          generationError: "生成嵌入卡片失败",
          format: "格式",
          theme: "主题",
          themeLight: "浅色",
          themeDark: "深色",
          themeAuto: "自动",
          size: "尺寸",
          sizeCompact: "紧凑",
          sizeNormal: "标准",
          sizeFull: "全宽",
          displayOptions: "显示选项",
          showAuthor: "显示作者",
          showVersion: "显示版本",
          showSecurity: "显示安全等级",
          showRating: "显示评分",
          showInstallButton: "显示安装按钮",
          preview: "预览",
          code: "代码",
          copy: "复制",
          copied: "已复制！",
          copyCode: "复制代码",
          formatInfo: "已生成 {{format}} 格式的嵌入代码"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
