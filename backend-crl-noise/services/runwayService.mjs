import { cache } from "../cache.mjs";
import { getMetarCRL } from "./metarService.mjs";

export async function getActiveRunway() {
  return cache.wrap("active_runway", 5 * 60_000, async () => {
    const metar = await getMetarCRL();
    if (!metar) return null;

    const windDir = metar.wind?.degrees ?? null;
    const runways = [
      { id: "07", heading: 70 },
      { id: "25", heading: 250 }
    ];

    let best = null;
    let bestDiff = 999;
    for (const r of runways) {
      const diff = Math.abs(((windDir - r.heading + 540) % 360) - 180);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }

    return {
      airport: "EBCI",
      runway: best.id,
      heading: best.heading,
      wind: {
        dir: windDir,
        speedKt: metar.wind?.speed_kts ?? null
      },
      source: "METAR",
      timestamp: new Date().toISOString()
    };
  });
}

export async function getRunwayStatus() {
  try {
    const rwy = await getActiveRunway();
    return {
      ok: !!rwy.runway,
      runway: rwy.runway,
      heading: rwy.heading
    };
  } catch {
    return { ok: false };
  }
}
