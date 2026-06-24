import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { router as apiRouter } from "./routes.mjs";

import { fetchAirplanesLive } from "./services/airplanesLive.mjs";

app.get("/api/adsb/live", async (req, res) => {
  const data = await fetchAirplanesLive();
  res.json(data);
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// -----------------------------------------------------------------------------
// RESOLUTION DES CHEMINS (important pour Render)
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// MIDDLEWARES
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// -----------------------------------------------------------------------------
// API BACKEND
// -----------------------------------------------------------------------------
app.use("/api", apiRouter);

// -----------------------------------------------------------------------------
// FRONTEND STATIQUE (HTML / CSS / JS)
// -----------------------------------------------------------------------------
app.use(express.static("public"));
  
// Sert :
// - noise-crl.html
// - noise-crl.css
// - noiseMain.js
// - noiseMap.js
// - noisePanel.js
// - sonoColors.js
// - crlSonometers.js

// -----------------------------------------------------------------------------
// ROUTE PAR DÉFAUT → renvoie ton dashboard bruit
// -----------------------------------------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "noise-crl.html"));
});

// -----------------------------------------------------------------------------
// LANCEMENT SERVEUR
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`CRL Noise backend + frontend running on port ${PORT}`);
});
