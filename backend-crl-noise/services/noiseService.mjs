// services/noiseService.mjs
import { cache } from "../cache.mjs";
import { simulateNoiseCurrent, simulateNoiseHistory } from "./simNoise.mjs";

export async function getNoiseCurrent() {
  return cache.wrap("noise_current", 10_000, async () => {
    // plus de fetch externe : simulateur uniquement
    // tu pourras plus tard lui passer la vraie piste active
    return simulateNoiseCurrent("24");
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
