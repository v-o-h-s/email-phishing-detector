type LayerScore = {
  score: number;
  reasons: string[];
};

export default function analyzeReceivedChain(
  fromHeader: string | null | undefined,
  receivedHeaders: string[] | null | undefined,
): LayerScore {
  const fromDomain = extractDomain(fromHeader);
  const received = (receivedHeaders ?? []).filter(Boolean);
  if (!fromDomain || received.length === 0) return { score: 0, reasons: [] };

  const haystack = received.join("\n").toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (!haystack.includes(fromDomain.toLowerCase())) {
    score += 10;
    reasons.push(`Sender domain "${fromDomain}" not seen in Received chain`);
  }

  const earliestHop = received[received.length - 1]?.toLowerCase() ?? "";
  if (containsPrivateIp(earliestHop) || earliestHop.includes("localhost")) {
    score += 10;
    reasons.push("Earliest Received hop contains private/localhost routing");
  }

  if (received.length >= 8) {
    score += 5;
    reasons.push(`Unusually long Received chain (${received.length} hops)`);
  }

  return { score: Math.min(score, 20), reasons };
}

function extractDomain(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const addressMatch = headerValue.match(/<([^>]+)>/);
  const address =
    addressMatch?.[1] ??
    headerValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!address) return null;
  const domain = address.split("@")[1]?.trim().toLowerCase().replace(/\.+$/, "");
  return domain || null;
}

function containsPrivateIp(text: string): boolean {
  return (
    /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text) ||
    /\b192\.168\.\d{1,3}\.\d{1,3}\b/.test(text) ||
    /\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/.test(text) ||
    /\b127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)
  );
}

