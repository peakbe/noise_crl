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
  }).setView([50.459, 4.453], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // ---------------------------------------------------------------------------
  // PATCH DÉFINITIF ANTI-HEATMAP CRASH
  // ---------------------------------------------------------------------------
  map._readyForHeat = false;
  map._heatmapAllowed = false;

  map.whenReady(() => {
    map._readyForHeat = true;
  });

  // Attendre que le DIV #map ait une taille non nulle
  function waitForVisibleMap() {
    const size = map.getSize();
    if (size.x > 0 && size.y > 0) {
      map._heatmapAllowed = true;
    } else {
      setTimeout(waitForVisibleMap, 100);
    }
  }
  waitForVisibleMap();
  
  // ---------------------------------------------------------------------------
  // CONTENEURS
  // ---------------------------------------------------------------------------
  const markers = new Map();
  let heatLayer = null;
  let runwayLayer = null;
  let runwayLabel = null;
  let trafficLayer = new Map();

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
  // Carte pas prête
  if (!map._readyForHeat) return;

  // Taille du canvas pas encore calculée
  const size = map.getSize();
  if (size.x === 0 || size.y === 0) return;

  // Points bruit
  const points = noiseData.map(n => {
    const s = CRL_SONOMETERS.find(x => x.id === n.id);
    if (!s) return null;

    const intensity = n.LAeq ? Math.min(1, Math.max(0, (n.LAeq - 45) / 35)) : 0;
    return [s.lat, s.lon, intensity];
  }).filter(Boolean);

  if (!points.length) return;

  // Création / mise à jour heatmap
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
    const app = detectApproach(ac);
    
function createAircraftIcon(heading) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"
         style="transform: rotate(${heading}deg);">
      <polygon points="18,2 22,14 18,12 14,14" fill="#00aaff"/>
      <rect x="17" y="12" width="2" height="14" fill="#00aaff"/>
      <polygon points="18,26 24,32 18,30 12,32" fill="#00aaff"/>
    </svg>
  `;
  return L.divIcon({
    className: "aircraft-icon",
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

    function drawVelocityVector(lat, lon, heading, speedKt) {
  if (!speedKt || speedKt < 30) return null; // ignore avions lents

  const distanceNm = Math.min(speedKt / 60 * 2, 3); // 2 minutes max, capé à 3 NM
  const distanceKm = distanceNm * 1.852;

  const R = 6371;
  const brg = heading * Math.PI / 180;

  const lat2 = lat + (distanceKm / R) * (180 / Math.PI) * Math.cos(brg);
  const lon2 = lon + (distanceKm / R) * (180 / Math.PI) * Math.sin(brg) / Math.cos(lat * Math.PI / 180);

  return L.polyline([[lat, lon], [lat2, lon2]], {
    color: "#00aaff",
    weight: 2,
    opacity: 0.8
  });
}

    // --- FILTRAGE 80 KM AUTOUR EBCI ----------------------------------------
    const d = distKm(EBCI.lat, EBCI.lon, ac.latitude, ac.longitude);
    if (d > 80) return;

    // --- MARQUEUR IFR -------------------------------------------------------
    const color = app
  ? (app.runway === "06" ? "#00ff00" : "#ff0000")
  : "#00aaff";

const icon = createAircraftIcon(ac.true_track || 0);

const marker = L.marker([ac.latitude, ac.longitude], {
  icon
}).addTo(map);

// vecteur vitesse
const vector = drawVelocityVector(
  ac.latitude,
  ac.longitude,
  ac.true_track,
  ac.velocity
);

if (vector) vector.addTo(map);

// popup IFR
marker.bindPopup(`
  <b>${ac.callsign || ac.icao24}</b><br>
  Cap : ${ac.true_track ?? "--"}°<br>
  Vitesse : ${ac.velocity ?? "--"} kt<br>
  Altitude : ${ac.geo_altitude ?? "--"} ft<br>
`);



    trafficLayer.set(ac.icao24, marker);
if (vector) trafficLayer.set(ac.icao24 + "_vec", vector);

  });
}

// ---------------------------------------------------------------------------
// DETECTION APPROCHE RWY 06 / 24 (EBCI)
// ---------------------------------------------------------------------------

// Seuils de piste EBCI
const RWY06 = { lat: 50.45878, lon: 4.45347, heading: 58 };
const RWY24 = { lat: 50.46088, lon: 4.45539, heading: 238 };

// Conversion degrés → radians
function toRad(d) { return d * Math.PI / 180; }

// Bearing entre deux points
function bearingTo(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Distance NM
function distNm(lat1, lon1, lat2, lon2) {
  return distKm(lat1, lon1, lat2, lon2) / 1.852;
}

// Différence d’angle absolue
function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Détection approche
function detectApproach(ac) {
  if (!ac.latitude || !ac.longitude || !ac.true_track) return null;

  // RWY 06
  const brg06 = bearingTo(ac.latitude, ac.longitude, RWY06.lat, RWY06.lon);
  const diff06 = angleDiff(brg06, RWY06.heading);
  const d06 = distNm(ac.latitude, ac.longitude, RWY06.lat, RWY06.lon);

  const is06 =
    diff06 < 20 &&        // alignement
    d06 > 2 && d06 < 20 && // distance utile
    ac.vertical_rate < 0;  // descente

  if (is06) return { runway: "06", distance: d06, diff: diff06 };

  // RWY 24
  const brg24 = bearingTo(ac.latitude, ac.longitude, RWY24.lat, RWY24.lon);
  const diff24 = angleDiff(brg24, RWY24.heading);
  const d24 = distNm(ac.latitude, ac.longitude, RWY24.lat, RWY24.lon);

  const is24 =
    diff24 < 20 &&
    d24 > 2 && d24 < 20 &&
    ac.vertical_rate < 0;

  if (is24) return { runway: "24", distance: d24, diff: diff24 };

  return null;
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
