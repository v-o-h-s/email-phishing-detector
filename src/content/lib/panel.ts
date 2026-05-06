import type { AnalysisResultSuccess, SenderReputationSummary } from "../../shared/types";
import { calculateTotalScore } from "./lib";

export class Panel {
  public static removePanel(): void {
    document.getElementById("spoof-panel")?.remove();
  }

  public static injectPanel(
    result: AnalysisResultSuccess,
    messageId: string,
    messageElement?: Element,
  ): void {
    Panel.removePanel();
    Panel.ensurePanelStyles();

    const totalScore = calculateTotalScore(result.scores);
    const senderDomain = result.meta?.senderDomain ?? null;
    const reportUrl = result.meta?.reportUrl ?? null;
    const ageDays = result.meta?.domainAgeDays;
    const rep = result.meta?.senderReputation;
    const timeline = Panel.renderDomainTimeline(ageDays);
    const reputationBadges = Panel.renderReputationBadges(rep);
    const testItems = Object.entries(result.scores)
      .filter(([, value]) => value != null)
      .map(([layer, value]) => {
        const reasons = result.reasons[layer as keyof typeof result.reasons] ?? [];
        const fallback =
          (value ?? 0) === 0
            ? "Test passed: no suspicious signals detected."
            : "Layer triggered, but no details were returned.";
        const reasonsList = reasons.length
          ? reasons.map((reason) => `<li>${reason}</li>`).join("")
          : `<li>${fallback}</li>`;
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
      ${timeline}
      ${reputationBadges}
      <div class="spoof-section">Tests</div>
      <div class="spoof-tests">${testItems || "<div>No tests available</div>"}</div>
      ${reportUrl && senderDomain ? `
        <div class="spoof-section">Actions</div>
        <a class="spoof-button spoof-link-button" data-action="report" href="${reportUrl}" target="_blank" rel="noopener noreferrer">
          Report as phishing (${senderDomain})
        </a>
      ` : ""}
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
    const reportButton = panel.querySelector<HTMLAnchorElement>("[data-action='report']");
    reportButton?.addEventListener("click", () => {
      // Keep panel open; user may want to inspect details while reporting.
    });

    const target = Panel.getInjectionTarget(messageElement);
    target?.prepend(panel);
  }

  public static injectErrorPanel(
    errorMessage: string,
    messageId: string,
    messageElement?: Element,
  ): void {
    Panel.removePanel();
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

    const target = Panel.getInjectionTarget(messageElement);
    target?.prepend(panel);
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
    .spoof-meta {
      border: 1px solid #27272a;
      padding: 8px;
      margin: 6px 0;
      font-size: 11px;
      color: #d4d4d8;
    }
    .spoof-badges {
      display: flex;
      gap: 8px;
      margin: 6px 0;
      flex-wrap: wrap;
    }
    .spoof-badge {
      border: 1px solid #3f3f46;
      padding: 2px 6px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #a1a1aa;
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
    .spoof-link-button {
      display: inline-block;
      text-decoration: none;
      margin-top: 4px;
    }
  `;
    document.head.appendChild(style);
    
  }

  private static readonly ignoredMessageIds = new Set<string>();

  private static renderDomainTimeline(ageDays?: number | null): string {
    if (ageDays == null) return "";
    if (ageDays < 30) {
      return `<div class="spoof-meta">Domain registered ${ageDays} days ago 🔴</div>`;
    }
    if (ageDays < 180) {
      return `<div class="spoof-meta">Domain registered ${ageDays} days ago 🟠</div>`;
    }
    return `<div class="spoof-meta">Domain registered ${ageDays} days ago 🟢</div>`;
  }

  private static renderReputationBadges(
    rep: SenderReputationSummary | null | undefined,
  ): string {
    if (!rep) return "";
    const badges: string[] = [];
    if (rep.firstContact) badges.push(`<span class="spoof-badge">First contact</span>`);
    if (rep.knownSafeSender) badges.push(`<span class="spoof-badge">Known safe sender</span>`);
    if (!badges.length) return "";
    return `<div class="spoof-badges">${badges.join("")}</div>`;
  }

  private static getInjectionTarget(messageElement?: Element | null): Element | null {
    // Gmail DOM changes frequently; try the known body container first.
    if (messageElement) {
      const within = messageElement.querySelector(".a3s");
      if (within) return within;
      // If `.a3s` isn't present, inject directly into the message element.
      return messageElement;
    }

    const emailBody = document.querySelector(".a3s");
    if (emailBody) return emailBody;

    // Broad fallback for layout changes.
    const main = document.querySelector("[role='main']");
    if (main) return main;

    return document.body;
  }
}
