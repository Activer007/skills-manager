# 🛠️ Phase 4: Engineering Excellence Plan

**Current Status**: Functionally complete, high technical debt.
**Core Objective**: Repay debt, ensure stability, and harden security.

---

## 🎯 Strategic Goals
1.  **Reliability**: Reach >60% test coverage to prevent regression.
2.  **Safety**: Eliminate `any` types and add strict input validation.
3.  **Performance**: Optimize frontend rendering and search responsiveness.

---

## 📝 Detailed Task List

### P4-1: Testing Infrastructure
- [ ] **Task 1.1: Configure Vitest & React Testing Library**
    - Setup frontend test runner.
    - Write unit tests for `useSkillStore`.
- [ ] **Task 1.2: Integration Tests**
    - Mock Tauri API calls to test full feature flows (Scan -> Install -> Score).
- [ ] **Task 1.3: End-to-End (E2E) Tests**
    - Implement Playwright tests for critical paths (Marketplace install, local import).

### P4-2: Type Safety & Code Quality
- [ ] **Task 2.1: Remove `any` from Store**
    - Define TypeScript interfaces for all Tauri command responses.
    - Refactor `src/store/useSkillStore.ts` to be fully typed.
- [ ] **Task 2.2: Input Validation (Zod)**
    - Add validation layer for GitHub URLs and local paths.
    - Prevent path traversal and malicious URL injection.

### P4-3: Performance & Security Hardening
- [ ] **Task 3.1: Frontend Optimization**
    - Implement `useDebounce` for Marketplace search.
    - Use `React.memo` and virtualization for long lists.
- [ ] **Task 3.2: Security Policy (CSP)**
    - Implement Content Security Policy in `index.html`.
    - Audit all third-party script/asset calls.

---

## 📅 Timeline (Estimated 3 Weeks)
- **Week 1**: Testing setup and core logic tests.
- **Week 2**: Type safety overhaul and input validation.
- **Week 3**: Performance tuning, CSP, and finalizing QA.

---

## 📊 Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Test Coverage | 60%+ | ~0% |
| `any` usage | 0 instances | >10 instances |
| Lighthouse Score | >90 | Unknown |
| Critical Bugs | 0 | 0 |
