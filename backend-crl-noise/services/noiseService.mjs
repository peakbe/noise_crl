// services/noiseService.mjs
import { cache } from "../cache.mjs";
import { simulateNoiseCurrent, simulateNoiseHistory } from "./simNoise.mjs";
import { getActiveRunway } from "./runwayService.mjs";

export async function getNoiseCurrent() {
  return cache.wrap("noise_current", 10_000, async () => {
    // 1) On récupère la vraie piste active
    let active = "24";
    try {
      const rwy = await getActiveRunway();
      if (rwy?.runway) active = rwy.runway;
    } catch {
      // fallback silencieux
    }

    // 2) On simule le bruit en fonction de la piste active
    return simulateNoiseCurrent(active);
  });
}

export async function getNoiseHistory(id, from, to) {
  const key = `noise_hist_${id}_${from}_${to}`;
  return cache.wrap(key, 30_000, async () => {
    return simulateNoiseHistory(id, from, to);
  });
}

export async function getNoiseStatus() {
  try {
    const data = await getNoiseCurrent();
    const count = data.length;
    const offline = data.filter(s => s.status === "offline").length;

    return {
      ok: offline < count,
      sensors: count,
      offline
    };
  } catch {
    return { ok: false, sensors: 0, offline: 0 };
  }
}
