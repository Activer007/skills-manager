# UI/UX Upgrade Plan: Hybrid Ecosystem

**Objective:** Modernize the **Skill Manager** application by adopting the polished, minimal aesthetic of *Antigravity-Manager*, while combining the visual discovery of the *Apple App Store* with the management efficiency of *VS Code Extensions*.

## 1. Design System Foundation (Antigravity Core)

We will adopt the "Gravity" design language found in the Antigravity-Manager project to ensure a professional, consistent look.

### 1.1 Visual Tokens
*   **Color Palette:**
    *   **Light Mode:**
        *   Background: `#FAFBFC` (App bg), `#FFFFFF` (Card bg)
        *   Primary: `#3b82f6` (Blue-500)
        *   Text: Slate-900 (Primary), Slate-500 (Secondary)
    *   **Dark Mode:**
        *   Background: `#0f172a` (Slate-900)
        *   Surface: `#1e293b` (Slate-800)
        *   Border: `border-slate-700`
*   **Typography:** System UI fonts, clean hierarchy. Bold headings, legible body text.
*   **Effects:** Subtle shadows (`shadow-sm`, `shadow-md`), rounded corners (`rounded-xl` for cards, `rounded-lg` for inner elements).

### 1.2 Layout Structure
*   **Window Frame:** Custom frameless window with a top drag region (36px transparent header).
*   **Navigation:** Left sidebar (Icon + Label) with active state indicators (accent color background/text).
*   **Main Area:** Scrollable content area with padding (`p-6`).

---

## 2. Component Architecture

### 2.1 The "Skill Card" (The Core Unit)
A versatile component that supports two display modes.

#### Mode A: Grid Card (Marketplace)
*   *Inspiration:* App Store "Today" / Apps tabs.
*   **Layout:** Vertical stacking.
*   **Elements:**
    *   Large Icon (64x64px) or Cover Image at the top.
    *   Title (Bold, truncate 2 lines).
    *   Author / Category (Small, Grey).
    *   **Action Area:** A prominent "Get" or "Install" button at the bottom.
    *   **Badges:** MCP Capabilities (Tools, Resources), Security Rating.
*   **Interaction:** Hover lifts the card slightly (`transform: translateY(-2px)`).

#### Mode B: List Row (My Skills)
*   *Inspiration:* VS Code Extension List.
*   **Layout:** Horizontal Flex.
*   **Elements:**
    *   Left: Icon (40x40px).
    *   Middle: Title + Description (1 line) + Version Badge + Security Shield.
    *   Right: Toggle Switch (Enable/Disable) + Context Menu (...) + Manage Button.

### 2.2 Smart Install Button
A stateful button component handling the entire lifecycle.
*   **States:**
    1.  **Idle (Not Installed):** "Get" (Primary Color, Pill shape).
    2.  **Loading:** Spinner / Progress Ring inside the button.
    3.  **Installed:** "Open" or "Config" (Secondary/Outline style).
    4.  **Update Available:** "Update" (Green text or Badge).

### 2.3 Context Drawer (Slide-over)
Instead of navigating away, skill details open in a right-side drawer (Sheet).
*   **Header:** Icon + Title + Big Action Button + Trust Badge.
*   **Tabs:** 
    *   `Overview` (README + Visual Previews).
    *   `Configuration` (Schema-based UI).
    *   `Capabilities` (MCP Tools/Resources list).
    *   `Changelog`.
*   **Content:** Markdown renderer for README, Auto-generated form for Config.

---

## 3. Page-Specific UX Upgrades

### 3.1 Marketplace (The "Store" Experience)
*   **Hero Section:** A featured banner area at the top for "Trending Skills" or "Editor's Choice".
*   **Search & Filter:**
    *   Unified Search Bar (Spotlight style).
    *   **Filter Chips:** [All] [Productivity] [Coding] [Security] [Agentic] - Horizontal scrollable list.
*   **Grid Layout:** Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).

### 3.2 My Skills (The "Manager" Experience)
*   **Layout:** Vertical list view for higher information density.
*   **Quick Actions:**
    *   Enable/Disable toggle directly on the list item using the **Switch** component.
    *   Bulk actions (Select multiple -> Update All / Delete).
*   **Sorting:** Sort by Name, Install Date, Last Updated, Security Score.

### 3.3 Skill Configuration (Settings)
*   **Problem:** Editing raw JSON is error-prone.
*   **Solution:** **Schema-based UI Generator**.
    *   Boolean -> Toggle Switch.
    *   String/Number -> Input Field.
    *   Enum -> Dropdown Select.
    *   *Fallback:* "Edit JSON" button for advanced users.

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Design System) [DONE]
- [x] **Tailwind Config:** Port `tailwind.config.js` themes from Antigravity.
- [x] **Utility:** Create `src/utils/cn.ts` (`clsx` + `tailwind-merge`).
- [x] **Layout:** Refactor `MainLayout` to match Antigravity's Sidebar + DragRegion structure.
- [x] **Global Styles:** Update `index.css` for base font and background colors.

### Phase 2: Core Components [DONE]
- [x] **Button Kit:** Create `Button`, `Badge`.
- [x] **Card Kit:** Create `Card` container with hover effects.
- [x] **SkillCard:** Implement the Grid/List hybrid component.
- [x] **Drawer:** Implement a `SlideOver` component to replace Modals for Skill Details.
- [x] **Toggle Switch:** Create a dedicated `Switch` component (iOS style).

### Phase 3: Marketplace Overhaul [DONE]
- [x] **Marketplace Page:** Replace current list with Grid Layout.
- [x] **Filter Logic:** Implement client-side filtering with Chip UI.
- [x] **Hero Banner:** Add a visual header for the marketplace.

### Phase 4: My Skills & Interactions [DONE]
> **Goal:** Integrate Phase 2 components into the actual pages and finalize interactions.

- [x] **My Skills Page:** Convert to List Layout.
- [x] **Interaction Integration (Fix the Gap):**
    *   [x] **SlideOver Integration:** Replace `ViewModal` (old `<div>` modal) with the new `SlideOver` component in `MySkills` and `Marketplace`.
    *   [x] **Switch Integration:** Replace `Play/Pause` buttons with the new `Switch` component in `SkillCard` (List Mode).
- [x] **Animations:** Add `framer-motion` for basic page transitions.
- [x] **Settings Form (Schema UI):** Build the dynamic form generator for Skill Config.
    *   [x] **Schema Parser:** Logic to infer types from JSON or read schema from `SKILL.md`.
    *   [x] **ConfigForm Component:** Map types to `Switch`, `Input`, `Select`.

### Phase 5: Intelligence & Visualization (2026 Trends) [IN PROGRESS]
> **Goal:** Adapt to Agentic/MCP trends and enhance trust visualization.

- [x] **Skill Insights Dashboard:**
    *   Visual representation of installed skills (Categories, Security Scores).
    *   Charts using `Recharts`.
- [ ] **MCP Integration:**
    *   **Capability Badges:** Display "Tools", "Resources", "Prompts" counts on cards.
    *   **Dependency Check:** Visual warnings for missing MCP servers (e.g., SQLite).
- [ ] **Visual Discovery:**
    *   [x] **Preview Support:** Render preview images/videos in SlideOver if available.
    *   **Hero Animation:** Make the Marketplace Hero section dynamic.
- [ ] **Trust & Security System:**
    *   [x] **Security Shield:** Visual indicator of security scan results (Green/Yellow/Red).
    *   **Capability Manifest:** Explicitly list what the skill can do (e.g., "Can Read Files", "Can Execute Commands").
