import { cache } from "../cache.mjs";
import fetch from "node-fetch";

const NOISE_BASE = process.env.NOISE_API_BASE ?? "http://localhost:5000";

export async function getNoiseCurrent() {
  return cache.wrap("noise_current", 30_000, async () => {
    const res = await fetch(`${NOISE_BASE}/sensors/current`);
    if (!res.ok) throw new Error("Noise current error");
    return res.json();
  });
}

export async function getNoiseHistory(id, from, to) {
  const key = `noise_hist_${id}_${from}_${to}`;
  return cache.wrap(key, 60_000, async () => {
    const params = new URLSearchParams({ from, to });
    const res = await fetch(`${NOISE_BASE}/sensors/${id}/history?${params}`);
    if (!res.ok) throw new Error("Noise history error");
    return res.json();
  });
}

export async function getNoiseStatus() {
  try {
    const data = await getNoiseCurrent();
    const count = data.length;
    const offline = data.filter(s => s.status === "offline").length;

    return {
      ok: offline === 0,
      sensors: count,
      offline
    };
  } catch {
    return { ok: false };
  }
}
