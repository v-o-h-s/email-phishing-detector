import type { AnalysisResultSuccess } from "../../shared/types";
import {
  extractHttpUrlsFromText,
  mergeUniqueUrls,
  unwrapGoogleRedirectUrl,
} from "../../shared/urlExtract";

export function calculateTotalScore(
  scores: AnalysisResultSuccess["scores"],
): number {
  return Object.values(scores).reduce((total, value) => total + (value ?? 0), 0);
}

export function extractAuthHeaderFromDom(): string | null {
  const bodyText = document.body.innerText ?? "";
  return (
    extractHeaderBlock(bodyText, "Authentication-Results") ??
    extractHeaderBlock(bodyText, "ARC-Authentication-Results") ??
    extractHeaderBlock(bodyText, "Received-SPF") ??
    null
  );
}

function getMessageCard(messageElement: Element | null | undefined): Element | null {
  if (!messageElement) return null;
  return (
    messageElement.closest(".adn.ads") ??
    messageElement.closest("div.adn") ??
    messageElement.closest('[role="listitem"]') ??
    null
  );
}

function getEmailBodyElement(messageElement: Element | null | undefined): Element | null {
  const card = getMessageCard(messageElement);
  if (card) {
    return card.querySelector(".a3s.aiL, .a3s");
  }
  return document.querySelector(".a3s.aiL, .a3s");
}

function getImageSearchRoot(messageElement: Element | null | undefined): Element {
  const body = getEmailBodyElement(messageElement);
  return body ?? document.createElement("div");
}

export function extractBodyLinks(messageElement?: Element | null): string[] {
  const body = getEmailBodyElement(messageElement ?? null);
  if (!body) return [];

  const fromAnchors = Array.from(body.querySelectorAll("a[href]"))
    .map((anchor) => unwrapGoogleRedirectUrl(anchor.getAttribute("href")?.trim() ?? ""))
    .filter(
      (href): href is string =>
        !!href && (href.toLowerCase().startsWith("http://") || href.toLowerCase().startsWith("https://")),
    );

  const fromText = extractHttpUrlsFromText(body.textContent ?? "");
  return mergeUniqueUrls([...fromAnchors, ...fromText]);
}

export function extractBodyText(messageElement?: Element | null): string {
  const body = getEmailBodyElement(messageElement ?? null);
  return body?.textContent?.trim() ?? "";
}

export function extractImageInfo(messageElement?: Element | null): {
  totalImages: number;
  trackingLikeImages: number;
  externalImages: number;
  qrLikeImages: number;
} {
  const root = getImageSearchRoot(messageElement ?? null);
  const images = Array.from(root.querySelectorAll("img"));
  let trackingLikeImages = 0;
  let externalImages = 0;
  let qrLikeImages = 0;
  let totalImages = 0;

  for (const image of images) {
    const width = Number(image.getAttribute("width") ?? image.naturalWidth ?? image.clientWidth ?? 0);
    const height = Number(image.getAttribute("height") ?? image.naturalHeight ?? image.clientHeight ?? 0);
    if (width <= 0 || height <= 0) {
      continue;
    }
    totalImages += 1;

    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) {
      trackingLikeImages += 1;
    }

    const src = image.getAttribute("src") ?? "";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) {
      externalImages += 1;
    }

    const hintText = `${image.getAttribute("alt") ?? ""} ${image.getAttribute("aria-label") ?? ""} ${src}`
      .toLowerCase();
    const hasQrHint = /\bqr\b|qrcode|scan\s*me/.test(hintText);
    if (hasQrHint) {
      qrLikeImages += 1;
    }
  }

  return {
    totalImages,
    trackingLikeImages,
    externalImages,
    qrLikeImages,
  };
}

export type ParsedHeaders = {
  authHeader: string | null;
  fromHeader: string | null;
  replyToHeader: string | null;
  dateHeader: string | null;
  receivedHeaders: string[];
};

export async function fetchHeadersFromStandardView(
  messageElement: Element,
): Promise<ParsedHeaders | null> {
  // get the messageId and the ik
  const messageId = getGmailMessageId(messageElement) ?? getGmailThreadId(messageElement);
  const ik = getGmailIk();
  if (!messageId || !ik) return null;

  const url = new URL("https://mail.google.com/mail/u/0/");
  url.searchParams.set("ui", "2");
  url.searchParams.set("ik", ik);
  url.searchParams.set("view", "om");
  url.searchParams.set("th", messageId);

  try {
    const response = await fetch(url.toString(), { credentials: "include" });
    if (!response.ok) return null;
    const text = await response.text();
    const authHeader =
      extractHeaderBlock(text, "Authentication-Results") ??
      extractHeaderBlock(text, "ARC-Authentication-Results") ??
      extractHeaderBlock(text, "Received-SPF") ??
      null;
    return {
      authHeader,
      fromHeader: extractHeaderBlock(text, "From"),
      replyToHeader: extractHeaderBlock(text, "Reply-To"),
      dateHeader: extractHeaderBlock(text, "Date"),
      receivedHeaders: extractHeaderBlocks(text, "Received"),
    };
  } catch {
    return null;
  }
}

export function getGmailMessageId(messageElement: Element): string | null {
  return (
    messageElement.getAttribute("data-legacy-message-id") ??
    messageElement.closest("[data-legacy-message-id]")?.getAttribute("data-legacy-message-id") ??
    null
  );
}

export function getGmailThreadId(messageElement: Element): string | null {
  const threadId =
    messageElement.getAttribute("data-legacy-thread-id") ??
    messageElement.getAttribute("data-thread-id") ??
    messageElement
      .closest("[data-legacy-thread-id]")
      ?.getAttribute("data-legacy-thread-id") ??
    messageElement.closest("[data-thread-id]")?.getAttribute("data-thread-id") ??
    document.querySelector("[data-legacy-thread-id]")?.getAttribute(
      "data-legacy-thread-id",
    ) ??
    document.querySelector("[data-thread-id]")?.getAttribute("data-thread-id");

  return threadId ?? null;
}

export function getGmailIk(): string | null {
  const cached = document.documentElement.getAttribute("data-ik");
  if (cached) return cached;

  const scripts = Array.from(document.querySelectorAll("script"));
  const ikRegex = /["']ik["']\s*[,:]\s*["']([a-z0-9]{10,})["']/i;
  for (const script of scripts) {
    const text = script.textContent;
    if (!text) continue;
    const match = text.match(ikRegex);
    if (match?.[1]) {
      document.documentElement.setAttribute("data-ik", match[1]);
      return match[1];
    }
  }

  const htmlText = document.documentElement.innerHTML;
  const htmlMatch =
    htmlText.match(ikRegex) ||
    htmlText.match(/GLOBALS=\[.*?,.*?,"([a-z0-9]{10,})",/i);
  if (htmlMatch?.[1]) {
    document.documentElement.setAttribute("data-ik", htmlMatch[1]);
    return htmlMatch[1];
  }

  return null;
}

export function extractHeaderBlock(text: string, headerName: string): string | null {
  const pattern = new RegExp(
    `^${headerName}:.*(?:\\r?\\n[\\t ].*)*`,
    "mi",
  );
  const match = text.match(pattern);
  return match?.[0] ?? null;
}

export function extractHeaderBlocks(text: string, headerName: string): string[] {
  const pattern = new RegExp(
    `^${headerName}:.*(?:\\r?\\n[\\t ].*)*`,
    "gmi",
  );
  return Array.from(text.matchAll(pattern)).map((m) => m[0]).filter(Boolean);
}
