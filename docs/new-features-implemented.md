# New Features Implemented (Popup + New Checks)

This doc explains what was added to implement the missing checks + wire the popup end-to-end.

---

## What I added

### 1) Popup end-to-end wiring (GET_ANALYSIS)

- Background now **caches the latest analysis** in `chrome.storage.local` under a single key.
- Popup sends `{ type: "GET_ANALYSIS" }` and the background responds with:
  - `{ type: "ANALYSIS_RESULT", payload: AnalysisSnapshot | null }`
- Popup now renders **per-layer diagnostics** (scores + reasons) instead of a placeholder.

Files:
- `src/background/index.ts`
- `src/shared/types.ts`
- `src/popup/Popup.tsx`

---

### 2) Added detection layers

Each layer outputs `{ score, reasons[] }` and is merged into the analysis result.

#### **Display name spoofing**
- **What it detects**: suspicious organization-like display name using a freemail domain
- **Example**: `"Security Team" <someone@gmail.com>`
- **File**: `src/background/layers/displayName.ts`

#### **Lookalike domain**
- **What it detects**: domains visually close to protected brands (edit distance + common substitutions) and/or mixed scripts
- **Example**: `paypa1.com` near `paypal.com`
- **File**: `src/background/layers/lookalikeDomain.ts`

#### **Timezone mismatch**
- **What it detects**: `Date:` timezone offset that is unusual for common ccTLDs (rough heuristic)
- **Example**: `somebank.uk` with `+0800`
- **File**: `src/background/layers/timezone.ts`

#### **Domain age (RDAP)**
- **What it detects**: very new domains (via RDAP “registration” event date)
- **Implementation**: background fetches `https://rdap.org/domain/{domain}` and caches the result for 24h to avoid rate-limit
- **File**: `src/background/layers/domainAge.ts`
- **Manifest change**: added `https://rdap.org/*` to `public/manifest.json` host permissions

#### **Received-chain anomalies**
- **What it detects (basic v1)**:
  - From domain not seen anywhere in Received headers
  - earliest hop includes private/localhost routing
  - unusually long chain
- **File**: `src/background/layers/receivedChain.ts`

---

### 3) Improved header extraction

Content script now extracts and sends:
- `Date:` header (for timezone layer)
- All `Received:` header blocks (for received-chain layer)

Files:
- `src/content/lib/lib.ts`
- `src/content/index.ts`

---

## How to verify the extension is working

### Build & load

1. Build:

```bash
bun run build
```

2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `dist/` folder

### Test in Gmail (content-panel)

1. Open `https://mail.google.com`
2. Open any email message
3. You should see an injected panel titled **PHISHING CHECK** with:
   - overall score
   - each layer listed as a details section

### Test the popup

1. Click the extension icon
2. You should see:
   - status + score
   - a diagnostics list with each layer and reasons

If popup shows “OPEN AN EMAIL IN GMAIL…”, open an email and wait a few seconds, then reopen the popup.

---

## Safe testing (without doing real spoofing)

I can’t help with instructions to spoof real brands/domains or bypass security systems.

But you can safely test detection with **non-harmful** scenarios:

- **Reply-To mismatch test**:
  - Send yourself an email from a normal account, but set Reply-To to a different domain (many email clients let you set Reply-To).
  - The extension should flag “Reply-To domain differs…”.

- **Display name spoofing test (safe)**:
  - Create a Gmail account and set its display name to “Security Team” or “PayPal Support”.
  - Send an email to yourself. The layer should warn because it’s freemail + org-like display name.

- **Lookalike domain test (safe)**:
  - Use a domain you own (or a clearly fake domain like `paypa1.example`) in test headers/email addresses if your mail system allows it.
  - The lookalike layer should warn if it resembles protected domains.

- **Domain age test**:
  - Use a recently registered domain you control.
  - The domain-age layer will query RDAP and score it as new.

---

## Git commands (new branch + push)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/popup-and-new-layers

git add .
git commit -m "Add new detection layers and wire popup analysis"
git push -u origin feature/popup-and-new-layers
```

