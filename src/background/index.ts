import type { ExtensionMessage, AnalysisResult } from "../shared/types";
import analyzeSpoofing from "./layers/spoofing";

async function handleAnalyzeEmail(message: Extract<ExtensionMessage, { type: "ANALYZE_EMAIL" }>): Promise<AnalysisResult> {
  return analyzeSpoofing(message.authHeader);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const typedMessage = message as ExtensionMessage;
  if (typedMessage.type !== "ANALYZE_EMAIL") return false;
  handleAnalyzeEmail(typedMessage)
    .then((result) => sendResponse(result))
    .catch((error: Error) => {
      sendResponse({ error: error.message });
    });
  return true;
});
