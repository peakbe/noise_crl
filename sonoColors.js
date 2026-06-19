// sonoColors.js — Coloration PRO+++ des sonomètres selon la piste active

// --- LISTES NORMALISÉES -----------------------------------------------------

// RWY 24 → TOUS VERTS (selon ta règle)
const RUNWAY_24_GREEN = [
  "F101","F102","F103","F104","F105","F107",
  "F110","F111","F112","F114","F116","F117",
  "F106","F108","F109","F118","F119"
];

// RWY 06 → VERTS
const RUNWAY_06_GREEN = [
  "F101","F102","F103","F104","F105","F107",
  "F110","F111","F112",
  "F106","F108","F109","F119"
];

// RWY 06 → ROUGES
const RUNWAY_06_RED = [
  "F114","F116","F117","F118"
];

// -----------------------------------------------------------------------------
// Couleurs cockpit IFR
// -----------------------------------------------------------------------------
export const SONO_COLORS = {
  green: "#00ff88",
  red:   "#ff4040",
  grey:  "#708090"
};

// -----------------------------------------------------------------------------
// Fonction PRO+++
// -----------------------------------------------------------------------------
export function getSonoColorByRunway(id, runway) {
  if (!id) return SONO_COLORS.grey;

  const normId = id.toUpperCase().trim();
  const rw = (runway || "").toString().trim();

  // --- RWY 24 ---------------------------------------------------------------
  if (rw === "24") {
    return RUNWAY_24_GREEN.includes(normId)
      ? SONO_COLORS.green
      : SONO_COLORS.grey;
  }

  // --- RWY 06 ---------------------------------------------------------------
  if (rw === "06") {
    if (RUNWAY_06_GREEN.includes(normId)) return SONO_COLORS.green;
    if (RUNWAY_06_RED.includes(normId))   return SONO_COLORS.red;
    return SONO_COLORS.grey;
  }

  // --- RWY inconnue ---------------------------------------------------------
  return SONO_COLORS.grey;
}
