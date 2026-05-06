export enum AnalysisLayers {
  AUTH_CHECKS = "checking spf/dmarc",
  REPLY_TO = "reply-to mismatch",
  DISPLAY_NAME = "display name spoofing",
  LOOKALIKE_DOMAIN = "lookalike domain",
  DOMAIN_AGE = "domain age",
  TIMEZONE = "timezone mismatch",
  RECEIVED_CHAIN = "received chain anomalies",
  urlScan = "url-scan",
  bodyAnalysis = "body-analysis",
  TRACKING_PIXEL = "tracking pixel detector",
  QR_WARNING = "qr code warning",
}

export interface SenderReputationSummary {
  domain: string;
  firstContact: boolean;
  knownSafeSender: boolean;
  cleanCount: number;
  seenCount: number;
}

export interface AnalysisMeta {
  senderDomain?: string | null;
  reportUrl?: string | null;
  domainAgeDays?: number | null;
  hasImages?: boolean;
  senderReputation?: SenderReputationSummary | null;
}

export interface AnalysisResultSuccess {
  reasons: Partial<Record<AnalysisLayers, string[]>>;
  scores: Partial<Record<AnalysisLayers, number>>;
  meta?: AnalysisMeta;
}
export interface AnalysisResultFail {
  error: string;
}
export type AnalysisResult = AnalysisResultFail | AnalysisResultSuccess;

export interface AnalysisSnapshot {
  status: "idle" | "safe" | "warning" | "danger" | "checking";
  score: number;
  reasons: Partial<Record<AnalysisLayers, string[]>>;
  scores: Partial<Record<AnalysisLayers, number>>;
  detectedAt: number;
  meta?: AnalysisMeta;
}

export type ExtensionMessage =
  | {
      type: "ANALYZE_EMAIL";
      authHeader?: string | null;
      fromHeader?: string | null;
      replyToHeader?: string | null;
      dateHeader?: string | null;
      receivedHeaders?: string[] | null;
      links: string[];
      bodyText: string;
      imageInfo?: {
        totalImages: number;
        trackingLikeImages: number;
        externalImages: number;
        qrLikeImages?: number;
      };
    }
  | { type: "GET_ANALYSIS" }
  | { type: "ANALYSIS_RESULT"; payload: AnalysisSnapshot | null }
  | { type: "GET_SETTINGS" }
  | { type: "SETTINGS_RESULT"; payload: ExtensionSettings }
  | { type: "UPDATE_SETTINGS"; payload: Partial<ExtensionSettings> };

export interface SpoofingAnalysis {
  status: "idle" | "safe" | "warning" | "danger" | "checking";
  score: number;
  reasons: string[];
  detectedAt?: number;
}

export interface ExtensionSettings {
  extensionEnabled: boolean;
  geminiConsent: boolean;
  layerEnabled: Partial<Record<AnalysisLayers, boolean>>;
  apiKeys: {
    safeBrowsing: string;
    gemini: string;
  };
}
