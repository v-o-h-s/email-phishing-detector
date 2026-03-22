# Reply-To Mismatch Detection

Reply-To mismatch is a common phishing indicator. It occurs when the visible
`From:` domain differs from the `Reply-To:` domain. Attackers use this to make
an email look legitimate while redirecting replies to a different mailbox.

## What We Check

1. Extract the `From:` and `Reply-To:` domains from headers.
2. Normalize domains (lowercase, trim, remove trailing dots).
3. Compare domains:
   - Exact match or subdomain alignment is treated as OK.
   - Any other mismatch is flagged.

## Why It Matters

If a user clicks Reply, their response goes to the Reply-To address, not the
From address shown in the UI. A mismatch can indicate impersonation or a
malicious redirection.

## Implementation Details

- Logic lives in `src/background/layers/replyTo.ts`.
- The layer returns a score and reason strings that surface in the UI.
- Subdomain alignment is allowed (e.g., `alerts.example.com` vs `example.com`).

## Example

```
From: CEO <ceo@company.com>
Reply-To: attacker@evil.com
```

Result: flagged as mismatch.
