// noiseApi.js
// À brancher sur ton backend (REST, WebSocket, etc.)

const BASE_URL = "/api/noise"; // à adapter

export async function fetchCurrentNoise() {
  // GET /api/noise/current -> [{id, LAeq, Lmax, timestamp}, ...]
  const res = await fetch(`${BASE_URL}/current`);
  if (!res.ok) throw new Error("Erreur API bruit courant");
  return res.json();
}

export async function fetchHistoryFor(id, { from, to }) {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${BASE_URL}/history/${id}?${params.toString()}`);
  if (!res.ok) throw new Error("Erreur API historique bruit");
  return res.json();
}

// Optionnel : piste active / QFU
export async function fetchActiveRunway() {
  const res = await fetch(`/api/airport/crl/active-runway`);
  if (!res.ok) throw new Error("Erreur API piste active");
  return res.json(); // { runway: "07", heading: 70, wind: {dir, speed} }
}
