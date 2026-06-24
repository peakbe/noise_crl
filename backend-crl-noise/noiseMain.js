// noiseMain.js — bootstrap PRO+++ CRL bruit + METAR + piste active + ADS-B

import { CRL_SONOMETERS } from "./crlSonometers.js";
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
    mapCtrl.drawRunwayCorridor(
      { lat: 50.459, lon: 4.453 },
      activeRunway === "06" ? 70 : 250
    );
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

        mapCtrl.drawRunwayCorridor(
          { lat: 50.459, lon: 4.453 },
          activeRunway === "06" ? 70 : 250
        );
      }
    } catch (e) {
      console.warn("Erreur refresh piste", e);
    }
  }

  // --- REFRESH METEO --------------------------------------------------------
  async function refreshWeather() {
    try {
      const meteo = await fetchWeather();
      panel.renderWeather?.(meteo);
    } catch (e) {
      console.warn("Erreur météo", e);
    }
  }

  // --- REFRESH ADS-B (isolé pour éviter crash) ------------------------------
  async function refreshAdsb() {
    try {
      const traffic = await fetchAdsbLive();
      mapCtrl.updateTraffic?.(traffic);
    } catch (e) {
      console.warn("Erreur ADS-B (isolée, dashboard continue)", e);
    }
  }

  // --- SELECTION SONOMETRE --------------------------------------------------
  async function onSelectSonometer(id) {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000);
      const hist = await fetchNoiseHistory(id, from.toISOString(), now.toISOString());
      const s = CRL_SONOMETERS.find(x => x.id === id);
      panel.renderDetails(s, hist.history);
    } catch (e) {
      console.error("Erreur historique bruit", e);
    }
  }

  // --- MONITORING -----------------------------------------------------------
  async function refreshMonitoring() {
    try {
      const mon = await fetchJson("/api/monitoring");
      panel.renderMonitoring(mon);
    } catch (e) {
      console.warn("Monitoring error", e);
    }
  }

  setInterval(refreshMonitoring, 20_000);

  async function fetchMonitoring() {
    return fetchJson("/api/monitoring");
  }

  async function fetchMetar() {
    return fetchJson("/api/airport/crl/metar");
  }

  async function refreshDashboard() {
    try {
      const [mon, metar] = await Promise.all([
        fetchMonitoring(),
        fetchMetar()
      ]);
      panel.renderDashboard(mon, metar.raw || metar.metar || "");
    } catch (e) {
      console.warn("Dashboard IFR error", e);
    }
  }

  // --- LANCEMENT INITIAL ----------------------------------------------------
  await refreshDashboard();

  // IMPORTANT : éviter appel prématuré de la heatmap
  setTimeout(() => {
    refreshNoise();
  }, 500);

  setTimeout(() => {
    refreshWeather();
  }, 600);

  setTimeout(() => {
    refreshAdsb();
  }, 800);

  // --- TIMERS ---------------------------------------------------------------
  setInterval(refreshNoise, 30_000);
  setInterval(refreshRunway, 60_000);
  setInterval(refreshWeather, 5 * 60_000);
  setInterval(refreshAdsb, 15_000);
}

main().catch(console.error);
