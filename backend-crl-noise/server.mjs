// server.mjs — Backend PRO+++ CRL Noise (Render compatible)

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { router as apiRouter } from "./routes.mjs";
import { fetchAirplanesLive } from "./services/airplanesLive.mjs";

dotenv.config();

// -----------------------------------------------------------------------------
// RESOLUTION DES CHEMINS
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// APP
// -----------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 4000;

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

// Route ADS-B directe
app.get("/api/adsb/live", async (req, res) => {
  try {
    const data = await fetchAirplanesLive();
    res.json(data);
  } catch (e) {
    console.error("ADS-B error:", e);
    res.status(500).json({ error: "ADS-B fetch failed" });
  }
});

// -----------------------------------------------------------------------------
// FRONTEND STATIC (depuis /public à la racine du repo)
// -----------------------------------------------------------------------------
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// -----------------------------------------------------------------------------
// ROUTE PAR DÉFAUT → noise-crl.html
// -----------------------------------------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "noise-crl.html"));
});

// -----------------------------------------------------------------------------
// LANCEMENT SERVEUR
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`CRL Noise backend + frontend running on port ${PORT}`);
});
