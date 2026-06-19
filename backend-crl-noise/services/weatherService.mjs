import { cache } from "../cache.mjs";
import fetch from "node-fetch";

const KEY = process.env.OPENWEATHER_KEY;

export async function getWeatherCRL() {
  return cache.wrap("weather_crl", 5 * 60_000, async () => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=50.46&lon=4.45&appid=${KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OpenWeather error");
    const json = await res.json();

    return {
      tempC: json.main.temp,
      humidity: json.main.humidity,
      pressureHpa: json.main.pressure,
      wind: {
        dir: json.wind.deg,
        speedKt: json.wind.speed * 1.94384
      },
      clouds: json.clouds.all,
      visibilityM: json.visibility,
      timestamp: new Date().toISOString()
    };
  });
}
