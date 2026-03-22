import { AnalysisLayers, type AnalysisResultSuccess } from "../../shared/types";

type AuthResults = {
  spf: string;
  dkim: string;
  dmarc: string;
};

type AuthScore = {
  score: number;
  reasons: string[];
};

export default async function analyzeSpoofing(
  authHeader: string | null | undefined
): Promise<AnalysisResultSuccess> {
  if (!authHeader) {
    throw new Error("Authentication headers not found in DOM");
  }
  const authResults = parseAuthResults(authHeader);
  const analysis = scoreAuthResults(authResults);
  return {
    reasons: { [AnalysisLayers.SPOOFING]: analysis.reasons },
    scores: { [AnalysisLayers.SPOOFING]: analysis.score },
  };
}

function parseAuthResults(authHeader: string | null): AuthResults {
  const auth = authHeader ?? "";
  const spf =
    auth.match(/spf=(\w+)/)?.[1] ??
    auth
      .match(/^(pass|fail|softfail|neutral|none|temperror|permerror)/i)?.[1]
      ?.toLowerCase() ??
    "none";
  const dkim = auth.match(/dkim=(\w+)/)?.[1] ?? "none";
  const dmarc = auth.match(/dmarc=(\w+)/)?.[1] ?? "none";
  return { spf, dkim, dmarc };
}

function scoreAuthResults(auth: AuthResults): AuthScore {
  const reasons: string[] = [];
  let score = 0;

  if (auth.spf === "fail") {
    score += 20;
    reasons.push("SPF hard fail — server not authorized");
  } else if (auth.spf === "softfail") {
    score += 10;
    reasons.push("SPF softfail — server weakly unauthorized");
  } else if (auth.spf === "none") {
    score += 5;
    reasons.push("SPF record missing");
  } else if (auth.spf === "neutral") {
    score += 3;
    reasons.push("SPF neutral — domain made no claim");
  }

  if (auth.dkim === "fail") {
    score += 25;
    reasons.push("DKIM signature invalid — email may be tampered");
  } else if (auth.dkim === "none") {
    score += 10;
    reasons.push("DKIM signature missing");
  } else if (auth.dkim === "policy") {
    score += 15;
    reasons.push("DKIM failed policy check");
  }

  if (auth.dmarc === "fail") {
    score += 20;
    reasons.push("DMARC failed — alignment check failed");
  } else if (auth.dmarc === "none") {
    score += 5;
    reasons.push("No DMARC record — domain has no spoofing policy");
  }

  if (reasons.length === 0) {
    reasons.push(
      `Authentication checks passed (SPF: ${auth.spf}, DKIM: ${auth.dkim}, DMARC: ${auth.dmarc})`
    );
  } else {
    reasons.unshift(`SPF: ${auth.spf}, DKIM: ${auth.dkim}, DMARC: ${auth.dmarc}`);
  }

  return { score: Math.min(score, 40), reasons };
}
