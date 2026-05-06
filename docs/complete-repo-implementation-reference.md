# Complete Repository Implementation Reference (Final)

This is the final file-by-file implementation map for the current repository state.

## Latest Reliability Fixes (May 2026)

These fixes were added after end-to-end phishing test emails showed missed detections in Gmail rendering edge-cases.

### `src/shared/urlExtract.ts` (new)
- Added plain-text URL extraction (`extractHttpUrlsFromText`) so links are detected even when Gmail renders them as text instead of `<a href>`.
- Added Google redirect unwrapping (`unwrapGoogleRedirectUrl`) for `google.com/url?q=...` so downstream URL analysis receives the real target URL.
- Added URL normalization + dedupe helpers to avoid duplicate scoring from wrapped/unwrapped variants of the same URL.

### `src/content/lib/lib.ts`
- Updated extraction helpers to scope to the current opened Gmail message card (instead of relying only on global `.a3s`).
- `extractBodyLinks(...)` now combines link URLs from anchors plus URLs parsed directly from message text.
- `extractBodyText(...)` now reads from the active message body element consistently.
- `extractImageInfo(...)` now scans the message card region and handles attachment-heavy emails better, improving tracking-pixel + QR-warning layer input.

### `src/content/index.ts`
- Updated message payload extraction calls to pass the active message element into body/link/image extractors for accurate per-message analysis.

### `src/background/layers/replyTo.ts`
- Tightened Reply-To logic:
  - still allows valid domain alignment patterns,
  - now flags a same-domain but different mailbox scenario (e.g., forged display with different `@gmail.com` mailbox), which is a common social-engineering pattern.

### `src/background/layers/urlScan.ts`
- Improved no-key behavior:
  - Keeps local URL heuristics (shorteners / non-HTTPS) active even when Safe Browsing key is missing.
  - Adds explicit reason that API reputation lookup was skipped due to missing key.

### `src/background/layers/bodyAnalysis.ts`
- Hardened Gemini layer reliability:
  - Explicit skip reason when Gemini API key is not set.
  - Switched request endpoint to `gemini-2.0-flash`.
  - Improved error messaging for non-200 API responses (includes API detail snippet).
  - Added resilient JSON parsing fallback for model outputs that include extra wrapper text/fences.

### `tests/replyTo.test.ts`
- Added coverage for same-domain different-mailbox detection.
- Updated alignment expectation text to reflect revised reason wording.

### `tests/urlScan.test.ts`
- Added test asserting heuristic URL scoring still works when Safe Browsing key is blank.

### `tests/bodyAnalysis.test.ts`
- Added test for empty Gemini key handling.
- Updated parse-failure assertion to match improved failure reason messaging.

### `tests/urlExtract.test.ts` (new)
- Added tests for plain-text URL extraction, Google redirect unwrapping, and dedupe behavior after unwrapping.

### Verification run after fixes
- `bun run typecheck` passed.
- `bun test` passed (24 tests total).
- `bun run build` passed.

## Project Purpose

`email-phishing-detector` is a Chrome Extension (Manifest V3) focused on phishing/spoofing detection in Gmail, with:
- Gmail content-script extraction
- background risk-layer orchestration
- in-page panel rendering
- popup dashboard + settings
- optional API-backed checks (Safe Browsing + Gemini)
- standalone React website build output

---

## Root-Level Files

### `AGENTS.md`
- Project operating rules and coding conventions.
- Enforces Bun tooling, context boundaries, strict TS style, and terminal-like UI constraints.

### `.gitignore`
- Ignores dependencies, build outputs, caches, env files, logs, editor/system files.

### `package.json`
- Scripts:
  - `bun run build`
  - `bun run build:prod`
  - `bun run dev`
  - `bun run typecheck`
- Dependencies: React 19, Tailwind v4, PostCSS, Lucide.

### `bun.lock`
- Bun dependency lockfile.

### `package-lock.json`
- npm lockfile also present in repo.

### `tsconfig.json`
- Strict TypeScript compilation settings.

### `postcss.config.js`
- PostCSS config with `@tailwindcss/postcss`.

### `.env.example`
- Template for optional API key env vars (`SAFE_BROWSING_API_KEY`, `GEMINI_API_KEY`).
- Current runtime key storage is in extension local settings, not committed secrets.

### `build.ts`
- Build orchestrator that:
  - Ensures output directory exists safely (Windows/OneDrive defensive handling).
  - Bundles JS entrypoints as IIFE:
    - popup app
    - content script
    - background service worker
    - site app
  - Compiles CSS via PostCSS for popup + website.
  - Copies static assets (`manifest.json`, `popup.html`, `site.html`, icons).
  - Replaces existing `dist/icons` before copy to avoid EEXIST races.

### `README.md`
- General project overview and setup instructions.

---

## Public Assets (`public/`)

### `public/manifest.json`
- Manifest V3 definition.
- Branding:
  - `name`: `E-Sentinel`
  - `short_name`: `E-Sentinel`
  - action title: `E-Sentinel`
- Registers:
  - background: `background.js`
  - content script: `content.js` on Gmail
  - popup: `popup.html`
- Host permissions:
  - Gmail
  - RDAP
  - freemail dataset (jsDelivr)
  - protected domain dataset (Majestic)
  - Safe Browsing API
  - Gemini API

### `public/popup.html`
- Popup HTML shell for React popup app (`popup.js`, `popup.css`).

### `public/site.html`
- Website HTML shell for React site app (`site.js`, `site.css`).

### `public/icons/icon16.png`
### `public/icons/icon32.png`
### `public/icons/icon48.png`
### `public/icons/icon128.png`
- Extension icons used by Chrome and popup header branding.
- Regenerated to true size variants for reliable browser display.

---

## Shared Layer (`src/shared/`)

### `src/shared/types.ts`
- Core shared types across popup/content/background:
  - `AnalysisLayers` enum (all layers)
  - `AnalysisResult*`, `AnalysisSnapshot`
  - `AnalysisMeta`, `SenderReputationSummary`
  - `ExtensionSettings`
  - `ExtensionMessage` union:
    - `ANALYZE_EMAIL`
    - `GET_ANALYSIS`
    - `ANALYSIS_RESULT`
    - `GET_SETTINGS`
    - `SETTINGS_RESULT`
    - `UPDATE_SETTINGS`

### `src/shared/settings.ts`
- Default settings + merge logic.
- Stores:
  - global extension enable flag
  - Gemini consent gate
  - per-layer toggles
  - API key fields (default empty; user-provided locally)

---

## Background (`src/background/`)

### `src/background/index.ts`
- Main message router + analysis orchestrator.
- Handles:
  - `ANALYZE_EMAIL`
  - `GET_ANALYSIS`
  - `GET_SETTINGS`
  - `UPDATE_SETTINGS`
- Applies settings before analysis:
  - global enable/disable
  - layer-level enable/disable
  - Gemini consent requirement
- Runs enabled layers and merges scores/reasons.
- Adds metadata:
  - sender domain
  - Google report URL
  - domain age days
  - image presence
  - sender reputation badge data
- Persists:
  - latest snapshot
  - sender reputation map

### Detection Layers (`src/background/layers/`)

#### `authChecks.ts`
- Parses SPF/DKIM/DMARC outcomes from auth headers and scores risk.

#### `replyTo.ts`
- Compares From domain vs Reply-To domain with subdomain-safe alignment.

#### `displayName.ts`
- Flags organization-like display name sent from freemail domains.

#### `lookalikeDomain.ts`
- Detects near-brand domains via normalization + Levenshtein + mixed-script checks.

#### `domainAge.ts`
- Fetches/caches RDAP registration age and scores young domains.
- Returns `ageDays` metadata for timeline rendering.

#### `timezone.ts`
- Flags suspicious Date timezone offsets against ccTLD heuristic ranges.

#### `receivedChain.ts`
- Checks Received chain anomalies (missing sender domain, private/local hops, long chain).

#### `urlScan.ts`
- URL shortener + HTTP link scoring.
- Safe Browsing threat match API check.
- API key injected from local settings.

#### `bodyAnalysis.ts`
- Optional Gemini body text analysis (2000-char truncation).
- Requires explicit consent.
- Parses JSON response and maps risk to score.

#### `trackingPixel.ts`
- Flags tracking-like tiny images and external image-beacon patterns.

#### `qrWarning.ts`
- Adds warning when email contains images (QR social-engineering caution).

### Datasets (`src/background/datasets/`)

#### `freemailDomains.ts`
- Fetches/caches freemail provider list with local fallback.

#### `protectedDomains.ts`
- Fetches/caches top domains (Majestic CSV partial range) with local fallback.

---

## Content Script (`src/content/`)

### `src/content/index.ts`
- Watches Gmail DOM mutations.
- Detects opened message and avoids duplicate analysis.
- Builds `ANALYZE_EMAIL` payload:
  - auth/from/reply-to/date/received
  - links/body text
  - image metadata
- Sends to background and injects success/error panel.

### `src/content/lib/lib.ts`
- Gmail extraction utilities:
  - message/thread ID and IK detection
  - `view=om` request parsing for header blocks
  - auth fallback extraction from DOM
  - body links extraction
  - body text extraction
  - image metadata extraction

### `src/content/lib/panel.ts`
- In-page Gmail panel renderer.
- Shows:
  - overall score
  - per-layer reasons
  - RDAP visual timeline line
  - sender reputation badges
  - one-click phishing report button
  - close/ignore actions

---

## Popup App (`src/popup/`)

### `src/popup/index.tsx`
- React mount entrypoint for popup.

### `src/popup/index.css`
- Popup-specific visual system:
  - dark blue palette
  - custom scrollbars
  - animated score/pulse/spinner
  - custom toggle styles
  - fixed 360x600 shell

### `src/popup/Popup.tsx`
- Full popup UI logic + rendering.
- Tabs:
  - diagnostics
  - settings
- Diagnostics:
  - status card
  - score bar
  - layer accordion with reasons
- Settings:
  - extension enable toggle
  - Gemini consent toggle
  - Safe Browsing key field
  - Gemini key field
  - per-layer toggles
- Uses CSS classes from `index.css` for custom controls/animations.

---

## Website App (`src/site/`)

### `src/site/index.tsx`
- React mount entrypoint for website page.

### `src/site/index.css`
- Website visual system:
  - fonts (Outfit + JetBrains Mono)
  - animated grid/orbs/scan line
  - shimmer/fade/float effects
  - feature card hover system
  - custom scrollbars

### `src/site/Site.tsx`
- Full marketing/landing page built in React.
- Sections:
  - sticky header/nav
  - hero
  - popup preview card
  - stats bar
  - features grid
  - workflow steps
  - install section
  - footer
- Explicitly includes all implemented layer categories in feature content.

---

## Tests (`tests/`)

### `tests/authChecks.test.ts`
- Auth layer behavior + missing header handling.

### `tests/replyTo.test.ts`
- Reply-To mismatch and subdomain alignment behavior.

### `tests/newLayers.test.ts`
- Coverage for display name, lookalike, timezone, received chain, and domain age.

### `tests/urlScan.test.ts`
- URL scan scoring and fallback behavior.

### `tests/bodyAnalysis.test.ts`
- Body analysis scoring, parse fallback, and Gemini consent gating.

### `tests/privacyLayers.test.ts`
- Tracking pixel + QR warning layer behavior.

---

## Docs (`docs/`)

### `docs/reply-to-mismatch.md`
- Deep dive on Reply-To mismatch threat model and implementation.

### `docs/spoofing-detection-guide.md`
- Conceptual anti-spoofing background (SPF/DKIM/DMARC and related heuristics).

### `docs/e2e-email-testing-playbook.md`
- Practical end-to-end lab playbook for testing all layers using fake/sandbox email tools and expected outcomes.

### `docs/new-features-implemented.md`
- Prior milestone notes for newly added checks/wiring.

### `docs/repo-explained.md`
- Older repository explanation document.

### `docs/complete-repo-implementation-reference.md`
- This final comprehensive file-by-file reference.

---

## Dist Output (`dist/`)

Build produces:
- extension artifacts:
  - `manifest.json`
  - `background.js`
  - `content.js`
  - `popup.js`
  - `popup.css`
  - `popup.html`
  - `icons/*`
- website artifacts:
  - `site.js`
  - `site.css`
  - `site.html`

So hosting `dist/` exposes the website page while keeping extension assets available for unpacked load.

---

## Fully Implemented Features Summary

- Gmail header extraction + fallback
- 11-layer phishing/privacy scoring stack
- settings persistence and per-layer controls
- optional API integrations with local key storage
- consent-gated AI body analysis
- sender reputation tracking
- timeline + reporting actions in Gmail panel
- redesigned popup dashboard
- redesigned standalone website page
- automated Bun test coverage across core/new layers

