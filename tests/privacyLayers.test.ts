import { describe, expect, test } from "bun:test";
import analyzeTrackingPixel from "../src/background/layers/trackingPixel";
import analyzeQrWarning from "../src/background/layers/qrWarning";

describe("privacy-related layers", () => {
  test("tracking pixel layer scores small/external images", () => {
    const result = analyzeTrackingPixel({
      totalImages: 3,
      trackingLikeImages: 1,
      externalImages: 2,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.join(" ")).toContain("tracking-like");
  });

  test("tracking pixel layer does not score normal external images alone", () => {
    const result = analyzeTrackingPixel({
      totalImages: 4,
      trackingLikeImages: 0,
      externalImages: 4,
    });
    expect(result.score).toBe(0);
    expect(result.reasons.join(" ")).toContain("Test passed");
  });

  test("qr warning layer flags only qr-like images", () => {
    const result = analyzeQrWarning({ totalImages: 2, qrLikeImages: 1 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("QR");
  });

  test("qr warning layer stays green for regular images", () => {
    const result = analyzeQrWarning({ totalImages: 2, qrLikeImages: 0 });
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain("none look like a QR code");
  });
});
