type LayerScore = {
  score: number;
  reasons: string[];
};

const SYSTEM_PROMPT = `You are a cybersecurity analyst detecting phishing manipulation tactics.
Look for: URGENCY, FEAR, AUTHORITY IMPERSONATION, GREED/REWARD, CREDENTIAL HARVESTING.
Respond ONLY with valid JSON (no markdown, no explanation):
{
  "tactics_found": ["specific suspicious phrases found"],
  "risk_level": "none" | "low" | "medium" | "high",
  "summary": "one sentence"
}
If body is too short return risk_level "none".`;

type BodyAnalysisApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type BodyAnalysisParsed = {
  tactics_found?: string[];
  risk_level?: "none" | "low" | "medium" | "high";
  summary?: string;
};

export default async function analyzeEmailBody(
  bodyText: string,
  geminiApiKey: string,
  hasConsent: boolean,
): Promise<LayerScore> {
  if (!bodyText || bodyText.trim().length < 30) {
    return { score: 0, reasons: [] };
  }
  if (!hasConsent) {
    return {
      score: 0,
      reasons: ["Body analysis disabled: enable Gemini consent in settings to send email content."],
    };
  }

  if (!geminiApiKey.trim()) {
    return {
      score: 0,
      reasons: ["Body analysis skipped: add a Gemini API key in extension settings."],
    };
  }

  const truncated = bodyText.slice(0, 2000);

  try {
    const modelCandidates = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;
    const apiErrors: string[] = [];
    let rawText = "";

    for (const model of modelCandidates) {
      const apiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          geminiApiKey.trim(),
        )}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT },
                { text: "Email body:\n\n" + truncated },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
        }),
      });

      const data = (await response.json()) as BodyAnalysisApiResponse & {
        error?: { message?: string; code?: number };
      };

      if (!response.ok) {
        const detail = data.error?.message?.slice(0, 140) ?? `HTTP ${response.status}`;
        apiErrors.push(`${model}: ${detail}`);
        continue;
      }

      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (rawText.trim()) {
        break;
      }
      apiErrors.push(`${model}: empty response payload`);
    }

    if (!rawText.trim()) {
      const merged = apiErrors.slice(0, 2).join(" | ");
      return { score: 0, reasons: [`Body analysis API error: ${merged || "No model response"}`] };
    }

    const parsed = parseModelJson(rawText);
    if (!parsed) {
      return {
        score: 0,
        reasons: ["Body analysis failed: could not parse model response"],
      };
    }
    const riskLevel = parsed.risk_level ?? "none";
    const reasons: string[] = [];

    const scoreByRisk: Record<NonNullable<BodyAnalysisParsed["risk_level"]>, number> = {
      none: 0,
      low: 8,
      medium: 18,
      high: 30,
    };

    const tactics = parsed.tactics_found ?? [];
    for (const tactic of tactics) {
      reasons.push(`Manipulation tactic: "${tactic}"`);
    }

    if (riskLevel !== "none" && parsed.summary) {
      reasons.push(parsed.summary);
    }

    if (!reasons.length) {
      reasons.push("No manipulation tactics detected in body");
    }

    return {
      score: scoreByRisk[riskLevel],
      reasons,
    };
  } catch {
    return { score: 0, reasons: ["Body analysis failed (network or unexpected error)"] };
  }
}

function parseModelJson(rawText: string): BodyAnalysisParsed | null {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as BodyAnalysisParsed;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as BodyAnalysisParsed;
      } catch {
        return null;
      }
    }
    return null;
  }
}
