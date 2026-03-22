# c2-email-spoofing-detector: Agent & Developer Guidelines

This document provides essential context, commands, and strict conventions for AI agents (Cursor, Copilot, CLI agents) and human developers operating in the `c2-email-spoofing-detector` repository. It serves as the definitive source of truth and replaces any `.cursorrules` or `.github/copilot-instructions.md` files.

---

## 1. Project Overview & Core Stack

This project is a self-contained Chrome Extension (Manifest V3) focused on detecting email spoofing, phishing, and impersonation attempts.
- **Runtime, Test Runner & Bundler:** Bun (Strictly NO Node.js, npm, yarn, pnpm, Vite, or Webpack)
- **UI & Styling:** React 19 + TypeScript + Tailwind CSS v4
- **Target Platform:** Chrome / Chromium browsers ONLY.

---

## 2. Directory Structure Overview

- `src/background/` - Service worker logic, Chrome API interactions, main analysis engine.
- `src/content/` - Content scripts injected into web pages (e.g., Gmail DOM parsing).
- `src/popup/` - React application representing the extension popup UI.
- `src/shared/` - Common TypeScript types, constants, and stateless utility functions.
- `public/` - Static assets, `manifest.json`, and icons.
- `dist/` - Build output directory (ignored in git).

---

## 3. Essential Commands: Build, Test, and Lint

**CRITICAL:** Do not use `npm`, `yarn`, or `pnpm`. Always use `bun`.

### Building & Running
- **Development Build:** `bun run build` (Outputs to `/dist` with inline sourcemaps for debugging)
- **Production Build:** `bun run build:prod` (Outputs minified payload to `/dist`)
- **Watch Mode:** `bun run dev` (Automatically rebuilds on file change - heavily recommended during UI work)

### Testing (Bun Test)
We use Bun's built-in, ultra-fast test runner (`bun test`). Do not install or use Jest or Vitest.

- **Run all tests:** `bun test`
- **Run a single test file (CRITICAL FOR AGENTS):** `bun test src/path/to/your.test.ts`
- **Run a specific test case by name:** `bun test -t "Spoofing Analysis"`
- **Watch tests during development:** `bun test --watch`
- **Proactive Testing:** Whenever implementing new analysis logic, immediately write an accompanying test.
- **Mocking:** Use `bun:test` built-in `mock()`, `spyOn()` functions. Mock `chrome.*` APIs when testing background scripts.

### Linting & Typechecking
- **Typecheck:** `bun run typecheck` (runs `tsc --noEmit`)
- **Mandate:** Always run `bun run typecheck` after making significant changes to verify type safety across the project, as TypeScript runs in a strict configuration. Do not leave broken types.

---

## 4. Architecture & Environment Boundaries

Chrome Extensions have distinct, isolated execution contexts. **Do not mix code between them.**

- `src/popup/`: Runs in the extension popup context. Cannot access DOM of active web pages directly.
- `src/background/`: Runs continuously in the background. Handles main analysis logic, caching, and Chrome APIs.
- `src/content/`: Injected into Gmail/Outlook tabs. Reads DOM to extract email headers. Keep logic here minimal.
- `src/shared/`: Shared utilities and TypeScript types ONLY. NO Chrome APIs, NO React, NO DOM usage here.

### Communication
- **Cross-context Messaging:** All communication between contexts must use the `ExtensionMessage` discriminated union defined in `src/shared/types.ts`.
- **Channels:** 
  - Content -> Background: `chrome.runtime.sendMessage`
  - Popup -> Background: `chrome.runtime.sendMessage` (with async `sendResponse` or `Promise` return)
  - Background -> Popup: Persist state via `chrome.storage.local`, then notify the popup or let the popup poll/subscribe on mount.

---

## 5. Code Style & Conventions

### 5.1. TypeScript & Types
- **Strict Mode:** The codebase has TS `strict: true` enabled. 
- **DOM & Chrome Types:** DOM and `chrome.*` APIs have full type support (`@types/chrome`).
- **No Any:** Avoid using `any`. Use `unknown` if a type is genuinely unknown, and narrow it down via type guards.
- **Return Types:** Always specify explicit return types for functions (e.g., `function isSpoofed(): boolean { ... }`).
- **Unions over Enums:** Prefer TypeScript union types (`type Status = "idle" | "danger"`) instead of `enum` for simplicity, performance, and better bundler output.
- **Interfaces vs Types:** Use `type` for message payloads and discriminated unions. Use `interface` for object shapes that might be extended.

### 5.2. Formatting & Syntax
- **Indentation & Quotes:** 2 spaces. Double quotes for strings (`"..."`). Use semicolons at the end of statements.
- **Guard Clauses:** Prefer early returns over deeply nested `if` statements.
- **Null Checks:** Handle `null` and `undefined` safely. For example, `chrome.tabs.query` results may yield empty tabs (`tabId == null`). Always short-circuit early.
- **Imports:** Group external imports first (e.g., React, lucide-react), then shared types, then local modules. Do not use `.ts` extensions in imports unless required by the bundler.
- **React Components:** Use functional components and hooks. Avoid class components. Keep components small and focused.

### 5.3. Naming Conventions
- **React Components:** `PascalCase` (e.g., `SpoofingAlert.tsx`).
- **Functions & Variables:** `camelCase` (e.g., `analyzeHeaders`, `analysisCache`).
- **Message Types/Constants:** `UPPER_SNAKE_CASE` (e.g., `HEADERS_FOUND`, `CLEAR_ANALYSIS`).
- **Files:** `index.ts/tsx` for entry points. Module files should use `camelCase.ts` or `PascalCase.tsx`. Test files must match `[filename].test.ts`.

### 5.4. UI & Styling (Terminal / Hacking Aesthetics)
- **Tailwind v4 Only:** Use Tailwind CSS utility classes for ALL styling.
- **Vibe:** The project strictly follows a "terminal / hacking" monochromatic aesthetic.
  - **Typography:** Exclusively use `font-mono`. Use uppercase text heavily (`uppercase tracking-widest`). Use brackets `[LIKE_THIS]` or carets `> LIKE_THIS` for decorators.
  - **Colors:** NO gradients. NO blur. NO rounded corners (use sharp edges/`rounded-none`). Rely heavily on `bg-black`, `bg-zinc-950`, `border-zinc-800`, and `text-zinc-500`.
  - **Status Accents:** Use muted neon terminal colors strictly for statuses: `text-green-500` (safe), `text-amber-500` (warning), `text-red-500` (danger).
- **No Inline Styles:** Do NOT use the `style={{...}}` prop in React components.
- **PostCSS:** Handled by `@tailwindcss/postcss` natively during the Bun build step. No custom CSS classes unless absolutely necessary.

### 5.5. Error Handling
- **Fail Fast:** If required elements or state are missing, throw early (e.g., `if (!container) throw new Error("Missing container element")`).
- **Graceful Fallbacks:** For network or permission issues in Chrome APIs, catch errors and gracefully degrade the UI state instead of crashing the background worker.
- **Console Logging:** Use `console.warn` and `console.error` for actionable issues. Prefix logs with the context (e.g., `[Background] Failed to parse headers: ...`).
- **Custom Errors:** Create custom Error classes for specific domain failures (e.g., `class ParsingError extends Error`) to allow targeted `catch` blocks.

---

## 6. Agent-Specific Directives (Cursor, Copilot, CLI Agents)

The following instructions act as the definitive `cursorrules` for any LLM operating in this environment:

1. **Bun Tooling is King:** When creating shell commands or modifying `package.json` scripts, *always* use `bun` syntax. Use `bun add <pkg>`, `bun remove <pkg>`, `bun run <script>`, `bunx <cmd>`.
2. **File System Operations:** Prefer using `Bun.file(path)` rather than importing Node's `node:fs` module when executing build scripts.
3. **Shell Commands in Code:** If you need to spawn shell processes during build scripts or tools, use Bun's built-in `$`: `` import { $ } from "bun"; await $`ls -la`; ``.
4. **Environment Variables:** Bun auto-loads `.env`. Do NOT install or use the `dotenv` package.
5. **Self-Contained Output:** `build.ts` uses `format: "iife"`. Extensions require fully self-contained scripts. Do not attempt to use runtime ES imports (`import(...)` dynamically) within the background worker or content scripts.
6. **Proactiveness in Types:** When adding a feature, think about whether it requires a new type in `src/shared/types.ts`. Implement the shared type first before using it in the popup or background contexts.
7. **Testing Self-Correction:** When implementing new analysis logic in `src/background/analyzer.ts`, proactively write a test in `src/background/analyzer.test.ts` and run it via the single-test command documented above (`bun test src/background/analyzer.test.ts`).
8. **UI Restraint:** Never introduce highly colorful, gradient-heavy, or heavily rounded UI elements. Stick strictly to the defined font-mono/zinc terminal aesthetic.
9. **No Ghost Code:** When editing files, ensure you remove dead code. Do not leave commented-out blocks of old code unless specifically asked to document history.

By strictly adhering to these rules, you will maintain a fast, safe, and easily deployable Chrome Extension that retains its distinct visual identity.