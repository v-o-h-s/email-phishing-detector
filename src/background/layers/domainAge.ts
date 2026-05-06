type LayerScore = {
  score: number;
  reasons: string[];
  ageDays?: number | null;
};

type RdapEvent = {
  eventAction?: string;
  eventDate?: string;
};

type RdapResponse = {
  events?: RdapEvent[];
};

export default async function analyzeDomainAge(
  fromHeader: string | null | undefined,
): Promise<LayerScore> {
  const domain = extractDomain(fromHeader);
  if (!domain) {
    return { score: 0, reasons: ["Test passed: sender domain could not be extracted."], ageDays: null };
  }

  // Avoid noisy checks on major freemail providers.
  if (isFreemail(domain)) {
    return {
      score: 0,
      reasons: ["Test passed: domain-age risk check skipped for major freemail domain."],
      ageDays: null,
    };
  }

  const ageDays = await getDomainAgeDays(domain);
  if (ageDays == null) {
    return { score: 0, reasons: ["Unable to determine domain age (RDAP lookup failed)"] };
  }

  if (ageDays < 30) {
    return { score: 15, reasons: [`Domain is very new (${ageDays} days old)`], ageDays };
  }
  if (ageDays < 180) {
    return { score: 8, reasons: [`Domain is relatively new (${ageDays} days old)`], ageDays };
  }

  return { score: 0, reasons: [`Test passed: domain age appears established (${ageDays} days old).`], ageDays };
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

function isFreemail(domain: string): boolean {
  const freemail = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
  ]);
  return freemail.has(domain);
}

async function getDomainAgeDays(domain: string): Promise<number | null> {
  const cacheKey = `rdap_age_${domain}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const cachedValue = cached[cacheKey] as
    | { checkedAt: number; ageDays: number | null }
    | undefined;

  const now = Date.now();
  if (cachedValue && now - cachedValue.checkedAt < 1000 * 60 * 60 * 24) {
    return cachedValue.ageDays;
  }

  try {
    const url = new URL(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/rdap+json, application/json" },
    });
    if (!res.ok) {
      await chrome.storage.local.set({ [cacheKey]: { checkedAt: now, ageDays: null } });
      return null;
    }
    const data = (await res.json()) as RdapResponse;
    const registration = (data.events ?? []).find((e) => {
      const action = e.eventAction?.toLowerCase().trim() ?? "";
      return (
        action === "registration" ||
        action === "registered" ||
        action === "domain registration" ||
        action === "creation" ||
        action === "created"
      );
    });
    const dateStr = registration?.eventDate;
    if (!dateStr) {
      await chrome.storage.local.set({ [cacheKey]: { checkedAt: now, ageDays: null } });
      return null;
    }
    const registeredAt = Date.parse(dateStr);
    if (!Number.isFinite(registeredAt)) {
      await chrome.storage.local.set({ [cacheKey]: { checkedAt: now, ageDays: null } });
      return null;
    }
    const ageDays = Math.max(0, Math.floor((now - registeredAt) / (1000 * 60 * 60 * 24)));
    await chrome.storage.local.set({ [cacheKey]: { checkedAt: now, ageDays } });
    return ageDays;
  } catch {
    await chrome.storage.local.set({ [cacheKey]: { checkedAt: now, ageDays: null } });
    return null;
  }
}

