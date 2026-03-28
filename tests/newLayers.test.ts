import { describe, expect, test, spyOn } from "bun:test";
import analyzeDisplayName from "../src/background/layers/displayName";
import analyzeLookalikeDomain from "../src/background/layers/lookalikeDomain";
import analyzeTimezone from "../src/background/layers/timezone";
import analyzeReceivedChain from "../src/background/layers/receivedChain";
import analyzeDomainAge from "../src/background/layers/domainAge";

describe("new layers", () => {
  test("display name spoofing flags freemail + org-ish name", () => {
    // Uses cached freemail list. Provide a minimal chrome mock + avoid network by pre-seeding cache.
    const now = Date.now();
    (globalThis as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: async () => ({
            dataset_freemail_domains_v1: { fetchedAt: now, domains: ["gmail.com"] },
          }),
          set: async () => {},
        },
      },
    };
    return analyzeDisplayName('From: "Security Team" <user@gmail.com>').then((result) => {
      expect(result.score).toBeGreaterThan(0);
    });
  });

  test("lookalike domain flags close protected domain", () => {
    const now = Date.now();
    (globalThis as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: async () => ({
            dataset_protected_domains_v1: { fetchedAt: now, domains: ["paypal.com"] },
          }),
          set: async () => {},
        },
      },
    };
    return analyzeLookalikeDomain("From: PayPal <alert@paypa1.com>").then((result) => {
      expect(result.score).toBeGreaterThan(0);
    });
  });

  test("timezone mismatch flags unusual offset for ccTLD", () => {
    const result = analyzeTimezone(
      "From: user@somebank.uk",
      "Date: Fri, 27 Mar 2026 01:25:00 +0800",
    );
    expect(result.score).toBeGreaterThan(0);
  });

  test("received chain flags missing sender domain and private hop", () => {
    const result = analyzeReceivedChain("From: user@company.com", [
      "Received: from localhost (127.0.0.1) by mx.google.com with ESMTP id abc;",
      "Received: from unknown (10.0.0.1) by example with SMTP;",
    ]);
    expect(result.score).toBeGreaterThan(0);
  });

  test("domain age uses RDAP registration event", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          events: [{ eventAction: "registration", eventDate: "2026-03-20T00:00:00Z" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    (globalThis as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {},
        },
      },
    };

    const result = await analyzeDomainAge("From: user@newdomain-example.com");
    expect(fetchSpy).toHaveBeenCalled();
    // Not asserting score exact (depends on now), just that it returns a structured result.
    expect(Array.isArray(result.reasons)).toBe(true);

    (globalThis as { chrome?: unknown }).chrome = originalChrome;
    fetchSpy.mockRestore();
  });
});

