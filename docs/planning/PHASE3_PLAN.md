# 🚀 Phase 3: Intelligent Upgrade Plan (AI Integration)

**Current Status**: Phase 2 Complete. Rust Scorer ready as Fact Extractor.
**Core Objective**: Transition from "Static Rule Checking" to "AI Semantic Review".

---

## 🎯 Strategic Goals
1.  **Deep Understanding**: Audit skill logic and prompt quality beyond simple regex.
2.  **Actionable Advice**: Provide reasoning-based improvement suggestions.
3.  **Autonomous Evolution**: Set the foundation for "Skills Master" to auto-fix/optimize skills.

---

## 🏗️ Technical Architecture: Triple-Layer Pipeline

### Layer 1: Rust-based Fact Extractor (DONE)
- **Role**: Collect objective technical metrics (files, LOC, dependencies, patterns).
- **Status**: 100% Complete (`src-tauri/src/analyzer/`).

### Layer 2: Multi-Agent Expert Audit (PENDING)
- **Role**: Process facts through specialized AI personas.
- **Agents**:
    - **Architect Agent**: Audits code patterns, error handling, and robustness.
    - **Product Agent**: Audits README clarity, UX flow, and prompt instruction quality.
    - **Security Agent**: Semantic vulnerability detection (logic flaws).

### Layer 3: Chief Judge & Reasoning (PENDING)
- **Role**: Synthesize expert reports, calculate final weighted scores, and generate improvement blueprints.

---

## 📝 Detailed Task List

### P3-1: Multi-Agent Expert Audit Integration
- [ ] **Task 1.1: Protocol Definition**
    - Define `TechnicalFactSheet` JSON schema to bridge Rust Scorer output and LLM input.
- [ ] **Task 1.2: Agent Persona Engineering**
    - Create system prompts for Architect, Product, and Security agents.
    - Implement "Anchor-based Scoring" (Few-shot samples).
- [ ] **Task 1.3: Backend Orchestrator (Rust/Tauri)**
    - Implement the AI call sequence.
    - Handle token usage optimization and parallel agent execution.
- [ ] **Task 1.4: Frontend Review UI**
    - Create a detailed "Review Report" view.
    - Show reasoning chains and diff suggestions.

### P3-2: Skills Master Evolution Engine
- [ ] **Task 2.1: Evaluation-Fix Loop**
    - Implement "Auto-Fix" button based on AI suggestions.
- [ ] **Task 2.2: Prompt Optimization**
    - Use AI to rewrite instructions for better LLM performance (CoT, Few-shot auto-injection).

---

## 📅 Timeline (Estimated 3-4 Weeks)
- **Week 1**: Fact-to-LLM bridge & Architect Agent.
- **Week 2**: Full Multi-Agent suite & Synthesis logic.
- **Week 3**: Frontend UI for reports & "Auto-Fix" prototype.
- **Week 4**: Testing, prompt tuning, and stability hardening.

---

## 🔗 Dependencies
- ✅ **Rust Scorer**: Pre-requisite met.
- ⚠️ **LLM Access**: Requires OpenAI/Claude API configuration in Tauri backend.
