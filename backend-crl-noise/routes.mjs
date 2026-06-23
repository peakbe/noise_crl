import express from "express";
import { getNoiseCurrent, getNoiseHistory } from "./services/noiseService.mjs";
import { getActiveRunway } from "./services/runwayService.mjs";
import { getAdsbLive } from "./services/adsbService.mjs";
import { getWeatherCRL } from "./services/weatherService.mjs";
import { getMetarStatus } from "./services/metarService.mjs";
import { getRunwayStatus } from "./services/runwayService.mjs";
import { getNoiseStatus } from "./services/noiseService.mjs";
import { getAdsbStatus } from "./services/adsbService.mjs";

export const router = express.Router();

router.get("/noise/current", async (req, res, next) => {
  try {
    res.json(await getNoiseCurrent());
  } catch (e) { next(e); }
});

router.get("/noise/history/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    res.json(await getNoiseHistory(id, from, to));
  } catch (e) { next(e); }
});

router.get("/airport/crl/active-runway", async (req, res, next) => {
  try {
    res.json(await getActiveRunway());
  } catch (e) { next(e); }
});

router.get("/adsb/live", async (req, res, next) => {
  try {
    res.json(await getAdsbLive());
  } catch (e) { next(e); }
});

router.get("/weather/current", async (req, res, next) => {
  try {
    res.json(await getWeatherCRL());
  } catch (e) { next(e); }
});

router.get("/monitoring", async (req, res) => {
  try {
    const metar = await getMetarStatus();
    const runway = await getRunwayStatus();
    const noise = await getNoiseStatus();
    const adsb = await getAdsbStatus();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: { metar, runway, noise, adsb }
    });
  } catch (e) {
    res.status(500).json({
      status: "error",
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
});
