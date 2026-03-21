export enum AnalysisLayers {
  SPOOFING = "spoofing",
}

export interface AnalysisResult {
  reasons: string[];
  scores: Partial<Record<AnalysisLayers, number>>;
}

export interface ExtensionMessage {
  type: "ANALYZE_EMAIL";
  dataMessageId: string;
}
