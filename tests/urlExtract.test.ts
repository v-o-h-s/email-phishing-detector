import { describe, expect, test } from "bun:test";
import {
  extractHttpUrlsFromText,
  mergeUniqueUrls,
  unwrapGoogleRedirectUrl,
} from "../src/shared/urlExtract";

describe("urlExtract", () => {
  test("finds URLs in plain text", () => {
    const text = `Hello visit https://cursor.com/loginDeepPage for more info.`;
    const urls = extractHttpUrlsFromText(text);
    expect(urls.some((u) => u.includes("cursor.com"))).toBe(true);
  });

  test("unwraps Google redirect URLs", () => {
    const wrapped =
      "https://www.google.com/url?q=https://evil.test/phish&sa=D&source=hangouts";
    expect(unwrapGoogleRedirectUrl(wrapped)).toBe("https://evil.test/phish");
  });

  test("mergeUniqueUrls dedupes and unwraps", () => {
    const u = mergeUniqueUrls([
      "https://www.google.com/url?q=https://example.com/a",
      "https://example.com/a",
    ]);
    expect(u.length).toBe(1);
    expect(u[0]).toContain("example.com");
  });
});
