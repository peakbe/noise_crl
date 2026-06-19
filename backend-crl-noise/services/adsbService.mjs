import { cache } from "../cache.mjs";
import fetch from "node-fetch";

export async function getAdsbLive() {
  return cache.wrap("adsb_live", 10_000, async () => {
    try {
      const url = "https://opensky-network.org/api/states/all";
      const res = await fetch(url);
      if (!res.ok) throw new Error("OpenSky error");
      const json = await res.json();

      return (json.states ?? [])
        .filter(s => s[5] !== null && s[6] !== null)
        .map(s => ({
          icao: s[0],
          callsign: s[1]?.trim() || null,
          lon: s[5],
          lat: s[6],
          altFt: s[13],
          gsKt: s[9] ? s[9] * 1.94384 : null,
          track: s[10],
          verticalRate: s[11],
          timestamp: json.time
        }));
    } catch (e) {
      console.warn("OpenSky failed:", e.message);
      return [];
    }
  });
}
