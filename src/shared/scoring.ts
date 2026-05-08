import { AnalysisLayers, type AnalysisResultSuccess } from "./types";

/**
 * Maximum possible raw score per layer (used to normalize to 0..1 probability).
 */
export const LAYER_MAX_CAPS: Record<AnalysisLayers, number> = {
  [AnalysisLayers.AUTH_CHECKS]: 40,
  [AnalysisLayers.REPLY_TO]: 20,
  [AnalysisLayers.DISPLAY_NAME]: 15,
  [AnalysisLayers.LOOKALIKE_DOMAIN]: 25,
  [AnalysisLayers.DOMAIN_AGE]: 15,
  [AnalysisLayers.TIMEZONE]: 8,
  [AnalysisLayers.RECEIVED_CHAIN]: 20,
  [AnalysisLayers.urlScan]: 50,
  [AnalysisLayers.bodyAnalysis]: 30,
  [AnalysisLayers.TRACKING_PIXEL]: 20,
  [AnalysisLayers.QR_WARNING]: 8,
};

/**
 * Per-layer confidence weight (0..1).  A fully-triggered layer contributes
 * roughly `weight × 100` points through the Noisy‑OR combination.
 *
 * Weights are calibrated so that a single isolated layer at its maximum cap
 * maps to approximately the same score the old additive system would give
 * after clamping to 0..100.
 */
export const LAYER_WEIGHTS: Record<AnalysisLayers, number> = {
  [AnalysisLayers.AUTH_CHECKS]: 0.40,
  [AnalysisLayers.REPLY_TO]: 0.20,
  [AnalysisLayers.DISPLAY_NAME]: 0.15,
  [AnalysisLayers.LOOKALIKE_DOMAIN]: 0.25,
  [AnalysisLayers.DOMAIN_AGE]: 0.15,
  [AnalysisLayers.TIMEZONE]: 0.08,
  [AnalysisLayers.RECEIVED_CHAIN]: 0.20,
  [AnalysisLayers.urlScan]: 0.50,
  [AnalysisLayers.bodyAnalysis]: 0.30,
  [AnalysisLayers.TRACKING_PIXEL]: 0.20,
  [AnalysisLayers.QR_WARNING]: 0.08,
};

/**
 * High‑tier layers participate in the tiered compounding bonus (Option C).
 * When ≥2 of these fire strongly (p_i ≥ 0.25) an extra multiplier is applied.
 */
export const HIGH_TIER_LAYERS: ReadonlySet<AnalysisLayers> = new Set([
  AnalysisLayers.AUTH_CHECKS,
  AnalysisLayers.LOOKALIKE_DOMAIN,
  AnalysisLayers.urlScan,
  AnalysisLayers.bodyAnalysis,
]);

/**
 * Minimum per‑layer contribution that counts as “strongly firing” for the
 * tiered bonus.
 */
export const HIGH_TIER_THRESHOLD = 0.25;

/**
 * Tiered‑bonus multipliers indexed by the number of strongly‑firing
 * high‑tier layers.  Index 0 / 1 are 1.0 (no bonus).
 */
const TIER_MULTIPLIERS: ReadonlyArray<number> = [
  1.00, // 0
  1.00, // 1
  1.15, // 2
  1.30, // 3
  1.45, // 4
];

/**
 * Combine per‑layer scores into a composite 0‑100 phishing likelihood using
 * a Noisy‑OR probabilistic model with an optional tiered compounding bonus
 * for high‑reliability signals that co‑occur.
 */
export function calculateCompositeScore(
  scores: AnalysisResultSuccess["scores"],
): number {
  let invProduct = 1;
  let highTierCount = 0;

  for (const layer of Object.values(AnalysisLayers)) {
    const rawScore = scores[layer] ?? 0;
    if (rawScore <= 0) continue;

    const maxCap = LAYER_MAX_CAPS[layer];
    const weight = LAYER_WEIGHTS[layer];

    // Normalize to 0..1, then multiply by confidence weight.
    const p = Math.min(rawScore / maxCap, 1) * weight;

    invProduct *= (1 - p);

    if (HIGH_TIER_LAYERS.has(layer) && p >= HIGH_TIER_THRESHOLD) {
      highTierCount++;
    }
  }

  let composite = (1 - invProduct) * 100;

  // Tiered compounding bonus (Option C)
  const tierIdx = Math.min(highTierCount, TIER_MULTIPLIERS.length - 1);
  composite *= TIER_MULTIPLIERS[tierIdx]!;

  return Math.round(Math.min(composite, 100));
}

export function getStatus(score: number): "safe" | "warning" | "danger" {
  if (score >= 60) return "danger";
  if (score >= 30) return "warning";
  return "safe";
}
