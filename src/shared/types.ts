export enum AnalysisLayers {
  SPOOFING = "spoofing",
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
  | { type: "ANALYZE_EMAIL"; authHeader?: string | null }
  | { type: "GET_ANALYSIS" }
  | { type: "ANALYSIS_RESULT"; payload: any };

export interface SpoofingAnalysis {
  status: "idle" | "safe" | "warning" | "danger" | "checking";
  score: number;
  reasons: string[];
  detectedAt?: number;
}
