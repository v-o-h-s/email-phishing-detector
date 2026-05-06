import { describe, expect, test } from "bun:test";
import analyzeAuthChecks from "../src/background/layers/authChecks";
import { AnalysisLayers } from "../src/shared/types";

describe("analyzeAuthChecks", () => {
  test("returns reasons and score for SPF/DKIM/DMARC failures", async () => {
    const result = await analyzeAuthChecks(
      "Authentication-Results: spf=fail dkim=none dmarc=fail",
    );

    const reasons = result.reasons[AnalysisLayers.AUTH_CHECKS] ?? [];
    const score = result.scores[AnalysisLayers.AUTH_CHECKS];

    expect(score).toBeGreaterThan(0);
    expect(reasons.join(" ")).toContain("SPF");
    expect(reasons.join(" ")).toContain("DKIM");
    expect(reasons.join(" ")).toContain("DMARC");
  });

  test("returns zero score when auth header is missing", async () => {
    const result = await analyzeAuthChecks(null);
    const reasons = result.reasons[AnalysisLayers.AUTH_CHECKS] ?? [];
    const score = result.scores[AnalysisLayers.AUTH_CHECKS];

    expect(score).toBe(0);
    expect(reasons.join(" ")).toContain("auth checks skipped");
  });
});
