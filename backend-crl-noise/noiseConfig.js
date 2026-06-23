// noiseConfig.js
export const NOISE_THRESHOLDS = {
  low: 50,     // dB(A)
  medium: 60,
  high: 70,
  veryHigh: 80
};

export function getNoiseClass(db) {
  if (db == null) return "unknown";
  if (db < NOISE_THRESHOLDS.low) return "low";
  if (db < NOISE_THRESHOLDS.medium) return "medium";
  if (db < NOISE_THRESHOLDS.high) return "high";
  if (db < NOISE_THRESHOLDS.veryHigh) return "veryHigh";
  return "extreme";
}

export function getNoiseColor(db) {
  const cls = getNoiseClass(db);
  switch (cls) {
    case "low": return "#00ff88";      // vert
    case "medium": return "#c8ff00";   // jaune-vert
    case "high": return "#ffb000";     // orange
    case "veryHigh": return "#ff4000"; // rouge
    case "extreme": return "#ff00ff";  // magenta alerte
    default: return "#00b0ff";         // bleu standby
  }
}
