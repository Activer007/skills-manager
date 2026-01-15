# Skill Manager

## Project Overview
Skill Manager is a desktop application designed to manage Claude Code Skills, built with a modern tech stack combining a Rust-based backend (Tauri v2) and a React 19 frontend. It allows users to browse, install, import, and security-scan skills for their development environment.

### Key Features
*   **My Skills:** Manage installed system-level and project-level skills.
*   **Skill Marketplace:** Browse and install open-source skills.
*   **Import:** Import skills from GitHub or local folders.
*   **Security Scanning:** Automated security checks for skills (60+ rules) to detect dangerous patterns.
*   **Scoring System:** Evaluates skills based on content quality, technical implementation, maintainability, and UX.

## Tech Stack
*   **Frontend:** React 19, TypeScript, Vite 7
*   **UI/Styling:** Tailwind CSS 3.4, DaisyUI 5.5, Lucide React (Icons), Recharts (Charts)
*   **State Management:** Zustand 5.0 (with persistence), TanStack Query
*   **Routing:** React Router v7
*   **Desktop/Backend:** Tauri v2 (Rust)

## Building and Running

### Prerequisites
*   Node.js 20+
*   Rust (Latest Stable)
*   npm

### Development
1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run in Development Mode:**
    ```bash
    npm run tauri dev
    ```
    This starts both the Vite frontend server and the Tauri application window.

3.  **Frontend Only:**
    ```bash
    npm run dev       # Start Vite server
    npm run lint      # Run ESLint
    ```

4.  **Backend (Rust) Only:**
    ```bash
    cd src-tauri
    cargo check       # Check code
    cargo test        # Run tests
    cargo clippy      # Run linter
    ```

### Production Build
To build the application for production:
```bash
npm run tauri build
```
*   **Windows:** `npm run tauri:build:windows`
*   **macOS:** `npm run tauri:build:mac`

Artifacts will be located in `src-tauri/target/release/bundle/`.

## Directory Structure
*   `src/`: Frontend React source code.
    *   `components/`: Reusable UI components.
    *   `pages/`: Application views (Dashboard, Marketplace, Settings, etc.).
    *   `hooks/`: Custom React hooks (e.g., `useSkills.ts`).
    *   `store/`: Zustand state stores.
    *   `types/`: TypeScript definitions (`index.ts`, `scorer.ts`).
*   `src-tauri/`: Tauri backend source code.
    *   `src/lib.rs`: Entry point.
    *   `src/commands/`: Tauri commands invoked by the frontend.
    *   `src/analyzer/`: Skill scoring logic (Rust implementation).
*   `docs/`: Project documentation and planning.

## Development Conventions

### Coding Style
*   **TypeScript:** Strict mode enabled. Follow ESLint rules defined in `eslint.config.js`.
*   **Rust:** Follow standard Rust conventions. Use `cargo clippy` to ensure code quality.

### Skill Format
Skills must contain a `SKILL.md` file with YAML frontmatter:
```markdown
---
name: skill-name
description: Brief description
author: Author Name
version: 1.0.0
---

# Skill Instructions
...
```

### Skill Locations
*   **System:** `~/.claude/skills` (macOS/Linux) or `%USERPROFILE%\.claude\skills` (Windows).
*   **Project:** `[Project Root]/.claude/skills` (configured via Settings).
