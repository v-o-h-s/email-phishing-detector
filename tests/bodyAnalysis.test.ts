import { afterEach, describe, expect, test, spyOn } from "bun:test";
import analyzeEmailBody from "../src/background/layers/bodyAnalysis";

describe("analyzeEmailBody", () => {
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | null = null;

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = null;
  });

  test("returns zero for short body", async () => {
    const result = await analyzeEmailBody("too short", "test-key", true);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test("maps high risk response to score and reasons", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      tactics_found: ["Urgent account closure threat"],
                      risk_level: "high",
                      summary: "The message uses pressure and credential harvesting language.",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await analyzeEmailBody(
      "Your account will be closed in 24 hours unless you verify credentials now.",
      "test-key",
      true,
    );

    expect(result.score).toBe(30);
    expect(result.reasons.some((reason) => reason.includes("Manipulation tactic"))).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("pressure"))).toBe(true);
  });

  test("returns fallback when response body is not JSON", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const result = await analyzeEmailBody(
      "This is a long enough email body content for parser failure testing in AI analysis.",
      "test-key",
      true,
    );
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain("Body analysis failed");
  });

  test("skips when Gemini key is empty", async () => {
    const result = await analyzeEmailBody(
      "This is a long enough email body content for testing empty API key handling.",
      "",
      true,
    );
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain("Gemini API key");
  });

  test("returns consent message when gemini is disabled", async () => {
    const result = await analyzeEmailBody(
      "This is long enough for analysis and demonstrates permission gating behavior.",
      "test-key",
      false,
    );
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain("Gemini consent");
  });
});
