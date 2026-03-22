import type {
  AnalysisResult,
  AnalysisResultSuccess,
  ExtensionMessage,
} from "../shared/types";
let lastSeenId: string | null = null;
const ignoredMessageIds = new Set<string>();

function mutationCallback(): void {
  const msgEl = document.querySelector("[data-message-id]");
  if (!msgEl) return;

  const messageId = msgEl.getAttribute("data-message-id");
  if (!messageId || messageId === lastSeenId || ignoredMessageIds.has(messageId)) {
    return;
  }
  lastSeenId = messageId;

  void analyzeMessage(msgEl, messageId);
}

async function analyzeMessage(messageElement: Element, messageId: string): Promise<void> {
  const authHeader =
    (await fetchAuthHeaderFromStandardView(messageElement)) ??
    extractAuthHeaderFromDom();

  const message: ExtensionMessage = {
    type: "ANALYZE_EMAIL",
    authHeader,
  };

  chrome.runtime.sendMessage(
    message,
    (result?: AnalysisResult) => {
      if (!result) return;
      if ("error" in result) {
        injectErrorPanel(result.error, messageId);
        return;
      }
      injectPanel(result, messageId);
    },
  );
}

function injectPanel(result: AnalysisResultSuccess, messageId: string): void {
  // Remove old panel if present
  document.getElementById("spoof-panel")?.remove();
  ensurePanelStyles();

  const totalScore = calculateTotalScore(result.scores);
  const testItems = Object.entries(result.scores)
    .filter(([, value]) => value != null)
    .map(([layer, value]) => {
      const reasons = result.reasons[layer as keyof typeof result.reasons] ?? [];
      const reasonsList = reasons.length
        ? reasons.map((reason) => `<li>${reason}</li>`).join("")
        : "<li>No reasons provided</li>";
      return `
        <details class="spoof-detail">
          <summary class="spoof-summary">${layer} — Score: ${value}</summary>
          <ul>${reasonsList}</ul>
        </details>
      `;
    })
    .join("");

  const panel = document.createElement("div");
  panel.id = "spoof-panel";
  panel.className = "spoof-panel";
  panel.innerHTML = `
    <div class="spoof-header">
      <div class="spoof-title">PHISHING CHECK</div>
      <div class="spoof-actions">
        <button type="button" class="spoof-button" data-action="close">Close</button>
        <button type="button" class="spoof-button" data-action="ignore">Ignore</button>
      </div>
    </div>
    <div class="spoof-score">Overall Score: ${totalScore}%</div>
    <div class="spoof-section">Tests</div>
    <div class="spoof-tests">${testItems || "<div>No tests available</div>"}</div>
  `;

  const closeButton = panel.querySelector<HTMLButtonElement>(
    "[data-action='close']"
  );
  closeButton?.addEventListener("click", () => {
    panel.remove();
  });

  const ignoreButton = panel.querySelector<HTMLButtonElement>(
    "[data-action='ignore']"
  );
  ignoreButton?.addEventListener("click", () => {
    ignoredMessageIds.add(messageId);
    panel.remove();
  });

  // Insert above the email body in Gmail
  const emailBody = document.querySelector(".a3s");
  emailBody?.prepend(panel);
}

function injectErrorPanel(errorMessage: string, messageId: string): void {
  document.getElementById("spoof-panel")?.remove();
  ensurePanelStyles();

  const panel = document.createElement("div");
  panel.id = "spoof-panel";
  panel.className = "spoof-panel";
  panel.innerHTML = `
    <div class="spoof-header">
      <div class="spoof-title">PHISHING CHECK</div>
      <div class="spoof-actions">
        <button type="button" class="spoof-button" data-action="close">Close</button>
        <button type="button" class="spoof-button" data-action="ignore">Ignore</button>
      </div>
    </div>
    <div class="spoof-score">Unable to analyze</div>
    <div class="spoof-section">Error</div>
    <ul><li>${errorMessage}</li></ul>
  `;

  const closeButton = panel.querySelector<HTMLButtonElement>(
    "[data-action='close']"
  );
  closeButton?.addEventListener("click", () => {
    panel.remove();
  });

  const ignoreButton = panel.querySelector<HTMLButtonElement>(
    "[data-action='ignore']"
  );
  ignoreButton?.addEventListener("click", () => {
    ignoredMessageIds.add(messageId);
    panel.remove();
  });

  const emailBody = document.querySelector(".a3s");
  emailBody?.prepend(panel);
}


// main code 
function calculateTotalScore(scores: AnalysisResultSuccess["scores"]): number {
  return Object.values(scores).reduce((total, value) => total + (value ?? 0), 0);
}

function ensurePanelStyles(): void {
  if (document.getElementById("spoof-panel-styles")) return;
  const style = document.createElement("style");
  style.id = "spoof-panel-styles";
  style.textContent = `
    .spoof-panel {
      background: #000000;
      border: 1px solid #27272a;
      color: #a1a1aa;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      padding: 12px;
      margin: 0 0 12px 0;
    }
    .spoof-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .spoof-title {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      color: #e4e4e7;
    }
    .spoof-actions {
      display: flex;
      gap: 8px;
    }
    .spoof-button {
      background: transparent;
      border: 1px solid #3f3f46;
      color: #a1a1aa;
      padding: 4px 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 10px;
      cursor: pointer;
    }
    .spoof-button:hover {
      color: #e4e4e7;
      border-color: #52525b;
    }
    .spoof-score {
      color: #e4e4e7;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 12px;
    }
    .spoof-section {
      margin-top: 10px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
      color: #71717a;
    }
    .spoof-panel ul {
      margin: 0 0 4px 0;
      padding-left: 16px;
    }
    .spoof-tests {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .spoof-detail {
      border: 1px solid #27272a;
      padding: 6px 8px;
    }
    .spoof-summary {
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
      color: #e4e4e7;
      list-style: none;
    }
    .spoof-summary::-webkit-details-marker {
      display: none;
    }
  `;
  document.head.appendChild(style);
}
const observer = new MutationObserver(mutationCallback);
observer.observe(document.body, { childList: true, subtree: true });

function extractAuthHeaderFromDom(): string | null {
  const bodyText = document.body.innerText ?? "";
  return (
    extractHeaderBlock(bodyText, "Authentication-Results") ??
    extractHeaderBlock(bodyText, "ARC-Authentication-Results") ??
    extractHeaderBlock(bodyText, "Received-SPF") ??
    null
  );
}

async function fetchAuthHeaderFromStandardView(
  messageElement: Element
): Promise<string | null> {
  const messageId = getGmailMessageId(messageElement) ?? getGmailThreadId(messageElement);
  const ik = getGmailIk();
  if (!messageId || !ik) return null;

  const url = new URL("https://mail.google.com/mail/u/0/");
  url.searchParams.set("ui", "2");
  url.searchParams.set("ik", ik);
  url.searchParams.set("view", "om");
  url.searchParams.set("th", messageId);

  try {
    const response = await fetch(url.toString(), { credentials: "include" });
    if (!response.ok) return null;
    const text = await response.text();
    return (
      extractHeaderBlock(text, "Authentication-Results") ??
      extractHeaderBlock(text, "ARC-Authentication-Results") ??
      extractHeaderBlock(text, "Received-SPF") ??
      null
    );
  } catch {
    return null;
  }
}

function getGmailMessageId(messageElement: Element): string | null {
  return (
    messageElement.getAttribute("data-legacy-message-id") ??
    messageElement.closest("[data-legacy-message-id]")?.getAttribute("data-legacy-message-id") ??
    null
  );
}

function getGmailThreadId(messageElement: Element): string | null {
  const threadId =
    messageElement.getAttribute("data-legacy-thread-id") ??
    messageElement.getAttribute("data-thread-id") ??
    messageElement
      .closest("[data-legacy-thread-id]")
      ?.getAttribute("data-legacy-thread-id") ??
    messageElement.closest("[data-thread-id]")?.getAttribute("data-thread-id") ??
    document.querySelector("[data-legacy-thread-id]")?.getAttribute(
      "data-legacy-thread-id"
    ) ??
    document.querySelector("[data-thread-id]")?.getAttribute("data-thread-id");

  return threadId ?? null;
}

function getGmailIk(): string | null {
  const cached = document.documentElement.getAttribute("data-ik");
  if (cached) return cached;

  const scripts = Array.from(document.querySelectorAll("script"));
  const ikRegex = /["']ik["']\s*[,:]\s*["']([a-z0-9]{10,})["']/i;
  for (const script of scripts) {
    const text = script.textContent;
    if (!text) continue;
    const match = text.match(ikRegex);
    if (match?.[1]) {
      document.documentElement.setAttribute("data-ik", match[1]);
      return match[1];
    }
  }

  const htmlText = document.documentElement.innerHTML;
  const htmlMatch = htmlText.match(ikRegex) || htmlText.match(/GLOBALS=\[.*?,.*?,"([a-z0-9]{10,})",/i);
  if (htmlMatch?.[1]) {
    document.documentElement.setAttribute("data-ik", htmlMatch[1]);
    return htmlMatch[1];
  }

  return null;
}

function extractHeaderBlock(text: string, headerName: string): string | null {
  const pattern = new RegExp(
    `^${headerName}:.*(?:\\r?\\n[\\t ].*)*`,
    "mi"
  );
  const match = text.match(pattern);
  return match?.[0] ?? null;
}
