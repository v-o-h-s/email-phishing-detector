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
  const fromEmail = extractEmail(fromHeader);
  const replyEmail = extractEmail(replyToHeader);
  const fromName = extractDisplayName(fromHeader);
  const replyName = extractDisplayName(replyToHeader);

  if (!fromDomain || !replyToDomain) {
    return { score: 0, reasons: ["Test passed: Reply-To header missing or unparsable."] };
  }

  const sameMailbox =
    !!fromEmail &&
    !!replyEmail &&
    fromEmail.toLowerCase() === replyEmail.toLowerCase();

  // Same domain, different mailbox (common when forged From matches a real domain)
  if (fromDomain === replyToDomain && !sameMailbox && fromEmail && replyEmail) {
    return {
      score: 15,
      reasons: [
        `Reply-To uses a different mailbox on the same domain (from: ${fromEmail}, reply-to: ${replyEmail})`,
      ],
    };
  }

  if (
    isSameOrSubdomain(replyToDomain, fromDomain) ||
    isSameOrSubdomain(fromDomain, replyToDomain)
  ) {
    const nameMismatch =
      !!fromName &&
      !!replyName &&
      normalizeName(fromName) !== normalizeName(replyName);
    if (sameMailbox && nameMismatch) {
      return {
        score: 8,
        reasons: [
          `Reply-To mailbox matches, but sender names differ (from: "${fromName}", reply-to: "${replyName}")`,
        ],
      };
    }

    return {
      score: 0,
      reasons: [
        `Test passed: Reply-To aligns with From identity (from: ${fromEmail ?? fromDomain}, reply-to: ${replyEmail ?? replyToDomain})`,
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

function extractEmail(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const addressMatch = headerValue.match(/<([^>]+)>/);
  const address =
    addressMatch?.[1] ??
    headerValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!address) return null;
  return address.trim().toLowerCase();
}

function extractDomain(headerValue: string | null | undefined): string | null {
  const email = extractEmail(headerValue);
  if (!email) return null;
  const domain = email.split("@")[1]?.trim();
  if (!domain) return null;
  return normalizeDomain(domain);
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.+$/, "");
}

function extractDisplayName(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const raw = headerValue
    .replace(/^from:\s*/i, "")
    .replace(/^reply-to:\s*/i, "")
    .trim();
  const withAngle = raw.match(/^"?([^"<]+)"?\s*<[^>]+>/);
  const name = withAngle?.[1]?.trim() ?? "";
  if (name) return name;
  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function isSameOrSubdomain(domain: string, base: string): boolean {
  return domain === base || domain.endsWith(`.${base}`);
}
