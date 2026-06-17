// noisePanel.js
import { getNoiseClass, getNoiseColor } from "./noiseConfig.js";

export function initNoisePanel(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <div class="panel-header">
      <span class="title">CRL – BRUIT</span>
      <span class="subtitle">LIVE</span>
    </div>
    <div class="panel-body">
      <div id="np-summary"></div>
      <div id="np-list"></div>
      <div id="np-details"></div>
    </div>
  `;

  function renderSummary(noiseData) {
    if (!noiseData || noiseData.length === 0) {
      document.getElementById("np-summary").innerHTML = "<em>Aucune donnée</em>";
      return;
    }
    const laeqValues = noiseData.map(n => n.LAeq).filter(v => v != null);
    const avg = laeqValues.reduce((a, b) => a + b, 0) / laeqValues.length;
    const max = Math.max(...laeqValues);
    const color = getNoiseColor(avg);

    document.getElementById("np-summary").innerHTML = `
      <div class="summary-card" style="border-color:${color}">
        <div class="summary-main">
          <span class="label">LAeq moyen</span>
          <span class="value" style="color:${color}">${avg.toFixed(1)} dB(A)</span>
        </div>
        <div class="summary-secondary">
          <span>Max réseau: ${max.toFixed(1)} dB(A)</span>
          <span>Stations: ${noiseData.length}</span>
        </div>
      </div>
    `;
  }

  function renderList(sonometers, noiseData, onSelect) {
    const byId = new Map(noiseData.map(n => [n.id, n]));
    const rows = sonometers.map(s => {
      const n = byId.get(s.id);
      const laeq = n?.LAeq ?? null;
      const color = getNoiseColor(laeq);
      const cls = getNoiseClass(laeq);
      return `
        <div class="np-row" data-id="${s.id}">
          <span class="np-id">${s.id}</span>
          <span class="np-commune">${s.commune}</span>
          <span class="np-laeq" style="color:${color}">
            ${laeq != null ? laeq.toFixed(1) : "--"} dB
          </span>
          <span class="np-class np-class-${cls}">${cls}</span>
        </div>
      `;
    }).join("");

    const listEl = document.getElementById("np-list");
    listEl.innerHTML = rows;

    listEl.querySelectorAll(".np-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-id");
        onSelect?.(id);
      });
    });
  }

  function renderDetails(sonometer, history) {
    const elDet = document.getElementById("np-details");
    if (!sonometer) {
      elDet.innerHTML = "<em>Sélectionne un sonomètre</em>";
      return;
    }
    const last = history?.[history.length - 1];
    const color = getNoiseColor(last?.LAeq);

    elDet.innerHTML = `
      <div class="details-card">
        <div class="details-header">
          <span class="id">${sonometer.id}</span>
          <span class="commune">${sonometer.commune}</span>
        </div>
        <div class="details-main" style="border-color:${color}">
          <div>
            <span class="label">Adresse</span>
            <span class="value">${sonometer.address}</span>
          </div>
          <div>
            <span class="label">Dernier LAeq</span>
            <span class="value" style="color:${color}">
              ${last?.LAeq != null ? last.LAeq.toFixed(1) : "--"} dB(A)
            </span>
          </div>
          <div>
            <span class="label">Dernier Lmax</span>
            <span class="value">
              ${last?.Lmax != null ? last.Lmax.toFixed(1) : "--"} dB(A)
            </span>
          </div>
          <div>
            <span class="label">Horodatage</span>
            <span class="value">
              ${last ? new Date(last.timestamp).toLocaleString() : "--"}
            </span>
          </div>
        </div>
        <div class="details-chart-placeholder">
          <em>Graphique LAeq/Lmax (à brancher sur lib de chart)</em>
        </div>
      </div>
    `;
  }

  return {
    renderSummary,
    renderList,
    renderDetails
  };
}
