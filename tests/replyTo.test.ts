import { describe, expect, test } from "bun:test";
import analyzeReplyTo from "../src/background/layers/replyTo";

describe("analyzeReplyTo", () => {
  test("flags mismatch between From and Reply-To domains", () => {
    const result = analyzeReplyTo(
      "From: Example <user@example.com>",
      "Reply-To: attacker@evil.com",
    );

    expect(result.score).toBe(20);
    expect(result.reasons[0]).toContain("differs");
  });

  test("allows subdomain or parent domain alignment", () => {
    const result = analyzeReplyTo(
      "From: user@alerts.example.com",
      "Reply-To: support@example.com",
    );

    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain("matches");
  });
});
