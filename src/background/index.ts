import type {
  AnalysisResult,
  AnalysisResultSuccess,
  AnalysisSnapshot,
  ExtensionMessage,
} from "../shared/types";
import { AnalysisLayers } from "../shared/types";
import analyzeAuthChecks from "./layers/authChecks";
import analyzeReplyTo from "./layers/replyTo";
import analyzeDisplayName from "./layers/displayName";
import analyzeLookalikeDomain from "./layers/lookalikeDomain";
import analyzeTimezone from "./layers/timezone";
import analyzeReceivedChain from "./layers/receivedChain";
import analyzeDomainAge from "./layers/domainAge";

const STORAGE_KEY_LATEST = "latestAnalysis";

async function handleAnalyzeEmail(
  message: Extract<ExtensionMessage, { type: "ANALYZE_EMAIL" }>
): Promise<AnalysisResult> {

  const [authChecks, replyTo, domainAge] = await Promise.all([
    analyzeAuthChecks(message.authHeader),
    analyzeReplyTo(message.fromHeader, message.replyToHeader),
    analyzeDomainAge(message.fromHeader),
  ]);

  const [displayName, lookalike] = await Promise.all([
    analyzeDisplayName(message.fromHeader),
    analyzeLookalikeDomain(message.fromHeader),
  ]);
  const timezone = analyzeTimezone(message.fromHeader, message.dateHeader);
  const receivedChain = analyzeReceivedChain(message.fromHeader, message.receivedHeaders);

  const result: AnalysisResultSuccess = {
    reasons: {
      // Always include every layer so the popup/panel can show “0” score layers too.
      ...authChecks.reasons,
      [AnalysisLayers.REPLY_TO]: replyTo.reasons,
      [AnalysisLayers.DISPLAY_NAME]: displayName.reasons,
      [AnalysisLayers.LOOKALIKE_DOMAIN]: lookalike.reasons,
      [AnalysisLayers.TIMEZONE]: timezone.reasons,
      [AnalysisLayers.RECEIVED_CHAIN]: receivedChain.reasons,
      [AnalysisLayers.DOMAIN_AGE]: domainAge.reasons,
    },
    scores: {
      // Always include every layer so the popup/panel can show “0” score layers too.
      ...authChecks.scores,
      [AnalysisLayers.REPLY_TO]: replyTo.score,
      [AnalysisLayers.DISPLAY_NAME]: displayName.score,
      [AnalysisLayers.LOOKALIKE_DOMAIN]: lookalike.score,
      [AnalysisLayers.TIMEZONE]: timezone.score,
      [AnalysisLayers.RECEIVED_CHAIN]: receivedChain.score,
      [AnalysisLayers.DOMAIN_AGE]: domainAge.score,
    },
  };

  const snapshot = toSnapshot(result);
  await chrome.storage.local.set({ [STORAGE_KEY_LATEST]: snapshot });

  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const typedMessage = message as ExtensionMessage;
  if (typedMessage.type === "ANALYZE_EMAIL") {
    handleAnalyzeEmail(typedMessage)
      .then((result) => sendResponse(result))
      .catch((error: Error) => {
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (typedMessage.type === "GET_ANALYSIS") {
    chrome.storage.local
      .get(STORAGE_KEY_LATEST)
      .then((data) => {
        const payload = (data[STORAGE_KEY_LATEST] as AnalysisSnapshot | undefined) ?? null;
        const response: ExtensionMessage = { type: "ANALYSIS_RESULT", payload };
        sendResponse(response);
      })
      .catch(() => {
        const response: ExtensionMessage = { type: "ANALYSIS_RESULT", payload: null };
        sendResponse(response);
      });
    return true;
  }

  return false;
});

function toSnapshot(result: AnalysisResultSuccess): AnalysisSnapshot {
  const score = Object.values(result.scores).reduce((t, v) => t + (v ?? 0), 0);
  const status: AnalysisSnapshot["status"] =
    score >= 60 ? "danger" : score >= 30 ? "warning" : "safe";
  return {
    status,
    score: Math.min(score, 100),
    reasons: result.reasons,
    scores: result.scores,
    detectedAt: Date.now(),
  };
}
