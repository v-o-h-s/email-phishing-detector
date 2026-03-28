const CACHE_KEY = "dataset_freemail_domains_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// Maintained list of freemail providers (text file, one domain per line).
// Source: techux/freemailproviders via jsDelivr CDN.
const FREEMAIL_URL =
  "https://cdn.jsdelivr.net/gh/techux/freemailproviders@main/free-mail-domains.txt";

const FALLBACK_FREEMAIL = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
];

export async function getFreemailDomains(): Promise<Set<string>> {
  const now = Date.now();
  const cached = await chrome.storage.local.get(CACHE_KEY);
  const cachedValue = cached[CACHE_KEY] as
    | { fetchedAt: number; domains: string[] }
    | undefined;

  if (cachedValue && now - cachedValue.fetchedAt < CACHE_TTL_MS && cachedValue.domains.length) {
    return new Set(cachedValue.domains);
  }

  const fetched = await fetchFreemailList();
  const domains = fetched.length ? fetched : FALLBACK_FREEMAIL;
  await chrome.storage.local.set({ [CACHE_KEY]: { fetchedAt: now, domains } });
  return new Set(domains);
}

async function fetchFreemailList(): Promise<string[]> {
  try {
    const res = await fetch(FREEMAIL_URL, { method: "GET" });
    if (!res.ok) return [];
    const text = await res.text();
    return dedupe(
      text
        .split(/\r?\n/)
        .map((l) => l.trim().toLowerCase().replace(/\.+$/, ""))
        .filter((l) => l && !l.startsWith("#")),
    );
  } catch {
    return [];
  }
}

function dedupe(items: string[]): string[] {
  const set = new Set<string>();
  for (const item of items) set.add(item);
  return Array.from(set);
}

