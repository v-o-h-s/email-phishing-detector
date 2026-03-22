import type { AnalysisResultSuccess } from "../../shared/types";

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

export async function fetchAuthHeaderFromStandardView(
  messageElement: Element,
): Promise<string | null> {
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
    return (
      extractHeaderBlock(text, "Authentication-Results") ??
      extractHeaderBlock(text, "ARC-Authentication-Results") ??
      extractHeaderBlock(text, "Received-SPF") ??
      null
    );
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
