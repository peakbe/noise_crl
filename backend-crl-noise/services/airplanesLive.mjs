// airplanesLive.mjs — Source ADS-B Airplanes.live PRO+++

const API_URL = "https://api.airplanes.live/v2/positions";

export async function fetchAirplanesLive() {
  try {
    const r = await fetch(API_URL);
    if (!r.ok) throw new Error("Airplanes.live HTTP " + r.status);

    const j = await r.json();
    return normalizeAirplanesLive(j);
  } catch (e) {
    console.error("Airplanes.live failed:", e);
    return { states: [], timestamp: Date.now(), source: "airplanes.live-error" };
  }
}

function normalizeAirplanesLive(data) {
  if (!data || !data.ac) return { states: [], timestamp: Date.now() };

  const states = data.ac.map(ac => ({
    icao24: ac.hex || null,
    callsign: ac.flight || null,
    origin_country: ac.r || null,
    time_position: ac.t || null,
    last_contact: ac.t || null,
    longitude: ac.lon || null,
    latitude: ac.lat || null,
    baro_altitude: ac.alt_baro || null,
    on_ground: ac.gnd || false,
    velocity: ac.gs || null,
    true_track: ac.track || null,
    vertical_rate: ac.vrate || null,
    geo_altitude: ac.alt_geom || null,
    squawk: ac.sq || null,
    spi: false,
    position_source: 0
  }));

  return {
    states,
    timestamp: Date.now(),
    source: "airplanes.live"
  };
}

