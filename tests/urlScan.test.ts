import { afterEach, describe, expect, test, spyOn } from "bun:test";
import analyzeUrls from "../src/background/layers/urlScan";

describe("analyzeUrls", () => {
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | null = null;

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = null;
  });

  test("returns no links reason when input is empty", async () => {
    const result = await analyzeUrls([], "test-key");
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("No links found");
  });

  test("scores shortened + http links and safe browsing matches", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ matches: [{}, {}] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await analyzeUrls([
      "http://bit.ly/abc",
      "https://tinyurl.com/demo",
      "http://example.com",
    ], "test-key");

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.score).toBe(50);
    expect(result.reasons.some((reason) => reason.includes("shortened URL"))).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("non-HTTPS"))).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("matched Google Safe Browsing"))).toBe(true);
  });

  test("returns fallback result when API fails", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await analyzeUrls(["https://example.com"], "test-key");
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual(["URL scan unavailable"]);
  });

  test("still scores shortened URLs when Safe Browsing key is missing", async () => {
    const result = await analyzeUrls(["https://bit.ly/abc"], "   ");
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.toLowerCase().includes("shortened"))).toBe(true);
    expect(result.reasons.some((r) => r.toLowerCase().includes("api key"))).toBe(true);
  });
});
