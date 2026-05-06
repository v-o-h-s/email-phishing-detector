/**
 * Pull http(s) URLs from plain text (Gmail often shows links as text, not <a>).
 */
export function extractHttpUrlsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(/\bhttps?:\/\/[^\s<>"')\]]+/gi);
  const out: string[] = [];
  for (const m of matches) {
    const raw = m[0]?.replace(/[.,;:!?)]+$/, "") ?? "";
    if (raw.length > 10) out.push(raw);
  }
  return out;
}

/**
 * Expand Gmail "Open link" redirects so Safe Browsing sees the real target.
 */
export function unwrapGoogleRedirectUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "www.google.com" || host === "google.com") {
      if (u.pathname === "/url" || u.pathname.startsWith("/url")) {
        const inner = u.searchParams.get("q") ?? u.searchParams.get("url");
        if (inner) return inner;
      }
    }
  } catch {
    /* ignore */
  }
  return url;
}

export function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

export function mergeUniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = unwrapGoogleRedirectUrl(raw.trim());
    if (!u || (!u.toLowerCase().startsWith("http://") && !u.toLowerCase().startsWith("https://"))) {
      continue;
    }
    const key = normalizeUrlForDedup(u);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}
