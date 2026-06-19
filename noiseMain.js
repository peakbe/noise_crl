// noiseMain.js — bootstrap PRO+++ CRL bruit + METAR + piste active

import { CRL_SONOMETERS } from "./crlSonometers.mjs";
import { initNoiseMap } from "./noiseMap.js";
import { initNoisePanel } from "./noisePanel.js";

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

async function fetchCurrentNoise() {
  return fetchJson("/api/noise/current");
}

async function fetchNoiseHistory(id, from, to) {
  const p = new URLSearchParams({ from, to });
  return fetchJson(`/api/noise/history/${id}?${p.toString()}`);
}

async function fetchActiveRunway() {
  const j = await fetchJson("/api/airport/crl/active-runway");
  return j.runway; // "06" ou "24"
}

async function fetchWeather() {
  return fetchJson("/api/weather/current");
}

async function fetchAdsbLive() {
  return fetchJson("/api/adsb/live");
}

async function main() {
  const mapCtrl = initNoiseMap("map");
  const panel = initNoisePanel("noise-panel");

  let activeRunway = "06";
  let lastNoise = [];

  // --- RUNWAY INIT ----------------------------------------------------------
  try {
    activeRunway = await fetchActiveRunway();
    // centre approximatif CRL
    mapCtrl.drawRunwayCorridor({ lat: 50.459, lon: 4.453 }, activeRunway === "06" ? 70 : 250);
  } catch (e) {
    console.warn("Piste active indisponible", e);
  }

  // --- REFRESH BRUIT --------------------------------------------------------
  async function refreshNoise() {
    try {
      const noiseData = await fetchCurrentNoise();
      lastNoise = noiseData;
      mapCtrl.updateNoiseDisplay(noiseData, activeRunway);
      panel.renderSummary(noiseData);
      panel.renderList(CRL_SONOMETERS, noiseData, onSelectSonometer);
    } catch (e) {
      console.error("Erreur bruit", e);
    }
  }

  // --- REFRESH RUNWAY -------------------------------------------------------
  async function refreshRunway() {
    try {
      const rw = await fetchActiveRunway();
      if (rw && rw !== activeRunway) {
        activeRunway = rw;
        mapCtrl.updateNoiseDisplay(lastNoise, activeRunway);
        mapCtrl.drawRunwayCorridor({ lat: 50.459, lon: 4.453 }, activeRunway === "06" ? 70 : 250);
      }
    } catch (e) {
      console.warn("Erreur refresh piste", e);
    }
  }

  // --- REFRESH METEO / ADSB (optionnel, pour futur) -------------------------
  async function refreshWeather() {
    try {
      const meteo = await fetchWeather();
      panel.renderWeather?.(meteo);
    } catch (e) {
      console.warn("Erreur météo", e);
    }
  }

  async function refreshAdsb() {
    try {
      const traffic = await fetchAdsbLive();
      mapCtrl.updateTraffic?.(traffic);
    } catch (e) {
      console.warn("Erreur ADS-B", e);
    }
  }

  // --- SELECTION SONOMETRE --------------------------------------------------
  async function onSelectSonometer(id) {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000); // 1h
      const hist = await fetchNoiseHistory(id, from.toISOString(), now.toISOString());
      const s = CRL_SONOMETERS.find(x => x.id === id);
      panel.renderDetails(s, hist.history);
    } catch (e) {
      console.error("Erreur historique bruit", e);
    }
  }

  // --- LANCEMENT INITIAL ----------------------------------------------------
  await refreshNoise();
  await refreshWeather();
  await refreshAdsb();

  // --- TIMERS ---------------------------------------------------------------
  setInterval(refreshNoise, 30_000);
  setInterval(refreshRunway, 60_000);
  setInterval(refreshWeather, 5 * 60_000);
  setInterval(refreshAdsb, 15_000);
}

main().catch(console.error);
