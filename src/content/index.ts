import type { AnalysisResult, ExtensionMessage } from "../shared/types";
import {
  extractAuthHeaderFromDom,
  fetchHeadersFromStandardView,
} from "./lib/lib";
import { Panel } from "./lib/panel";

// Log that content script is active
console.log(`[Content Script] Loaded. Extension ID: ${chrome.runtime.id}`);

let lastSeenId: string | null = null;

function mutationCallback(): void {
  const msgEl = document.querySelector("[data-message-id]");
  if (!msgEl) return;

  const messageId = msgEl.getAttribute("data-message-id");
  if (
    !messageId ||
    messageId === lastSeenId ||
    Panel.isMessageIgnored(messageId)
  ) {
    return;
  }
  lastSeenId = messageId;

  void analyzeMessage(msgEl, messageId);
}

async function analyzeMessage(messageElement: Element, messageId: string): Promise<void> {
  const standardHeaders = await fetchHeadersFromStandardView(messageElement);
  const authHeader = standardHeaders?.authHeader ?? extractAuthHeaderFromDom();

  const message: ExtensionMessage = {
    type: "ANALYZE_EMAIL",
    authHeader,
    fromHeader: standardHeaders?.fromHeader ?? null,
    replyToHeader: standardHeaders?.replyToHeader ?? null,
    dateHeader: standardHeaders?.dateHeader ?? null,
    receivedHeaders: standardHeaders?.receivedHeaders ?? [],
  };

  try {
    chrome.runtime.sendMessage(
      message,
      (result?: AnalysisResult) => {
        if (!result) return;
        if ("error" in result) {
          Panel.injectErrorPanel(result.error, messageId, messageElement);
          return;
        }
        Panel.injectPanel(result, messageId, messageElement);
      },
    );
  } catch (err) {
    console.error("[Content] Failed to send message to background:", err);
    Panel.injectErrorPanel("Failed to analyze email", messageId, messageElement);
  }
}

// observe changes in the gmail pages and fires(run the callback) everytime the DOM changes
const observer = new MutationObserver(mutationCallback);
observer.observe(document.body, { childList: true, subtree: true });
console.log("[Content Script] Mutation observer started for Gmail page monitoring");
