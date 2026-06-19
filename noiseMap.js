// noiseMap.js
import "https://unpkg.com/leaflet/dist/leaflet.js";
import "https://unpkg.com/leaflet.heat/dist/leaflet-heat.js";
import { getNoiseColor } from "./noiseConfig.js";

export function initNoiseMap(divId, sonometers, options = {}) {
  const map = L.map(divId, {
    zoomControl: true
  }).setView([50.46, 4.45], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const markers = new Map();

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

  sonometers.forEach(s => {
    const marker = L.marker([s.lat, s.lon], {
      icon: createIcon("#00b0ff")
    }).addTo(map);

    marker.bindPopup(`<b>${s.id}</b><br>${s.address}<br>${s.commune}`);
    markers.set(s.id, marker);
  });

  let heatLayer = L.heatLayer([], {
    radius: 45,
    blur: 25,
    maxZoom: 17
  }).addTo(map);
  
export function getSonoColorByRunway(id, runway) {
  id = id.toUpperCase();

  // --- PISTE 24 ---
  if (runway === "24") {
    return RUNWAY_24_GREEN.includes(id) ? "green" : "grey";
  }

  // --- PISTE 06 ---
  if (runway === "06") {
    if (RUNWAY_06_GREEN.includes(id)) return "green";
    if (RUNWAY_06_RED.includes(id)) return "red";
    return "grey";
  }

  // Si piste inconnue
  return "grey";
}

  function updateNoiseDisplay(noiseData) {
    // noiseData: [{id, LAeq, Lmax, timestamp}, ...]
    const heatPoints = [];

    noiseData.forEach(n => {
      const s = sonometers.find(x => x.id === n.id);
      if (!s) return;

      const color = getNoiseColor(n.LAeq);
      const marker = markers.get(n.id);
      if (marker) {
        marker.setIcon(createIcon(color));
        marker.setPopupContent(
          `<b>${s.id}</b><br>${s.address}<br>${s.commune}<br>` +
          `LAeq: ${n.LAeq?.toFixed(1)} dB(A)<br>` +
          `Lmax: ${n.Lmax?.toFixed(1)} dB(A)<br>` +
          `<small>${new Date(n.timestamp).toLocaleString()}</small>`
        );
      }

      // Normalisation heatmap (0–1)
      const intensity = Math.min(1, Math.max(0, (n.LAeq - 45) / 35));
      heatPoints.push([s.lat, s.lon, intensity]);
    });

    heatLayer.setLatLngs(heatPoints);
  }

  // Corridor QFU (optionnel)
  let runwayLayer = null;
  function drawRunwayCorridor(center, headingDeg, lengthNm = 8, widthNm = 1.5) {
    if (runwayLayer) {
      map.removeLayer(runwayLayer);
    }
    // Simplifié: rectangle approximatif
    const rad = (headingDeg * Math.PI) / 180;
    const nmToDegLat = 1 / 60;
    const nmToDegLon = 1 / (60 * Math.cos(center.lat * Math.PI / 180));

    const halfLen = lengthNm / 2;
    const halfWid = widthNm / 2;

    function offset(dxNm, dyNm) {
      return [
        center.lat + dyNm * nmToDegLat,
        center.lon + dxNm * nmToDegLon
      ];
    }

    // Axe piste
    const dx = Math.sin(rad) * halfLen;
    const dy = Math.cos(rad) * halfLen;

    const leftOffset = halfWid;
    const rightOffset = -halfWid;

    const p1 = offset(-dx + leftOffset * Math.cos(rad), -dy + leftOffset * -Math.sin(rad));
    const p2 = offset(dx + leftOffset * Math.cos(rad), dy + leftOffset * -Math.sin(rad));
    const p3 = offset(dx + rightOffset * Math.cos(rad), dy + rightOffset * -Math.sin(rad));
    const p4 = offset(-dx + rightOffset * Math.cos(rad), -dy + rightOffset * -Math.sin(rad));

    runwayLayer = L.polygon([p1, p2, p3, p4], {
      color: "#00ffff",
      weight: 1.5,
      fillColor: "#00ffff",
      fillOpacity: 0.08
    }).addTo(map);
  }

  return {
    map,
    updateNoiseDisplay,
    drawRunwayCorridor
  };
}
