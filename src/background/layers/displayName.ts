import { getFreemailDomains } from "../datasets/freemailDomains";

type LayerScore = {
  score: number;
  reasons: string[];
};

export default async function analyzeDisplayName(
  fromHeader: string | null | undefined,
): Promise<LayerScore> {
  const parsed = parseFromHeader(fromHeader);
  if (!parsed) return { score: 0, reasons: [] };

  const { displayName, domain } = parsed;
  if (!displayName) return { score: 0, reasons: [] };

  const display = displayName.trim();
  if (display.length < 3) return { score: 0, reasons: [] };

  const freeEmailDomains = await getFreemailDomains();
  if (!freeEmailDomains.has(domain)) {
    return { score: 0, reasons: [] };
  }

  const looksLikeBrand = containsBrandLikeTokens(display);
  if (!looksLikeBrand) return { score: 0, reasons: [] };

  return {
    score: 15,
    reasons: [
      `Display name looks like an organization but sender uses freemail (${display} <*@${domain}>)`,
    ],
  };
}

function parseFromHeader(
  headerValue: string | null | undefined,
): { displayName: string | null; domain: string } | null {
  if (!headerValue) return null;

  // Examples:
  // From: "PayPal Support" <user@gmail.com>
  // From: PayPal Support <user@gmail.com>
  // From: user@gmail.com
  const emailMatch =
    headerValue.match(/<([^>]+)>/)?.[1] ??
    headerValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!emailMatch) return null;

  const domain = emailMatch.split("@")[1]?.toLowerCase().replace(/\.+$/, "");
  if (!domain) return null;

  const namePart = headerValue.split("<")[0]?.replace(/^From:\s*/i, "").trim();
  const unquoted = namePart?.replace(/^"(.*)"$/, "$1").trim();
  const displayName = unquoted && unquoted !== emailMatch ? unquoted : null;

  return { displayName, domain };
}

function containsBrandLikeTokens(displayName: string): boolean {
  const normalized = displayName.toLowerCase();
  const suspiciousTokens = [
    "support",
    "security",
    "billing",
    "invoice",
    "verification",
    "verify",
    "team",
    "service",
    "account",
    "payments",
    "pay",
    "bank",
    "admin",
    "helpdesk",
  ];
  return suspiciousTokens.some((t) => normalized.includes(t));
}

