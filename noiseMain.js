// noiseMain.js
import { CRL_SONOMETERS } from "./crlSonometers.js";
import { initNoiseMap } from "./noiseMap.js";
import { initNoisePanel } from "./noisePanel.js";
import { fetchCurrentNoise, fetchHistoryFor, fetchActiveRunway } from "./noiseApi.js";

async function main() {
  const mapCtrl = initNoiseMap("map", CRL_SONOMETERS);
  const panel = initNoisePanel("noise-panel");

  async function refreshNoise() {
    try {
      const noiseData = await fetchCurrentNoise();
      mapCtrl.updateNoiseDisplay(noiseData);
      panel.renderSummary(noiseData);
      panel.renderList(CRL_SONOMETERS, noiseData, async (id) => {
        const s = CRL_SONOMETERS.find(x => x.id === id);
        const now = new Date();
        const from = new Date(now.getTime() - 60 * 60 * 1000); // 1h
        const history = await fetchHistoryFor(id, {
          from: from.toISOString(),
          to: now.toISOString()
        });
        panel.renderDetails(s, history);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Piste active / corridor
  try {
    const runway = await fetchActiveRunway(); // {runway, heading}
    // centre approximatif CRL
    mapCtrl.drawRunwayCorridor({ lat: 50.459, lon: 4.453 }, runway.heading);
  } catch (e) {
    console.warn("Piste active non disponible", e);
  }

  await refreshNoise();
  setInterval(refreshNoise, 30_000); // 30 s
}

main();
