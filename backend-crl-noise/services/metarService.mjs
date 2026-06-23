import { cache } from "../cache.mjs";
import fetch from "node-fetch";

const API_KEY = process.env.CHECKWX_KEY;

export async function getMetarCRL() {
  return cache.wrap("metar_crl", 5 * 60_000, async () => {
    const url = "https://api.checkwx.com/metar/EBCI/decoded";
    const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
    if (!res.ok) throw new Error("METAR error");
    const json = await res.json();
    return json.data?.[0] ?? null;
  });
}
export async function getMetarStatus() {
  try {
    const metar = await getMetar(); // ta fonction existante
    const age = Date.now() - new Date(metar.timestamp).getTime();

    return {
      ok: age < 10 * 60_000,
      ageMinutes: age / 60000,
      last: metar.raw
    };
  } catch {
    return { ok: false };
  }
}
