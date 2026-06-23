// -------------------------------------------------------------
//  simNoise.mjs — Simulateur bruit PRO+++
//  Génère LAeq / Lmax réalistes selon :
//  - piste active (RWY 06 / 24)
//  - distance latérale au corridor
//  - bruit de base selon orientation
//  - variation aléatoire réaliste
// -------------------------------------------------------------

import { CRL_SONOMETERS } from "../crlSonometers.js";

// -------------------------------------------------------------
// 1) Définition du corridor acoustique dynamique
// -------------------------------------------------------------
const RWY_CENTER = { lat: 50.459, lon: 4.453 };
const RWY_HEADING = {
  "06": 60,     // QFU 060°
  "24": 240     // QFU 240°
};

// -------------------------------------------------------------
// 2) Fonctions mathématiques
// -------------------------------------------------------------
function deg2rad(d) {
  return d * Math.PI / 180;
}

// Distance latérale au corridor (en mètres)
function lateralDistanceToCorridor(lat, lon, runway) {
  const heading = RWY_HEADING[runway] ?? 240;
  const h = deg2rad(heading);

  // vecteur piste
  const vx = Math.cos(h);
  const vy = Math.sin(h);

  // vecteur sonomètre → centre piste
  const dx = lon - RWY_CENTER.lon;
  const dy = lat - RWY_CENTER.lat;

  // projection sur l’axe
  const proj = dx * vx + dy * vy;

  // composante latérale
  const latDist = Math.sqrt(Math.max(0, dx*dx + dy*dy - proj*proj));

  return latDist * 111000; // degrés → mètres
}

// -------------------------------------------------------------
// 3) Modulation du bruit selon la distance au corridor
// -------------------------------------------------------------
function corridorBoost(latDist) {
  if (latDist < 300) return 8;     // plein axe
  if (latDist < 600) return 4;     // zone médiane
  if (latDist < 1000) return 1;    // zone large
  return -3;                       // hors corridor
}

// -------------------------------------------------------------
// 4) Niveau de base selon la piste active
// -------------------------------------------------------------
function baseLevelForRunway(runway) {
  if (runway === "06") return 52;   // départs vers l’Est → moins bruyant
  if (runway === "24") return 56;   // départs vers l’Ouest → plus bruyant
  return 50;
}

// -------------------------------------------------------------
// 5) Simulateur bruit courant (LAeq / Lmax)
// -------------------------------------------------------------
export function simulateNoiseCurrent(activeRunway = "24") {
  const base = baseLevelForRunway(activeRunway);
  const now = new Date().toISOString();

  return CRL_SONOMETERS.map(s => {
    const latDist = lateralDistanceToCorridor(s.lat, s.lon, activeRunway);
    const boost = corridorBoost(latDist);

    const rand = (Math.random() - 0.5) * 6; // ±3 dB
    const LAeq = base + boost + rand;
    const Lmax = LAeq + 8 + (Math.random() * 4);

    const offline = Math.random() < 0.05;

    return {
      id: s.id,
      LAeq: offline ? null : Number(LAeq.toFixed(1)),
      Lmax: offline ? null : Number(Lmax.toFixed(1)),
      timestamp: now,
      status: offline ? "offline" : "ok",
      corridor: {
        latDist: Math.round(latDist),
        boost
      }
    };
  });
}

// -------------------------------------------------------------
// 6) Simulateur historique bruit (pour les détails sonomètre)
// -------------------------------------------------------------
export function simulateNoiseHistory(id, from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 3600_000);
  const end = to ? new Date(to) : new Date();
  const steps = 24;

  const runway = "24";
  const base = baseLevelForRunway(runway);

  const history = [];
  const dt = (end.getTime() - start.getTime()) / steps;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + i * dt);
    const rand = (Math.random() - 0.5) * 10;
    const LAeq = base + rand;
    const Lmax = LAeq + 6 + (Math.random() * 4);

    history.push({
      id,
      LAeq: Number(LAeq.toFixed(1)),
      Lmax: Number(Lmax.toFixed(1)),
      timestamp: t.toISOString()
    });
  }

  return { id, history };
}
