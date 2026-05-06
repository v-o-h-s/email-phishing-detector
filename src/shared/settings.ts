import { AnalysisLayers, type ExtensionSettings } from "./types";

export const SETTINGS_STORAGE_KEY = "extensionSettings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  extensionEnabled: true,
  geminiConsent: false,
  apiKeys: {
    safeBrowsing: "",
    gemini: "",
  },
  layerEnabled: {
    [AnalysisLayers.AUTH_CHECKS]: true,
    [AnalysisLayers.REPLY_TO]: true,
    [AnalysisLayers.DISPLAY_NAME]: true,
    [AnalysisLayers.LOOKALIKE_DOMAIN]: true,
    [AnalysisLayers.DOMAIN_AGE]: true,
    [AnalysisLayers.TIMEZONE]: true,
    [AnalysisLayers.RECEIVED_CHAIN]: true,
    [AnalysisLayers.urlScan]: true,
    [AnalysisLayers.bodyAnalysis]: true,
    [AnalysisLayers.TRACKING_PIXEL]: true,
    [AnalysisLayers.QR_WARNING]: true,
  },
};

export function mergeSettings(partial: Partial<ExtensionSettings> | null | undefined): ExtensionSettings {
  return {
    extensionEnabled: partial?.extensionEnabled ?? DEFAULT_SETTINGS.extensionEnabled,
    geminiConsent: partial?.geminiConsent ?? DEFAULT_SETTINGS.geminiConsent,
    apiKeys: {
      safeBrowsing: partial?.apiKeys?.safeBrowsing ?? DEFAULT_SETTINGS.apiKeys.safeBrowsing,
      gemini: partial?.apiKeys?.gemini ?? DEFAULT_SETTINGS.apiKeys.gemini,
    },
    layerEnabled: {
      ...DEFAULT_SETTINGS.layerEnabled,
      ...(partial?.layerEnabled ?? {}),
    },
  };
}
