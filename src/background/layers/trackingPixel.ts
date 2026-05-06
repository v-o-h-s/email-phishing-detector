type LayerScore = {
  score: number;
  reasons: string[];
};

type ImageInfo = {
  totalImages: number;
  trackingLikeImages: number;
  externalImages: number;
};

export default function analyzeTrackingPixel(imageInfo: ImageInfo | undefined): LayerScore {
  const info = imageInfo ?? { totalImages: 0, trackingLikeImages: 0, externalImages: 0 };
  if (info.totalImages === 0) {
    return { score: 0, reasons: ["Test passed: no inline images detected in message body."] };
  }

  const reasons: string[] = [];
  let score = 0;

  if (info.trackingLikeImages > 0) {
    score += Math.min(info.trackingLikeImages * 8, 16);
    reasons.push(`${info.trackingLikeImages} tracking-like image(s) detected (1x1/small beacon pattern)`);
  }

  if (info.externalImages > 0 && info.trackingLikeImages > 0) {
    score += Math.min(info.externalImages * 2, 6);
    reasons.push(`${info.externalImages} externally hosted image(s) may support open-tracking`);
  } else if (info.externalImages > 0) {
    reasons.push(
      `Test passed: ${info.externalImages} external image(s) found, but no pixel-beacon pattern detected.`,
    );
  }

  if (score === 0 && reasons.length === 0) {
    reasons.push("Test passed: no tracking-pixel indicators detected.");
  }

  return { score: Math.min(score, 20), reasons };
}
