type LayerScore = {
  score: number;
  reasons: string[];
};

const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "short.io",
]);

export default async function analyzeUrls(
  links: string[],
  safeBrowsingApiKey: string,
): Promise<LayerScore> {
  if (!links.length) {
    return { score: 0, reasons: ["No links found"] };
  }

  const reasons: string[] = [
    `Scanned ${links.length} URL(s): ${links.slice(0, 3).join(", ")}${links.length > 3 ? ", ..." : ""}`,
  ];
  let score = 0;

  const shortened = links.filter((url) => {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      return URL_SHORTENERS.has(host);
    } catch {
      return false;
    }
  });

  if (shortened.length) {
    const shortenedScore = Math.min(shortened.length * 8, 20);
    score += shortenedScore;
    reasons.push(
      `${shortened.length} shortened URL(s) detected (${shortened.slice(0, 3).join(", ")}${
        shortened.length > 3 ? ", ..." : ""
      })`,
    );
  }

  const nonHttpsCount = links.filter((url) => url.toLowerCase().startsWith("http://")).length;
  if (nonHttpsCount) {
    score += Math.min(nonHttpsCount * 5, 10);
    reasons.push(`${nonHttpsCount} non-HTTPS URL(s) detected`);
  }

  try {
    if (!safeBrowsingApiKey.trim()) {
      const hint =
        reasons.length > 0
          ? "Safe Browsing reputation check skipped (no API key)."
          : "No Safe Browsing API key — add one in settings to scan link reputation.";
      return {
        score: Math.min(score, 50),
        reasons: reasons.length > 0 ? [...reasons, hint] : [hint],
      };
    }
    const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingApiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client: { clientId: "email-phishing-detector", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: links.map((url) => ({ url })),
        },
      }),
    });

    if (!response.ok) {
      return { score: 0, reasons: ["URL scan unavailable"] };
    }

    const data = (await response.json()) as { matches?: unknown[] };
    const matchCount = data.matches?.length ?? 0;
    if (matchCount > 0) {
      score += 40;
      reasons.push(`${matchCount} URL(s) matched Google Safe Browsing threats`);
    } else {
      reasons.push("Test passed: no Safe Browsing threat matches found.");
    }
  } catch {
    return { score: 0, reasons: ["URL scan unavailable"] };
  }

  return { score: Math.min(score, 50), reasons };
}
