type LayerScore = {
  score: number;
  reasons: string[];
};

import { getProtectedDomains } from "../datasets/protectedDomains";

export default async function analyzeLookalikeDomain(
  fromHeader: string | null | undefined,
): Promise<LayerScore> {
  const domain = extractDomainFromHeader(fromHeader);
  if (!domain) return { score: 0, reasons: [] };

  const protectedDomains = await getProtectedDomains();

  // Ignore exact matches (not a lookalike).
  if (protectedDomains.includes(domain)) return { score: 0, reasons: [] };

  const ascii = toAsciiDomain(domain);
  const mixedScript = hasMixedScripts(domain);

  const closest = findClosestProtected(ascii, protectedDomains);
  if (!closest && !mixedScript) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  if (mixedScript) {
    score += 15;
    reasons.push("Domain contains mixed scripts (possible homoglyph attack)");
  }

  if (closest) {
    score += 20;
    reasons.push(`Domain resembles protected domain "${closest}" (possible lookalike)`);
  }

  return { score: Math.min(score, 25), reasons };
}

function extractDomainFromHeader(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const addressMatch = headerValue.match(/<([^>]+)>/);
  const address =
    addressMatch?.[1] ??
    headerValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!address) return null;
  const domain = address.split("@")[1]?.trim().toLowerCase();
  if (!domain) return null;
  return domain.replace(/\.+$/, "");
}

function toAsciiDomain(domain: string): string {
  // Basic normalization only (no punycode conversion here).
  return domain.toLowerCase();
}

function findClosestProtected(domain: string, protectedDomains: string[]): string | null {
  const simplified = simplifyLookalikes(domain);
  let best: { d: string; dist: number } | null = null;
  for (const protectedDomain of protectedDomains) {
    const dist = levenshtein(simplified, simplifyLookalikes(protectedDomain));
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { d: protectedDomain, dist };
    }
  }
  return best?.d ?? null;
}

function simplifyLookalikes(input: string): string {
  return input
    .toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "l")
    .replace(/[3]/g, "e")
    .replace(/[5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/rn/g, "m");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        (dp[j] ?? 0) + 1,
        (dp[j - 1] ?? 0) + 1,
        prev + cost,
      );
      prev = tmp;
    }
  }
  return dp[n] ?? n;
}

function hasMixedScripts(domain: string): boolean {
  // Rough heuristic: detect mixing ASCII letters/digits with non-ASCII letters.
  const hasAscii = /[a-z0-9]/i.test(domain);
  const hasNonAsciiLetter = /[^\x00-\x7F]/.test(domain);
  return hasAscii && hasNonAsciiLetter;
}

