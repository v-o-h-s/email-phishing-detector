import { describe, expect, test } from "bun:test";
import { AnalysisLayers, type AnalysisResultSuccess } from "../src/shared/types";
import { calculateCompositeScore, getStatus } from "../src/shared/scoring";

type Scores = AnalysisResultSuccess["scores"];

describe("calculateCompositeScore – Noisy-OR + Tiered Bonuses", () => {
  test("returns 0 when all layers are zero", () => {
    const scores: Scores = {};
    expect(calculateCompositeScore(scores)).toBe(0);
  });

  test("single layer at max cap maps to ~weight × 100", () => {
    // authChecks cap=40, weight=0.40 → composite ≈ 40
    const scores: Scores = { [AnalysisLayers.AUTH_CHECKS]: 40 };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(40);
  });

  test("single weak layer stays low", () => {
    // qrWarning cap=8, weight=0.08 → composite ≈ 8
    const scores: Scores = { [AnalysisLayers.QR_WARNING]: 8 };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(8);
  });

  test("single partially triggered layer is proportional", () => {
    // domainAge at half cap (7.5 → 7/15=0.467, * 0.15 ≈ 0.07 → ~7)
    const scores: Scores = { [AnalysisLayers.DOMAIN_AGE]: 8 };
    const result = calculateCompositeScore(scores);
    // 8/15 = 0.533, * 0.15 = 0.08 → composite ≈ 8
    expect(result).toBeGreaterThanOrEqual(7);
    expect(result).toBeLessThanOrEqual(9);
  });

  test("two independent layers compound multiplicatively", () => {
    // authChecks(40) + replyTo(20)
    // p_auth = 0.40, p_reply = 0.20
    // P = 1 - 0.60*0.80 = 1 - 0.48 = 0.52 → 52
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.REPLY_TO]: 20,
    };
    const result = calculateCompositeScore(scores);
    // Not high-tier (replyTo isn't), so no bonus.
    expect(result).toBe(52);
  });

  test("three layers including weak signal", () => {
    // authChecks(40) + replyTo(20) + timezone(8)
    // p_auth=0.40, p_reply=0.20, p_tz=0.08
    // P = 1 - 0.60*0.80*0.92 = 1 - 0.4416 = 0.5584 → 56
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.REPLY_TO]: 20,
      [AnalysisLayers.TIMEZONE]: 8,
    };
    const result = calculateCompositeScore(scores);
    expect(result).toBeGreaterThanOrEqual(55);
    expect(result).toBeLessThanOrEqual(57);
  });

  test("score is clamped to 100 even with all layers at max", () => {
    const scores: Scores = {
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
    const result = calculateCompositeScore(scores);
    expect(result).toBeLessThanOrEqual(100);
    expect(result).toBeGreaterThanOrEqual(90);
  });

  test("partially-triggered layer scales linearly", () => {
    // urlScan: shortened URLs give max 20 out of cap 50
    // p = 20/50 * 0.50 = 0.20 → composite ≈ 20
    const scores: Scores = { [AnalysisLayers.urlScan]: 20 };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(20);
  });
});

describe("calculateCompositeScore – Tiered Compounding Bonus (Option C)", () => {
  test("no bonus when only one high-tier layer fires strongly", () => {
    // authChecks at full cap: p=0.40 → strongly (≥0.25), but only 1 → no bonus
    const scores: Scores = { [AnalysisLayers.AUTH_CHECKS]: 40 };
    const result = calculateCompositeScore(scores);
    // Should be exactly 40 (no multiplier)
    expect(result).toBe(40);
  });

  test("bonus applies when two high-tier layers fire strongly", () => {
    // authChecks(40, p=0.40) + lookalikeDomain(25, p=0.25) —≥0.25 so both count
    // P = 1 - 0.60*0.75 = 0.55
    // 2 high-tier → ×1.15 → 55 * 1.15 = 63
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.LOOKALIKE_DOMAIN]: 25,
    };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(63);
  });

  test("bonus applies when three high-tier layers fire strongly", () => {
    // authChecks(p=0.40) + lookalikeDomain(p=0.25) + urlScan(p=0.50)
    // P = 1 - 0.60*0.75*0.50 = 1 - 0.225 = 0.775
    // 3 high-tier → ×1.30 → 77.5 * 1.30 = 101 → clamped to 100
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.LOOKALIKE_DOMAIN]: 25,
      [AnalysisLayers.urlScan]: 50,
    };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(100);
  });

  test("weak high-tier signal below threshold does not count for bonus", () => {
    // authChecks(40, p=0.40 ≥0.25 ✓) + bodyAnalysis("medium" risk, p=18/30*0.30=0.18 <0.25 ✗)
    // Only 1 high-tier → no bonus
    // P = 1 - 0.60*(1-0.18) = 1 - 0.60*0.82 = 1 - 0.492 = 0.508 → 51
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.bodyAnalysis]: 18,
    };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(51);
  });

  test("four high-tier layers all strongly firing gets max bonus", () => {
    // authChecks(40,p=0.40) + lookalike(25,p=0.25) + urlScan(50,p=0.50) + bodyAnalysis(30,p=0.30)
    // P = 1 - 0.60*0.75*0.50*0.70 = 1 - 0.1575 = 0.8425
    // 4 high-tier → ×1.45 → 84.25*1.45 = 122 → clamped to 100
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 40,
      [AnalysisLayers.LOOKALIKE_DOMAIN]: 25,
      [AnalysisLayers.urlScan]: 50,
      [AnalysisLayers.bodyAnalysis]: 30,
    };
    const result = calculateCompositeScore(scores);
    expect(result).toBe(100);
  });

  test("SPF-only partial auth does not trigger high-tier for bonus alone", () => {
    // authChecks partial: SPF none=5 (p=5/40*0.40=0.05 <0.25) + displayName(15,p=0.15)
    // P = 1 - 0.95*0.85 = 1 - 0.8075 = 0.1925 → 19
    const scores: Scores = {
      [AnalysisLayers.AUTH_CHECKS]: 5,
      [AnalysisLayers.DISPLAY_NAME]: 15,
    };
    const result = calculateCompositeScore(scores);
    // Neither is high-tier qualified for bonus
    expect(result).toBeGreaterThanOrEqual(19);
    expect(result).toBeLessThanOrEqual(20);
  });
});

describe("getStatus", () => {
  test("score 0 → safe", () => expect(getStatus(0)).toBe("safe"));
  test("score 29 → safe", () => expect(getStatus(29)).toBe("safe"));
  test("score 30 → warning", () => expect(getStatus(30)).toBe("warning"));
  test("score 59 → warning", () => expect(getStatus(59)).toBe("warning"));
  test("score 60 → danger", () => expect(getStatus(60)).toBe("danger"));
  test("score 100 → danger", () => expect(getStatus(100)).toBe("danger"));
});
