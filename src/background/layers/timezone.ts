type LayerScore = {
  score: number;
  reasons: string[];
};

export default function analyzeTimezone(
  fromHeader: string | null | undefined,
  dateHeader: string | null | undefined,
): LayerScore {
  const fromDomain = extractDomain(fromHeader);
  const offsetMinutes = parseTimezoneOffsetMinutes(dateHeader);

  if (!fromDomain || offsetMinutes == null) return { score: 0, reasons: [] };

  const tld = fromDomain.split(".").pop() ?? "";
  const expected = expectedOffsetRangeByCcTld(tld);
  if (!expected) return { score: 0, reasons: [] };

  if (offsetMinutes < expected.min || offsetMinutes > expected.max) {
    return {
      score: 8,
      reasons: [
        `Email Date timezone (${formatOffset(offsetMinutes)}) is unusual for .${tld} domains`,
      ],
    };
  }

  return { score: 0, reasons: [] };
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

function parseTimezoneOffsetMinutes(dateHeader: string | null | undefined): number | null {
  if (!dateHeader) return null;
  // Date: Fri, 27 Mar 2026 01:25:00 +0100
  const match = dateHeader.match(/([+-])(\d{2})(\d{2})\b/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const mins = Number(match[3]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return sign * (hours * 60 + mins);
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}${mm}`;
}

function expectedOffsetRangeByCcTld(
  tld: string,
): { min: number; max: number } | null {
  // Very rough heuristic for common ccTLDs. Ranges include DST where relevant.
  // Values are minutes offset from UTC (e.g., +60 is UTC+1).
  const map: Record<string, { min: number; max: number }> = {
    us: { min: -600, max: -240 }, // UTC-10 .. UTC-4 (Hawaii..ET)
    ca: { min: -480, max: -210 }, // UTC-8 .. UTC-3:30
    mx: { min: -480, max: -300 },
    br: { min: -300, max: -120 },
    uk: { min: 0, max: 60 },
    fr: { min: 60, max: 120 },
    de: { min: 60, max: 120 },
    es: { min: 0, max: 120 },
    it: { min: 60, max: 120 },
    nl: { min: 60, max: 120 },
    be: { min: 60, max: 120 },
    ch: { min: 60, max: 120 },
    ru: { min: 120, max: 720 },
    cn: { min: 480, max: 480 },
    jp: { min: 540, max: 540 },
    kr: { min: 540, max: 540 },
    in: { min: 330, max: 330 },
    ae: { min: 240, max: 240 },
    sa: { min: 180, max: 180 },
    au: { min: 480, max: 660 },
    nz: { min: 720, max: 780 },
  };
  return map[tld] ?? null;
}

