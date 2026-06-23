// noiseMap.js — Version PRO+++
// Carte Leaflet + Heatmap + Corridor QFU + Coloration sonomètres selon piste active METAR

import "https://unpkg.com/leaflet/dist/leaflet.js";
import "https://unpkg.com/leaflet.heat/dist/leaflet-heat.js";

import { SONO_COLORS, getSonoColorByRunway } from "./sonoColors.js";
import { CRL_SONOMETERS } from "./crlSonometers.js";

// -----------------------------------------------------------------------------
// INIT CARTE
// -----------------------------------------------------------------------------
export function initNoiseMap(divId) {
  const map = L.map(divId, {
    zoomControl: true,
    minZoom: 10,
    maxZoom: 18
  }).setView([50.46, 4.45], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Conteneurs
  const markers = new Map();
  let heatLayer = null;
  let runwayLayer = null;
  let runwayLabel = null;

  // ---------------------------------------------------------------------------
  // ICONES IFR
  // ---------------------------------------------------------------------------
  function createIcon(color) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="11" fill="#001020" stroke="${color}" stroke-width="2"/>
        <circle cx="13" cy="13" r="5" fill="${color}" />
      </svg>`;
    return L.divIcon({
      className: "noise-marker",
      html: svg,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  // ---------------------------------------------------------------------------
  // AJOUT DES SONOMÈTRES
  // ---------------------------------------------------------------------------
  function initMarkers() {
    CRL_SONOMETERS.forEach(s => {
      const marker = L.marker([s.lat, s.lon], {
        icon: createIcon(SONO_COLORS.grey)
      })
        .addTo(map)
        .bindPopup(`<b>${s.id}</b><br>${s.address}<br>${s.commune}`);

      markers.set(s.id, marker);
    });
  }

  initMarkers();

  // ---------------------------------------------------------------------------
  // HEATMAP
  // ---------------------------------------------------------------------------
  function updateHeatmap(noiseData) {
    const points = noiseData.map(n => {
      const s = CRL_SONOMETERS.find(x => x.id === n.id);
      if (!s) return null;

      const intensity = n.LAeq ? Math.min(1, Math.max(0, (n.LAeq - 45) / 35)) : 0;
      return [s.lat, s.lon, intensity];
    }).filter(Boolean);

    if (!heatLayer) {
      heatLayer = L.heatLayer(points, {
        radius: 45,
        blur: 25,
        maxZoom: 17
      }).addTo(map);
    } else {
      heatLayer.setLatLngs(points);
    }
  }

  // ---------------------------------------------------------------------------
  // COLORATION DES SONOMÈTRES SELON PISTE ACTIVE
  // ---------------------------------------------------------------------------
  function updateMarkers(noiseData, activeRunway) {
    const byId = new Map(noiseData.map(n => [n.id, n]));

    CRL_SONOMETERS.forEach(s => {
      const marker = markers.get(s.id);
      const n = byId.get(s.id);

      const color = getSonoColorByRunway(s.id, activeRunway);
      marker.setIcon(createIcon(color));

      if (n) {
        marker.setPopupContent(
          `<b>${s.id}</b><br>${s.address}<br>${s.commune}<br>` +
          `LAeq: ${n.LAeq?.toFixed(1) ?? "--"} dB(A)<br>` +
          `Lmax: ${n.Lmax?.toFixed(1) ?? "--"} dB(A)<br>` +
          `<small>${n.timestamp ?? ""}</small>`
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // AFFICHAGE RWY ACTIVE (LABEL IFR)
  // ---------------------------------------------------------------------------
  function updateRunwayLabel(runway) {
    if (!runwayLabel) {
      runwayLabel = L.control({ position: "topright" });
      runwayLabel.onAdd = () => {
        const div = L.DomUtil.create("div", "runway-label");
        div.style.padding = "6px 10px";
        div.style.background = "#02101caa";
        div.style.border = "1px solid #0af";
        div.style.color = "#7fd0ff";
        div.style.fontWeight = "600";
        div.style.borderRadius = "4px";
        div.innerHTML = `Piste active : RWY ${runway}`;
        return div;
      };
      runwayLabel.addTo(map);
    } else {
      runwayLabel.getContainer().innerHTML = `Piste active : RWY ${runway}`;
    }
  }

  // ---------------------------------------------------------------------------
  // CORRIDOR QFU (RWY 06/24)
  // ---------------------------------------------------------------------------
  function drawRunwayCorridor(center, headingDeg, lengthNm = 8, widthNm = 1.5) {
    if (runwayLayer) map.removeLayer(runwayLayer);

    const rad = headingDeg * Math.PI / 180;
    const nmLat = 1 / 60;
    const nmLon = 1 / (60 * Math.cos(center.lat * Math.PI / 180));

    const halfLen = lengthNm / 2;
    const halfWid = widthNm / 2;

    function offset(dxNm, dyNm) {
      return [
        center.lat + dyNm * nmLat,
        center.lon + dxNm * nmLon
      ];
    }

    const dx = Math.sin(rad) * halfLen;
    const dy = Math.cos(rad) * halfLen;

    const left = halfWid;
    const right = -halfWid;

    const p1 = offset(-dx + left * Math.cos(rad), -dy + left * -Math.sin(rad));
    const p2 = offset(dx + left * Math.cos(rad), dy + left * -Math.sin(rad));
    const p3 = offset(dx + right * Math.cos(rad), dy + right * -Math.sin(rad));
    const p4 = offset(-dx + right * Math.cos(rad), -dy + right * -Math.sin(rad));

    runwayLayer = L.polygon([p1, p2, p3, p4], {
      color: "#00ffff",
      weight: 1.5,
      fillColor: "#00ffff",
      fillOpacity: 0.08
    }).addTo(map);
  }

  // ---------------------------------------------------------------------------
  // API PUBLIQUE DU MODULE
  // ---------------------------------------------------------------------------
  return {
    map,
    updateNoiseDisplay(noiseData, activeRunway) {
      updateHeatmap(noiseData);
      updateMarkers(noiseData, activeRunway);
      updateRunwayLabel(activeRunway);
    },
    drawRunwayCorridor
  };
}
