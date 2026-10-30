# Antigravity Customizations & Skills — Pocket Wallet

This directory (`.antigravity/`) configures project-level agent behaviors, permissions, and specialized **Skills** for pair programming on **Pocket Wallet** — an offline-first personal finance and budget manager built with React Native and Expo.

---

## Directory Overview

```text
.antigravity/
├── README.md               # Documentation and reference guide (this file)
├── settings.json           # Antigravity agent configuration, permissions & skill registry
├── devices.json            # Device pairing records for development testing
└── skills/                 # Custom skill packages
    ├── design-motion-principles/
    │   └── SKILL.md        # Motion & interaction design (Create & Audit modes)
    ├── frontend-design/
    │   └── SKILL.md        # Distinctive, production-grade UI design
    ├── security-audit/
    │   ├── SKILL.md        # Defensive vulnerability review & audit workflows
    │   ├── AI-AND-LLM.md
    │   ├── ATTACK-CLASSES.md
    │   ├── CLIENT-SIDE.md
    │   ├── CLOUD-AND-DEPLOYMENT.md
    │   ├── DATA-ISOLATION-AND-LIFECYCLE.md
    │   ├── DESKTOP-MOBILE-AND-LOCAL-IPC.md
    │   ├── HUNTING.md
    │   ├── MEMORY-SAFETY-AND-BINARY.md
    │   ├── PROTOCOLS-RPC-AND-MESSAGING.md
    │   ├── RECONNAISSANCE.md
    │   ├── RESOURCE-EXHAUSTION-AND-AVAILABILITY.md
    │   ├── SUPPLY-CHAIN-AND-RELEASE.md
    │   ├── VALIDATION-AND-REPORTING.md
    │   ├── WEB-PROTOCOL-AND-AUTH.md
    │   ├── report-schema.json
    │   ├── validate-coverage-ledger.cjs
    │   ├── validate-coverage-ledger.test.cjs
    │   ├── validate-findings.cjs
    │   └── validate-findings.test.cjs
    ├── tailwind-design-system/
    │   └── SKILL.md        # Tailwind v4 tokens & component system patterns
    └── user-research/
        └── SKILL.md        # User research, interview guides & usability testing
```

---

## Active Skills Catalog

Antigravity uses **Progressive Disclosure** for skills: only the `name` and `description` are loaded into the agent's context by default. The complete instruction set is loaded on-demand when triggered by your prompt.

### 1. `security-audit`
* **Path**: `skills/security-audit/SKILL.md`
* **Purpose**: Defensive, source-first vulnerability research and security guidance for codebases, APIs, mobile data storage, IPC, and dependencies.
* **Operating Modes**:
  * **Guidance Mode** (default): Answers security questions, provides triage, inspects trust boundaries, and conducts focused reviews without creating audit artifacts.
  * **Full Audit Mode**: Triggered only upon explicit request (e.g. "conduct a full security audit of Pocket Wallet"). Executes a comprehensive 6-phase audit and generates validated markdown/JSON findings using `validate-findings.cjs`.
* **Mobile & Pocket Wallet Focus**:
  * Local data storage security (`AsyncStorage`, SQLite encryption, keychain/keystore).
  * Secure export/backup handling (JSON, CSV data isolation).
  * Client-side trust boundaries (`CLIENT-SIDE.md`, `DESKTOP-MOBILE-AND-LOCAL-IPC.md`).
* **Trigger Phrases**:
  > *"Review the security of our backup export functionality"*  
  > *"Run a security audit on client-side storage"*  
  > *"Check trust boundaries in transaction entry"*

---

### 2. `design-motion-principles`
* **Path**: `skills/design-motion-principles/SKILL.md`
* **Purpose**: Interaction and motion design engineering based on the combined techniques of **Emil Kowalski** (restraint, speed, productivity), **Jakub Krehel** (subtle polish, production transitions), and **Jhey Tompkins** (delightful experimentation).
* **Operating Modes**:
  * **Create Mode**: Crafts purposeful micro-interactions, spring animations, enter/exit transitions, and gesture feedback.
  * **Audit Mode**: Evaluates existing animations against "AI slop" motion anti-patterns, checking timing curves, spring overshoots, and layout thrashing.
* **Core Principles**:
  * **Frequency Gate**: High-frequency actions (logging an expense, tapping tabs) must have zero or instant (<180ms) motion; milestone actions (clearing a debt, budget goal reached) can be expressive.
  * **Accessibility**: Strict requirement for `prefers-reduced-motion` compliance.
* **Trigger Phrases**:
  > *"Animate the QuickEntryModal transition"*  
  > *"Make the wallet balance card feel more responsive on tap"*  
  > *"Audit our button press and screen transition animations"*

---

### 3. `frontend-design`
* **Path**: `skills/frontend-design/SKILL.md`
* **Purpose**: Guides creation of distinctive, production-grade frontend interfaces that avoid generic, predictable AI-generated aesthetics (no purple-on-white gradients, no default system fonts).
* **Focus Areas**:
  * **Bold Visual Direction**: Choosing intentional aesthetics (e.g. brutalist, refined minimal, luxury/editorial, utilitarian).
  * **Distinctive Typography**: Curated font pairings and hierarchy that elevate the user experience.
  * **Spatial Composition & Visual Depth**: Asymmetry, layered cards, ambient backgrounds, and controlled density tailored for mobile touch interfaces.
* **Pocket Wallet Application**:
  * Designing modern wallet dashboards, spend breakdown charts, custom category badges, and bill tracking calendars.
* **Trigger Phrases**:
  > *"Design a distinctive analytics screen for monthly spending"*  
  > *"Redesign the wallet summary card to feel more premium"*  
  > *"Improve visual hierarchy on the About and Settings screens"*

---

### 4. `tailwind-design-system`
* **Path**: `skills/tailwind-design-system/SKILL.md`
* **Purpose**: Reference architecture for modern design systems, design tokens, component variants, and responsive layout patterns.
* **Focus Areas**:
  * CSS-first configuration (`@theme`), design token structures, semantic color scales.
  * Component variants, state machines, and accessible primitives.
  * Serves as a companion pattern reference when expanding Pocket Wallet's theme tokens (`src/theme/tokens.ts`).
* **Trigger Phrases**:
  > *"Standardize color tokens across components"*  
  > *"Create component variant patterns for button primitives"*  
  > *"Refactor theme tokens for dark/light mode consistency"*

---

### 5. `user-research`
* **Path**: `skills/user-research/SKILL.md`
* **Purpose**: Plan, conduct, and synthesize user research studies to guide product decisions and improve app ergonomics.
* **Deliverables**:
  * Interview guides (5-stage structure: warm-up, context, deep dive, reaction, wrap-up).
  * Usability testing scripts for testing key user journeys.
  * Synthesis frameworks: affinity mapping, impact/effort prioritization, jobs-to-be-done.
* **Pocket Wallet Application**:
  * Evaluating friction in the 3-second quick expense logging flow.
  * Validating bill notification clarity and recurring budget mental models.
* **Trigger Phrases**:
  > *"Create a usability test plan for the transaction quick-entry flow"*  
  > *"Draft a user interview guide to understand how people track daily cash expenses"*  
  > *"Synthesize feedback from beta testers on bill reminders"*

---

## Configuration (`settings.json`)

The `.antigravity/settings.json` file configures agent behavior and registers skills:

```json
{
  "$schema": "https://antigravity.google/schemas/settings.json",
  "project": {
    "name": "pocket-wallet",
    "description": "Offline-first personal finance and budget manager built with Expo and React Native",
    "framework": "expo",
    "platform": "react-native",
    "guidelines": "AGENTS.md"
  },
  "skills": {
    "directory": "./skills",
    "autoTrigger": true,
    "enabled": [
      "security-audit",
      "design-motion-principles",
      "frontend-design",
      "tailwind-design-system",
      "user-research"
    ]
  },
  "permissions": {
    "toolExecutionPolicy": "request-review",
    "nonWorkspaceFileAccess": "ask",
    "internetAccess": "allow",
    "sandboxMode": false
  },
  "urlRandomness": "yl92nlw"
}
```

### Settings Reference

| Key | Type | Description |
| :-- | :--- | :---------- |
| `project.guidelines` | `string` | Pointer to root agent guidelines (`AGENTS.md`). |
| `skills.directory` | `string` | Path to project-scoped skills directory (`./skills`). |
| `skills.enabled` | `string[]` | List of active skills ready for progressive disclosure. |
| `skills.autoTrigger` | `boolean` | When `true`, agent activates skills based on user intent matching skill descriptions. |
| `permissions.toolExecutionPolicy` | `string` | Execution policy for shell/terminal commands (`request-review`, `always-proceed`). |
| `permissions.nonWorkspaceFileAccess` | `string` | Guard for accessing paths outside the repository (`ask`, `allow`, `deny`). |
| `permissions.internetAccess` | `string` | Network access policy for documentation lookups and web tools (`allow`, `ask`, `deny`). |
| `urlRandomness` | `string` | Persistent Expo development tunnel identifier slug. |

---

## Workspace Discovery Integration

Antigravity scans `.agents/` as the standard project customization root. To ensure skills placed in `.antigravity/skills/` are automatically discovered, `.agents/skills.json` is registered at the project root:

```json
{
  "$schema": "https://antigravity.google/schemas/skills.json",
  "entries": [
    {
      "path": ".antigravity/skills"
    }
  ]
}
```

### Standard Skill Structure

Every skill inside `.antigravity/skills/` conforms to the canonical Antigravity specification:

```text
skills/<skill-name>/
├── SKILL.md            # Required: Contains YAML frontmatter (name & description) + instructions
├── scripts/            # Optional: Executable validation scripts or helpers
└── references/         # Optional: Progressive reference documentation
```

---

## Adding New Skills

To add a new skill to this project:

1. Create a directory: `.antigravity/skills/<your-skill-name>/`
2. Create `.antigravity/skills/<your-skill-name>/SKILL.md` with required frontmatter:
   ```markdown
   ---
   name: your-skill-name
   description: Clearly state what the skill does and what triggers it. Use third-person.
   ---

   # Skill Title

   Step-by-step instructions and guidelines...
   ```
3. Add the skill name to the `skills.enabled` array in `.antigravity/settings.json`.
4. The agent will automatically detect and load it on relevant requests.
