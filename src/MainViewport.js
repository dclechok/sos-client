// src/MainViewport.jsx
import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef, useCallback, useMemo, useEffect } from "react";

import { useTerrainAtlas } from "./render/systems/terrain/useTerrainAtlas";
import { renderTerrain } from "./render/systems/terrain/terrainRenderer";

import { useFoliageAssets } from "./render/systems/foliage/useFoliageAssets";
import {
  renderFoliage,
  makeDefaultFoliageRegistry,
} from "./render/systems/foliage/foliageRenderer";

import { useWeatherCycle } from "./render/systems/weather/useWeather";
import { renderWeather } from "./render/systems/weather/weatherRenderer";

export default function MainViewport({
  world,
  canvasRef,
  zoom = 2,
  camTargetRef,
  camSmoothRef,
}) {
  const localCanvasRef = useRef(null);
  const refToUse = canvasRef || localCanvasRef;

  // ✅ block browser zoom on canvas
  useEffect(() => {
    const canvas = refToUse.current;
    if (!canvas) return;
    const onWheel = (e) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [refToUse]);

  const atlas = useTerrainAtlas({
    atlasSrc: "/art/terrain/terrain.png",
    atlasCols: 3,
    gap: 2,
    margin: 2,
    grassTiles: [0, 1, 2],
    waterTiles: [3, 4, 5],
  });

  const foliageAssets = useFoliageAssets({
    tuft1Src: "/art/foliage/grasstuft1.png",
    tuft2Src: "/art/foliage/grasstuft2.png",
  });

  const foliageRegistry = useMemo(
    () => makeDefaultFoliageRegistry(foliageAssets),
    [foliageAssets]
  );

  const weather = useWeatherCycle({ regionId: "world" });

  const render = useCallback(
    (ctx, frame) => {
      renderTerrain(ctx, frame, { world, atlas });
      renderFoliage(ctx, frame, {
        world,
        foliage: {
          assets: foliageAssets,
          registry: foliageRegistry,
          seed: 4242,
        },
      });
      renderWeather(ctx, frame, { weather });
    },
    [world, atlas, foliageAssets, foliageRegistry, weather]
  );

  useViewportRenderer({
    canvasRef: refToUse,
    camTargetRef,
    camSmoothRef,
    zoom,
    pixelArt: true,
    clearColor: "#000",
    render,
  });

  return (
    <div className="main-viewport">
      <canvas ref={refToUse} />
    </div>
  );
}