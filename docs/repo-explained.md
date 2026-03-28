# Repository Explanation (Folders, Files, What’s Implemented)

This document explains **what every folder/file does**, how the extension works end-to-end, and a **feature audit** (implemented vs not implemented) against your checklist.

---

## Big picture: what this repo is

This is a **Chrome Extension (Manifest V3)** that runs on **Gmail Web** (`mail.google.com`) and:

- **Extracts email headers** from the Gmail UI (content script)
- **Sends extracted headers** to the background service worker (message passing)
- **Runs detection layers** in the background (SPF/DKIM/DMARC parse + Reply-To mismatch)
- **Displays results** in-page (a panel injected into the email body)

There is also a **React popup UI**, but it is currently **not fully wired** to show real analysis results.

---

## How Chrome extension contexts work (important to add features)

Chrome extensions have isolated contexts:

- **Content script** (`src/content/`): runs *inside Gmail tab*, can read Gmail DOM and call `fetch()` to Gmail endpoints (with user cookies).
- **Background service worker** (`src/background/`): runs in extension background, should host analysis logic and state/caching.
- **Popup** (`src/popup/`): runs only when user clicks the extension icon, cannot access Gmail DOM directly.
- **Shared** (`src/shared/`): types/utilities shared across contexts (no DOM, no Chrome APIs, no React).

Communication happens by messages (`chrome.runtime.sendMessage`) using the union in `src/shared/types.ts`.

---

## Data flow (what happens when you open an email)

1. `src/content/index.ts` observes Gmail DOM changes and detects when a new message is shown.
2. It extracts headers via:
  - **Preferred:** `fetchHeadersFromStandardView()` which calls Gmail “view=om” and parses the raw header blocks
  - **Fallback:** `extractAuthHeaderFromDom()` which tries to find auth headers in `document.body.innerText`
3. Content script sends message `{ type: "ANALYZE_EMAIL", authHeader, fromHeader, replyToHeader }` to background.
4. Background (`src/background/index.ts`) runs:
  - `analyzeAuthChecks()` → parses `Authentication-Results` (or similar) and scores SPF/DKIM/DMARC outcomes
  - `analyzeReplyTo()` → compares From vs Reply-To domains and scores mismatch
5. Content script receives the result and injects an on-page panel using `src/content/lib/panel.ts`.

---

## Folder-by-folder explanation

### `src/`

All TypeScript source code.

#### `src/background/`

The **service worker** (the “brain” of the extension).

- `**src/background/index.ts`**
  - Listens for `ANALYZE_EMAIL`
  - Calls the analysis layers in parallel
  - Returns a combined `AnalysisResult` back to the content script
  - **Missing:** no caching/storage of results, no handling for popup (`GET_ANALYSIS`) requests

##### `src/background/layers/`

Each file here is one **detection layer** (a check that produces a score + reasons).

- `**src/background/layers/authChecks.ts`**
  - **Input:** `Authentication-Results` header text (or similar)
  - **Output:** score (capped at 40) + reasons for SPF/DKIM/DMARC
  - **Important note:** this does **not** do DNS lookups; it only parses what Gmail/receiving server already computed.
- `**src/background/layers/replyTo.ts`**
  - Extracts domains from `From:` and `Reply-To:` header lines
  - Allows same-domain and subdomain alignment
  - Flags mismatch with score 20
  - **Note:** if either header is missing, it returns “no result” (score 0, no reasons)

#### `src/content/`

Runs inside Gmail tabs. Keeps DOM logic + Gmail header extraction.

- `**src/content/index.ts`**
  - Watches Gmail DOM via `MutationObserver`
  - Detects a new opened message (`[data-message-id]`)
  - Calls `analyzeMessage()` → fetches headers → sends to background → injects panel or error panel
  - Has an ignore mechanism (per message id) via `Panel.isMessageIgnored`

##### `src/content/lib/`

- `**src/content/lib/lib.ts**`
  - `fetchHeadersFromStandardView(messageElement)`:
    - Finds Gmail message/thread id + `ik`
    - Fetches `https://mail.google.com/mail/u/0/?ui=2&ik=...&view=om&th=...`
    - Extracts header blocks: `Authentication-Results`, `ARC-Authentication-Results`, `Received-SPF`, `From`, `Reply-To`
  - `extractAuthHeaderFromDom()` fallback:
    - Scans `document.body.innerText` for auth headers
  - Also includes helpers for Gmail ids (`data-legacy-message-id`, thread ids) and header block extraction.
- `**src/content/lib/panel.ts**`
  - Pure DOM injection:
    - Renders overall score (sum of layer scores)
    - Renders each layer as `<details>` showing reasons
    - Buttons: Close, Ignore
  - **Important:** this is currently the *main UI* where results are visible (not the React popup).

#### `src/popup/`

The extension icon popup (React UI).

- `**src/popup/index.tsx`**
  - Mounts React popup into `#root`.
- `**src/popup/Popup.tsx**`
  - Shows a “terminal” style status screen
  - Sends `{ type: "GET_ANALYSIS" }` to background
  - Expects `{ type: "ANALYSIS_RESULT", payload: SpoofingAnalysis }`
  - **Not implemented end-to-end:** background never handles `GET_ANALYSIS`, so popup will not show real results.
  - Diagnostics section is explicitly marked TODO.
- `**src/popup/index.css`**
  - Tailwind v4 entrypoint (`@import "tailwindcss";`)

#### `src/shared/`

Shared types. This is the contract between contexts.

- `**src/shared/types.ts**`
  - Defines `AnalysisLayers` (currently only 2)
  - Defines `AnalysisResult` (success/fail)
  - Defines `ExtensionMessage` union
  - Defines `SpoofingAnalysis` used by the popup
  - **Type safety gap:** `ANALYSIS_RESULT` payload is `any` right now.

---

## Other top-level folders

### `public/`

Static extension assets (copied into `dist/`).

- `**public/manifest.json`**: MV3 config (permissions, background, content script, popup)
- `**public/popup.html**`: HTML shell that loads popup assets
- `**public/icons/**`: extension icons (copied to `dist/icons/` if present)

### `dist/`

Build output. This is what you load into Chrome via “Load unpacked”.

### `docs/`

Project documentation (conceptual + implementation notes).

### `tests/`

Bun tests for the analysis layers:

- `tests/authChecks.test.ts`
- `tests/replyTo.test.ts`

### `node_modules/`

Dependencies installed by Bun (present locally; generally not committed).

---

## Build + tooling files (what they do)

- `**build.ts**`
  - Bundles popup/content/background into **self-contained IIFE** outputs in `dist/`
  - Runs PostCSS to produce `dist/popup.css` from `src/popup/index.css`
  - Copies `public/manifest.json`, `public/popup.html`, and `public/icons/`
- `**package.json`**
  - Scripts:
    - `bun run build` / `bun run dev` / `bun run typecheck`
  - Dependencies: React 19, Tailwind v4, PostCSS.
- `**tsconfig.json**`
  - Strict TypeScript configuration (bundler resolution).
- `**README.md**`
  - Overview and dev workflow
  - **Out of date detail:** it references `src/background/analyzer.ts`, but your analysis is currently in `src/background/layers/*.ts` and orchestrated by `src/background/index.ts`.

---

## What’s implemented vs not implemented (your checklist)

### Implemented (in code today)

- **SPF**: ✅ Implemented (parsed/scored) in `src/background/layers/authChecks.ts`
  - Detects: fail/softfail/neutral/none (based on `Authentication-Results` / `Received-SPF`)
  - **Important limitation:** no live DNS validation; it trusts receiver results in the header text.
- **DKIM**: ✅ Implemented (parsed/scored) in `src/background/layers/authChecks.ts`
  - Detects: `dkim=fail`, `dkim=none`, `dkim=policy` (strings in header)
- **DMARC**: ✅ Implemented (parsed/scored) in `src/background/layers/authChecks.ts`
  - Detects: `dmarc=fail`, `dmarc=none`
- **From vs Reply-To**: ✅ Implemented in `src/background/layers/replyTo.ts`
  - Detects mismatch (with subdomain alignment allowed)
- **“Fetching headers from Gmail DOM”**: ✅ Implemented in `src/content/lib/lib.ts`
  - Primary method is fetching Gmail’s standard “original message” view (`view=om`)
  - Fallback scans the DOM text for auth headers

### Not implemented yet (mentioned in docs/ideas but not in code)

- **Timezone**: ❌ Not implemented
- **Display name**: ❌ Not implemented
- **Domain age**: ❌ Not implemented
- **Lookalike domain**: ❌ Not implemented
- **Header inconsistency / Received-chain mismatch**: ❌ Not implemented
- **Popup result display** (GET_ANALYSIS → ANALYSIS_RESULT): ❌ Not implemented end-to-end

---

## Is the statement in your chat true?

> “what is left is just fetching headers from gmail dom and apply security checks … which are in background/layers”

**Partially true:**

- **True:** header extraction is already implemented (`src/content/lib/lib.ts`), and the checks are in `src/background/layers/`.
- **Not fully complete:** the popup path is not implemented (background does not cache analysis and doesn’t answer `GET_ANALYSIS`). Today, the “real” visible output is the **in-page injected panel**.

---

## How to add more features (the pattern to follow)

When adding a new check:

1. **Add a new layer file** in `src/background/layers/` that returns `{ score, reasons }`.
2. **Add a new layer key** in `src/shared/types.ts` (`AnalysisLayers`).
3. **Extract required inputs** in `src/content/lib/lib.ts` (more headers, parsed fields, etc.).
4. **Send the new fields** via `ExtensionMessage` (`ANALYZE_EMAIL` payload).
5. **Run the layer** in `src/background/index.ts` and merge into `reasons/scores`.
6. **Add tests** in `tests/` (Bun test).

---

## Suggested next steps (highest impact)

- Wire background caching + popup messaging (`GET_ANALYSIS`) so the popup shows real per-layer results.
- Add the next detection layers from your list:
  - Display name vs freemail
  - Lookalike domain
  - Received-chain anomalies (start simple: unexpected TLD/country hints; later IP reputation)
  - Domain age (requires an external API or whois-like source; needs careful privacy design)

