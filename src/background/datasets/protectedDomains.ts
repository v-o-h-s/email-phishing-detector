const CACHE_KEY = "dataset_protected_domains_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Majestic Million is a public dataset of popular domains.
// We'll only download the first chunk and parse the first N domains.
const MAJESTIC_MILLION_URL = "http://downloads.majestic.com/majestic_million.csv";

const FALLBACK_PROTECTED = [
  "paypal.com",
  "microsoft.com",
  "google.com",
  "apple.com",
  "amazon.com",
  "facebook.com",
  "meta.com",
  "netflix.com",
  "bankofamerica.com",
  "chase.com",
  "wellsfargo.com",
];

export async function getProtectedDomains(limit = 5000): Promise<string[]> {
  const now = Date.now();
  const cached = await chrome.storage.local.get(CACHE_KEY);
  const cachedValue = cached[CACHE_KEY] as
    | { fetchedAt: number; domains: string[] }
    | undefined;

  if (cachedValue && now - cachedValue.fetchedAt < CACHE_TTL_MS && cachedValue.domains.length) {
    return cachedValue.domains;
  }

  const fetched = await fetchMajesticMillionTopDomains(limit);
  const domains = fetched.length ? fetched : FALLBACK_PROTECTED;
  await chrome.storage.local.set({ [CACHE_KEY]: { fetchedAt: now, domains } });
  return domains;
}

async function fetchMajesticMillionTopDomains(limit: number): Promise<string[]> {
  // We only need the start of the CSV. Use Range so we don't download the whole million lines.
  // 512KB is usually enough to capture thousands of rows.
  const rangeBytes = 512 * 1024;

  try {
    const res = await fetch(MAJESTIC_MILLION_URL, {
      method: "GET",
      headers: { Range: `bytes=0-${rangeBytes - 1}` },
    });

    if (!res.ok) return [];
    const text = await res.text();

    // CSV columns include "GlobalRank,Domain,TLD,..."
    // We'll read line by line and take the Domain column.
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    for (const line of lines) {
      if (!line) continue;
      if (line.toLowerCase().startsWith("globalrank,")) continue;
      const cols = line.split(",");
      const domain = cols[1]?.trim().toLowerCase().replace(/\.+$/, "");
      if (!domain) continue;
      out.push(domain);
      if (out.length >= limit) break;
    }
    return dedupe(out);
  } catch {
    return [];
  }
}

function dedupe(items: string[]): string[] {
  const set = new Set<string>();
  for (const item of items) set.add(item);
  return Array.from(set);
}

