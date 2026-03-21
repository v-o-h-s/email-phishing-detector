import type { AnalysisResult, ExtensionMessage } from "../shared/types";
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

  // Ask the background worker to analyse it
  const message: ExtensionMessage = {
    type: "ANALYZE_EMAIL",
    dataMessageId: messageId,
  };
  chrome.runtime.sendMessage(
    message,
    (result?: AnalysisResult) => {
      if (!result) return;
      injectPanel(result, messageId);
    },
  );
}

function injectPanel(result: AnalysisResult, messageId: string): void {
  // Remove old panel if present
  document.getElementById("spoof-panel")?.remove();
  ensurePanelStyles();

  const totalScore = calculateTotalScore(result.scores);
  const reasonsList = result.reasons.length
    ? result.reasons.map((reason) => `<li>${reason}</li>`).join("")
    : "<li>No reasons provided</li>";
  const scoresList = Object.entries(result.scores)
    .filter(([, value]) => value != null)
    .map(([layer, value]) => `<li>${layer}: ${value}</li>`)
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
    <div class="spoof-score">Overall Score: ${totalScore}</div>
    <div class="spoof-section">Reasons</div>
    <ul>${reasonsList}</ul>
    <div class="spoof-section">Layer Scores</div>
    <ul>${scoresList || "<li>No scores available</li>"}</ul>
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


// main code 
function calculateTotalScore(scores: AnalysisResult["scores"]): number {
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
  `;
  document.head.appendChild(style);
}
const observer = new MutationObserver(mutationCallback);
observer.observe(document.body, { childList: true, subtree: true });

