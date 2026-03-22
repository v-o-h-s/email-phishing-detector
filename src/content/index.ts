import type { AnalysisResult, ExtensionMessage } from "../shared/types";
import {
  extractAuthHeaderFromDom,
  fetchAuthHeaderFromStandardView,
} from "./lib/lib";
import { Panel } from "./lib/panel";
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
        Panel.injectErrorPanel(result.error, messageId);
        return;
      }
      Panel.injectPanel(result, messageId);
    },
  );
}

// observe changes in the gmail pages and fires(run the callback) everytime the DOM changes
const observer = new MutationObserver(mutationCallback);
observer.observe(document.body, { childList: true, subtree: true });
