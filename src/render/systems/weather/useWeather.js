// src/render/systems/weather/useWeatherCycle.js
import { useState, useEffect } from "react";
import { WEATHER_TUNABLES } from "../../core/tunables";

export function useWeatherCycle({ regionId = "world" } = {}) {
  const [weather, setWeather] = useState(() => pickWeather(regionId));

  useEffect(() => {
    const id = setInterval(() => {
      setWeather(pickWeather(regionId));
    }, WEATHER_TUNABLES.CYCLE_DURATION_MS);

    return () => clearInterval(id);
  }, [regionId]);

  return weather;
}

function pickWeather(regionId) {
  const cfg = WEATHER_TUNABLES.regions[regionId]
           ?? WEATHER_TUNABLES.regions.world;  // fallback

  const roll = Math.random();

  if (roll < cfg.rainChance) {
    return { regionId, type: "rain", intensity: cfg.rainIntensity };
  }

  if (roll < cfg.rainChance + cfg.snowChance) {
    return { regionId, type: "snow", intensity: cfg.snowIntensity };
  }

  return { regionId, type: "clear", intensity: 0 };
}