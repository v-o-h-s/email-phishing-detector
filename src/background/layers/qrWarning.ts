type LayerScore = {
  score: number;
  reasons: string[];
};

type ImageInfo = {
  totalImages: number;
  qrLikeImages?: number;
};

export default function analyzeQrWarning(imageInfo: ImageInfo | undefined): LayerScore {
  const totalImages = imageInfo?.totalImages ?? 0;
  const qrLikeImages = imageInfo?.qrLikeImages ?? 0;

  if (totalImages <= 0) {
    return { score: 0, reasons: ["Test passed: no images detected in message body."] };
  }

  if (qrLikeImages <= 0) {
    return { score: 0, reasons: ["Test passed: images found, but none look like a QR code."] };
  }

  return {
    score: Math.min(8, qrLikeImages * 4),
    reasons: [
      `${qrLikeImages} image(s) look QR-like (square/scan marker) — do not scan unknown QR codes from email.`,
    ],
  };
}
