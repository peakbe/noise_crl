// services/simNoise.mjs
import { CRL_SONOMETERS } from "../crlSonometers.js";

function baseLevelForRunway(runway) {
  if (runway === "06") return 52;   // départs vers l'Est → moins de bruit côté ville
  if (runway === "24") return 56;   // départs vers l'Ouest → plus de bruit côté habitations
  return 50;
}

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
    const rand = Math.random();
    const delta = (rand - 0.5) * 10;
    const LAeq = base + delta;
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
