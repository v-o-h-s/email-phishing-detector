type ReplyToScore = {
  score: number;
  reasons: string[];
};

export default function analyzeReplyTo(
  fromHeader: string | null | undefined,
  replyToHeader: string | null | undefined,
): ReplyToScore {
  const fromDomain = extractDomain(fromHeader);
  const replyToDomain = extractDomain(replyToHeader);

  if (!fromDomain || !replyToDomain) {
    return { score: 0, reasons: [] };
  }

  if (
    isSameOrSubdomain(replyToDomain, fromDomain) ||
    isSameOrSubdomain(fromDomain, replyToDomain)
  ) {
    return {
      score: 0,
      reasons: [
        `Reply-To matches From domain (from: ${fromDomain}, reply-to: ${replyToDomain})`,
      ], 
    };
  }

  return {
    score: 20,
    reasons: [
      `Reply-To domain differs from From domain (from: ${fromDomain}, reply-to: ${replyToDomain})`,
    ],
  };
}

function extractDomain(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const addressMatch = headerValue.match(/<([^>]+)>/);
  const address =
    addressMatch?.[1] ??
    headerValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!address) return null;
  const domain = address.split("@")[1]?.trim();
  if (!domain) return null;
  return normalizeDomain(domain);
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.+$/, "");
}

function isSameOrSubdomain(domain: string, base: string): boolean {
  return domain === base || domain.endsWith(`.${base}`);
}
