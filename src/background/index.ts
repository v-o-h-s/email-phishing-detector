import {
  type ExtensionMessage,
  type AnalysisResult,
  AnalysisLayers,
} from "../shared/types";
function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response?: AnalysisResult) => void,
): void {
  if (message.type === "ANALYZE_EMAIL") {
    sendResponse({
      reasons: ["Placeholder reason"],
      scores: { [AnalysisLayers.SPOOFING]: 20 },
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message as ExtensionMessage, sendResponse);
  return true;
});
