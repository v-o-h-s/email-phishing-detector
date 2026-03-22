import type { ExtensionMessage, AnalysisResult, AnalysisResultSuccess } from "../shared/types";
import { AnalysisLayers } from "../shared/types";
import analyzeAuthChecks from "./layers/authChecks";
import analyzeReplyTo from "./layers/replyTo";

async function handleAnalyzeEmail(
  message: Extract<ExtensionMessage, { type: "ANALYZE_EMAIL" }>
): Promise<AnalysisResult> {

  const [authChecks, replyTo] = await Promise.all([
    analyzeAuthChecks(message.authHeader),
    analyzeReplyTo(message.fromHeader, message.replyToHeader),
  ]);

  const result: AnalysisResultSuccess = {
    reasons: {
      ...authChecks.reasons,
      ...(replyTo.reasons.length
        ? { [AnalysisLayers.REPLY_TO]: replyTo.reasons }
        : {}),
    },
    scores: {
      ...authChecks.scores,
      ...(replyTo.reasons.length
        ? { [AnalysisLayers.REPLY_TO]: replyTo.score }
        : {}),
    },
  };

  return result;
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
