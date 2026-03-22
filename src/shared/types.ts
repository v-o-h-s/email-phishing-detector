export enum AnalysisLayers {
  AUTH_CHECKS = "checking spf/dmarc",
  REPLY_TO = "reply-to mismatch",
}

export interface AnalysisResultSuccess {
  reasons: Partial<Record<AnalysisLayers, string[]>>;
  scores: Partial<Record<AnalysisLayers, number>>;
}
export interface AnalysisResultFail {
  error: string;
}
export type AnalysisResult = AnalysisResultFail | AnalysisResultSuccess;

export type ExtensionMessage =
  | {
      type: "ANALYZE_EMAIL";
      authHeader?: string | null;
      fromHeader?: string | null;
      replyToHeader?: string | null;
    }
  | { type: "GET_ANALYSIS" }
  | { type: "ANALYSIS_RESULT"; payload: any };

export interface SpoofingAnalysis {
  status: "idle" | "safe" | "warning" | "danger" | "checking";
  score: number;
  reasons: string[];
  detectedAt?: number;
}
