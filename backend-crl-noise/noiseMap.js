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

  // Flag pour éviter le crash heatmap
  map._readyForHeat = false;
  map.whenReady(() => {
    map._readyForHeat = true;
  });

  // Conteneurs
  const markers = new Map();
  let heatLayer = null;
  let runwayLayer = null;
  let runwayLabel = null;

  // ---------------------------------------------------------------------------
  // ICONES IFR ULTRA VISIBLES
  // ---------------------------------------------------------------------------
  function createIcon(color) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
        <!-- Halo lumineux -->
        <circle cx="17" cy="17" r="15" fill="${color}22" />

        <!-- Cercle principal -->
        <circle cx="17" cy="17" r="11" fill="${color}" stroke="#ffffff" stroke-width="2"/>

        <!-- Contour externe -->
        <circle cx="17" cy="17" r="15" fill="none" stroke="${color}" stroke-width="3" />
      </svg>
    `;
    return L.divIcon({
      className: "noise-marker",
      html: svg,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
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
  // HEATMAP (corrigée pour éviter crash width=0)
  // ---------------------------------------------------------------------------
  function updateHeatmap(noiseData) {
    if (!map._readyForHeat) return;

    const points = noiseData.map(n => {
      const s = CRL_SONOMETERS.find(x => x.id === n.id);
      if (!s) return null;

      const intensity = n.LAeq ? Math.min(1, Math.max(0, (n.LAeq - 45) / 35)) : 0;
      return [s.lat, s.lon, intensity];
    }).filter(Boolean);

    if (!points.length) return;

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
// TRAFIC ADS-B (Airplanes.live) + Filtrage 80 km autour EBCI
// ---------------------------------------------------------------------------
let trafficLayer = new Map();

// Coordonnées EBCI (Charleroi)
const EBCI = { lat: 50.459, lon: 4.453 };

// Haversine PRO+++
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateTraffic(traffic) {
  if (!traffic || !traffic.states) return;

  // supprimer anciens marqueurs
  trafficLayer.forEach(m => map.removeLayer(m));
  trafficLayer.clear();

  traffic.states.forEach(ac => {
    if (!ac.latitude || !ac.longitude) return;

    // --- FILTRAGE 80 KM AUTOUR EBCI ----------------------------------------
    const d = distKm(EBCI.lat, EBCI.lon, ac.latitude, ac.longitude);
    if (d > 80) return;

    // --- MARQUEUR IFR -------------------------------------------------------
    const marker = L.circleMarker([ac.latitude, ac.longitude], {
      radius: 5,
      color: "#00aaff",
      fillColor: "#00aaff",
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindPopup(`
      <b>${ac.callsign || ac.icao24}</b><br>
      Distance: ${d.toFixed(1)} km<br>
      Alt: ${ac.geo_altitude ?? "--"} ft<br>
      Vitesse: ${ac.velocity ?? "--"} kt<br>
      Cap: ${ac.true_track ?? "--"}°
    `);

    trafficLayer.set(ac.icao24, marker);
  });
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

return {
  map,
  updateNoiseDisplay,
  drawRunwayCorridor,
  updateTraffic
};
