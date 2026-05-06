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
    expect(result.reasons[0]).toContain("Test passed");
  });

  test("flags different mailbox on identical domain (e.g. two Gmail addresses)", () => {
    const result = analyzeReplyTo(
      `"serie" <hacene.serine1@gmail.com>`,
      "serine@gmail.com",
    );

    expect(result.score).toBe(15);
    expect(result.reasons[0]).toContain("different mailbox");
  });

  test("flags name mismatch even when mailbox is same", () => {
    const result = analyzeReplyTo(
      "\"Google Security\" <security@gmail.com>",
      "\"Support Team\" <security@gmail.com>",
    );
    expect(result.score).toBe(8);
    expect(result.reasons[0]).toContain("names differ");
  });
});
