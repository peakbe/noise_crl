import express from "express";
import { getNoiseCurrent, getNoiseHistory } from "./services/noiseService.mjs";
import { getActiveRunway } from "./services/runwayService.mjs";
import { getAdsbLive } from "./services/adsbService.mjs";
import { getWeatherCRL } from "./services/weatherService.mjs";

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
