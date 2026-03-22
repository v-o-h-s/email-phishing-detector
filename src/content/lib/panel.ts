import type { AnalysisResultSuccess } from "../../shared/types";
import { calculateTotalScore } from "./lib";

export class Panel {
  public static injectPanel(result: AnalysisResultSuccess, messageId: string): void {
    document.getElementById("spoof-panel")?.remove();
    Panel.ensurePanelStyles();

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
      "[data-action='close']",
    );
    closeButton?.addEventListener("click", () => {
      panel.remove();
    });

    const ignoreButton = panel.querySelector<HTMLButtonElement>(
      "[data-action='ignore']",
    );
    ignoreButton?.addEventListener("click", () => {
      Panel.ignoreMessage(messageId);
      panel.remove();
    });

    const emailBody = document.querySelector(".a3s");
    emailBody?.prepend(panel);
  }

  public static injectErrorPanel(errorMessage: string, messageId: string): void {
    document.getElementById("spoof-panel")?.remove();
    Panel.ensurePanelStyles();

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
      "[data-action='close']",
    );
    closeButton?.addEventListener("click", () => {
      panel.remove();
    });

    const ignoreButton = panel.querySelector<HTMLButtonElement>(
      "[data-action='ignore']",
    );
    ignoreButton?.addEventListener("click", () => {
      Panel.ignoreMessage(messageId);
      panel.remove();
    });

    const emailBody = document.querySelector(".a3s");
    emailBody?.prepend(panel);
  }

  public static isMessageIgnored(messageId: string): boolean {
    return Panel.ignoredMessageIds.has(messageId);
  }

  private static ignoreMessage(messageId: string): void {
    Panel.ignoredMessageIds.add(messageId);
  }

  private static ensurePanelStyles(): void {
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

  private static readonly ignoredMessageIds = new Set<string>();
}
