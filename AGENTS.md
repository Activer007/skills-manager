# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript app. Core areas include `components/`, `pages/`, `hooks/`, `store/`, `utils/`, `types/`, `i18n/`, and `assets/`.
- Tests live alongside source in `src/**` with `*.test.ts`/`*.test.tsx`, plus shared setup in `src/test/setup.ts`.
- `src-tauri/` holds the Rust backend and Tauri config (see `src-tauri/tauri.conf.json`).
- `public/` contains static assets for Vite, while `docs/`, `scripts/`, and `release-data/` hold supporting docs and release artifacts.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite web dev server (UI-only).
- `npm run tauri dev` runs the full desktop app with Vite + Tauri.
- `npm run build` runs TypeScript build then Vite production build.
- `npm run tauri build` (or `tauri:build:windows` / `tauri:build:mac`) produces desktop bundles.
- `npm run lint` checks code style with ESLint.
- `npm run test`, `test:run`, `test:ui`, `test:coverage` run Vitest in watch, CI, UI, or coverage modes.

## Coding Style & Naming Conventions
- Use TypeScript for new code and follow existing patterns in nearby files.
- Components use PascalCase filenames (e.g., `SkillCard.tsx`); hooks use `use*` naming in `src/hooks/`.
- Tests follow `*.test.ts(x)` naming and are colocated with the module under test.
- ESLint is configured in `eslint.config.js`; there is no Prettier config, so let ESLint and local file style drive formatting.

## Testing Guidelines
- Testing stack: Vitest + React Testing Library + jsdom (`vitest.config.ts`).
- Update or add tests when changing UI behavior, hooks, or utilities.
- Prefer deterministic tests; avoid network calls and filesystem writes in unit tests.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, etc.).
- PRs should include a concise summary, linked issues if available, and screenshots/GIFs for UI changes.
- Note the commands you ran (e.g., `npm run lint`, `npm run test:run`) in the PR description.

## Environment Notes
- Development requires Node.js 20+ and the latest stable Rust for Tauri.
- Desktop build outputs land under `src-tauri/target/release/bundle/`.
