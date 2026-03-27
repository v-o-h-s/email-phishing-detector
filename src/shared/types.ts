export enum AnalysisLayers {
  AUTH_CHECKS = "checking spf/dmarc",
  REPLY_TO = "reply-to mismatch",
  DISPLAY_NAME = "display name spoofing",
  LOOKALIKE_DOMAIN = "lookalike domain",
  DOMAIN_AGE = "domain age",
  TIMEZONE = "timezone mismatch",
  RECEIVED_CHAIN = "received chain anomalies",
}

export interface AnalysisResultSuccess {
  reasons: Partial<Record<AnalysisLayers, string[]>>;
  scores: Partial<Record<AnalysisLayers, number>>;
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
}

export type ExtensionMessage =
  | {
      type: "ANALYZE_EMAIL";
      authHeader?: string | null;
      fromHeader?: string | null;
      replyToHeader?: string | null;
      dateHeader?: string | null;
      receivedHeaders?: string[] | null;
    }
  | { type: "GET_ANALYSIS" }
  | { type: "ANALYSIS_RESULT"; payload: AnalysisSnapshot | null };

export interface SpoofingAnalysis {
  status: "idle" | "safe" | "warning" | "danger" | "checking";
  score: number;
  reasons: string[];
  detectedAt?: number;
}
