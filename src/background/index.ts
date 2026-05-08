import type {
  AnalysisLayers as AnalysisLayerKeys,
  AnalysisResult,
  AnalysisResultSuccess,
  AnalysisSnapshot,
  ExtensionSettings,
  ExtensionMessage,
  SenderReputationSummary,
} from "../shared/types";
import { AnalysisLayers } from "../shared/types";
import { DEFAULT_SETTINGS, mergeSettings, SETTINGS_STORAGE_KEY } from "../shared/settings";
import { calculateCompositeScore, getStatus } from "../shared/scoring";
import analyzeAuthChecks from "./layers/authChecks";
import analyzeReplyTo from "./layers/replyTo";
import analyzeDisplayName from "./layers/displayName";
import analyzeLookalikeDomain from "./layers/lookalikeDomain";
import analyzeTimezone from "./layers/timezone";
import analyzeReceivedChain from "./layers/receivedChain";
import analyzeDomainAge from "./layers/domainAge";
import analyzeUrls from "./layers/urlScan";
import analyzeEmailBody from "./layers/bodyAnalysis";
import analyzeTrackingPixel from "./layers/trackingPixel";
import analyzeQrWarning from "./layers/qrWarning";

const STORAGE_KEY_LATEST = "latestAnalysis";
const STORAGE_KEY_REPUTATION = "senderReputationByDomain";

type SenderReputationRecord = {
  seenCount: number;
  cleanCount: number;
  lastScore: number;
  lastSeenAt: number;
};

async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return mergeSettings(data[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined);
}

async function updateSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const merged = mergeSettings({
    ...current,
    ...patch,
    apiKeys: {
      ...current.apiKeys,
      ...(patch.apiKeys ?? {}),
    },
    layerEnabled: {
      ...current.layerEnabled,
      ...(patch.layerEnabled ?? {}),
    },
  });
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: merged });
  return merged;
}

function isLayerEnabled(
  settings: ExtensionSettings,
  layer: AnalysisLayerKeys,
): boolean {
  return settings.layerEnabled[layer] ?? true;
}

function extractSenderDomain(fromHeader: string | null | undefined): string | null {
  if (!fromHeader) return null;
  const addressMatch = fromHeader.match(/<([^>]+)>/);
  const address =
    addressMatch?.[1] ??
    fromHeader.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!address) return null;
  return address.split("@")[1]?.trim().toLowerCase().replace(/\.+$/, "") ?? null;
}

function createReportUrl(domain: string | null): string | null {
  if (!domain) return null;
  const url = `http://${domain}`;
  return `https://safebrowsing.google.com/safebrowsing/report_phish/?url=${encodeURIComponent(url)}`;
}

async function updateSenderReputation(
  senderDomain: string | null,
  totalScore: number,
): Promise<SenderReputationSummary | null> {
  if (!senderDomain) return null;
  const data = await chrome.storage.local.get(STORAGE_KEY_REPUTATION);
  const map = (data[STORAGE_KEY_REPUTATION] as Record<string, SenderReputationRecord> | undefined) ?? {};
  const current = map[senderDomain] ?? {
    seenCount: 0,
    cleanCount: 0,
    lastScore: 0,
    lastSeenAt: 0,
  };

  const seenCount = current.seenCount + 1;
  const cleanCount = current.cleanCount + (totalScore === 0 ? 1 : 0);
  map[senderDomain] = {
    seenCount,
    cleanCount,
    lastScore: totalScore,
    lastSeenAt: Date.now(),
  };
  await chrome.storage.local.set({ [STORAGE_KEY_REPUTATION]: map });

  return {
    domain: senderDomain,
    firstContact: seenCount === 1,
    knownSafeSender: seenCount >= 10 && cleanCount >= 10,
    cleanCount,
    seenCount,
  };
}

async function handleAnalyzeEmail(
  message: Extract<ExtensionMessage, { type: "ANALYZE_EMAIL" }>
): Promise<AnalysisResult> {
  const settings = await getSettings();
  if (!settings.extensionEnabled) {
    const disabled: AnalysisResultSuccess = {
      reasons: {
        [AnalysisLayers.AUTH_CHECKS]: ["Extension disabled in settings."],
      },
      scores: {
        [AnalysisLayers.AUTH_CHECKS]: 0,
      },
    };
    return disabled;
  }

  const senderDomain = extractSenderDomain(message.fromHeader);
  const reportUrl = createReportUrl(senderDomain);

  const [authChecks, replyTo, domainAge, urlScan, bodyAnalysis, trackingPixel, qrWarning] = await Promise.all([
    isLayerEnabled(settings, AnalysisLayers.AUTH_CHECKS)
      ? analyzeAuthChecks(message.authHeader)
      : Promise.resolve({ reasons: { [AnalysisLayers.AUTH_CHECKS]: [] }, scores: { [AnalysisLayers.AUTH_CHECKS]: 0 } }),
    isLayerEnabled(settings, AnalysisLayers.REPLY_TO)
      ? Promise.resolve(analyzeReplyTo(message.fromHeader, message.replyToHeader))
      : Promise.resolve({ score: 0, reasons: [] }),
    isLayerEnabled(settings, AnalysisLayers.DOMAIN_AGE)
      ? analyzeDomainAge(message.fromHeader)
      : Promise.resolve({ score: 0, reasons: [], ageDays: null }),
    isLayerEnabled(settings, AnalysisLayers.urlScan)
      ? analyzeUrls(message.links ?? [], settings.apiKeys.safeBrowsing)
      : Promise.resolve({ score: 0, reasons: [] }),
    isLayerEnabled(settings, AnalysisLayers.bodyAnalysis)
      ? analyzeEmailBody(
        message.bodyText ?? "",
        settings.apiKeys.gemini,
        settings.geminiConsent,
      )
      : Promise.resolve({ score: 0, reasons: [] }),
    isLayerEnabled(settings, AnalysisLayers.TRACKING_PIXEL)
      ? Promise.resolve(analyzeTrackingPixel(message.imageInfo))
      : Promise.resolve({ score: 0, reasons: [] }),
    isLayerEnabled(settings, AnalysisLayers.QR_WARNING)
      ? Promise.resolve(analyzeQrWarning(message.imageInfo))
      : Promise.resolve({ score: 0, reasons: [] }),
  ]);

  const [displayName, lookalike] = await Promise.all([
    isLayerEnabled(settings, AnalysisLayers.DISPLAY_NAME)
      ? analyzeDisplayName(message.fromHeader)
      : Promise.resolve({ score: 0, reasons: [] }),
    isLayerEnabled(settings, AnalysisLayers.LOOKALIKE_DOMAIN)
      ? analyzeLookalikeDomain(message.fromHeader)
      : Promise.resolve({ score: 0, reasons: [] }),
  ]);
  const timezone = isLayerEnabled(settings, AnalysisLayers.TIMEZONE)
    ? analyzeTimezone(message.fromHeader, message.dateHeader)
    : { score: 0, reasons: [] };
  const receivedChain = isLayerEnabled(settings, AnalysisLayers.RECEIVED_CHAIN)
    ? analyzeReceivedChain(message.fromHeader, message.receivedHeaders)
    : { score: 0, reasons: [] };

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
      [AnalysisLayers.urlScan]: urlScan.reasons,
      [AnalysisLayers.bodyAnalysis]: bodyAnalysis.reasons,
      [AnalysisLayers.TRACKING_PIXEL]: trackingPixel.reasons,
      [AnalysisLayers.QR_WARNING]: qrWarning.reasons,
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
      [AnalysisLayers.urlScan]: urlScan.score,
      [AnalysisLayers.bodyAnalysis]: bodyAnalysis.score,
      [AnalysisLayers.TRACKING_PIXEL]: trackingPixel.score,
      [AnalysisLayers.QR_WARNING]: qrWarning.score,
    },
    meta: {
      senderDomain,
      reportUrl,
      domainAgeDays: domainAge.ageDays ?? null,
      hasImages: (message.imageInfo?.totalImages ?? 0) > 0,
    },
  };

  const total = Object.values(result.scores).reduce((t, v) => t + (v ?? 0), 0);
  result.meta = {
    ...result.meta,
    senderReputation: await updateSenderReputation(senderDomain, total),
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
  if (typedMessage.type === "GET_SETTINGS") {
    getSettings()
      .then((payload) => {
        const response: ExtensionMessage = { type: "SETTINGS_RESULT", payload };
        sendResponse(response);
      })
      .catch(() => {
        const response: ExtensionMessage = { type: "SETTINGS_RESULT", payload: DEFAULT_SETTINGS };
        sendResponse(response);
      });
    return true;
  }
  if (typedMessage.type === "UPDATE_SETTINGS") {
    updateSettings(typedMessage.payload)
      .then((payload) => {
        const response: ExtensionMessage = { type: "SETTINGS_RESULT", payload };
        sendResponse(response);
      })
      .catch(() => {
        const response: ExtensionMessage = { type: "SETTINGS_RESULT", payload: DEFAULT_SETTINGS };
        sendResponse(response);
      });
    return true;
  }

  return false;
});

function toSnapshot(result: AnalysisResultSuccess): AnalysisSnapshot {
  const score = calculateCompositeScore(result.scores);
  return {
    status: getStatus(score),
    score,
    reasons: result.reasons,
    scores: result.scores,
    detectedAt: Date.now(),
    meta: result.meta,
  };
}
