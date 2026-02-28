// src/MainViewport.jsx
//
// Key changes:
// - Accepts onStepPredictionReady prop — PlayerRenderer calls this with its
//   stepPrediction function once on mount.
// - render() calls stepPredictionRef.current(frame.dt) at the very top, so
//   prediction advances exactly once per rendered frame, fully synchronized.
//   This replaces the old standalone RAF loop in PlayerRenderer.
// - Everything else (stable render callback, ref mirroring) is unchanged.

import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef, useCallback, useMemo, useEffect } from "react";

import { useTerrainAtlas }    from "./render/systems/terrain/useTerrainAtlas";
import { renderTerrain }      from "./render/systems/terrain/terrainRenderer";

import { useFoliageAssets }   from "./render/systems/foliage/useFoliageAssets";
import {
  renderFoliage,
  makeDefaultFoliageRegistry,
} from "./render/systems/foliage/foliageRenderer";

import { useWeatherCycle }    from "./render/systems/weather/useWeather";
import { renderWeather }      from "./render/systems/weather/weatherRenderer";

import { renderSortedSprites } from "./render/systems/sprites/sortedSpriteRenderer";
import { getSpriteByClassId }  from "./render/players/characterClasses";

import { renderCollisionDebug } from "./render/systems/debug/collisionDebugRenderer";

export default function MainViewport({
  world,
  canvasRef,
  zoom = 2,
  camTargetRef,
  camSmoothRef,

  worldObjects = [],
  objectDefs   = {},

  players        = null,
  myId           = null,
  mySpriteSrc    = "/art/items/sprites/AdeptNecromancer.gif",
  otherSpriteSrc = "/art/items/sprites/NovicePyromancer.gif",
  playerSpriteW  = 16,
  playerSpriteH  = 16,

  predictedLocalPosRef = null,

  // ✅ PlayerRenderer calls this with its stepPrediction fn once on mount.
  // We store it in a ref and call it at the top of every render frame so
  // prediction and drawing are always in sync on the same RAF tick.
  onStepPredictionReady,
}) {
  const localCanvasRef = useRef(null);
  const refToUse       = canvasRef || localCanvasRef;

  useEffect(() => {
    const canvas = refToUse.current;
    if (!canvas) return;
    const onWheel = (e) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [refToUse]);

  // ─── stepPrediction ref — wired up by PlayerRenderer via onStepPredictionReady
  const stepPredictionRef = useRef(null);

  // Expose a stable setter so App.jsx can pass it down as a plain callback
  // without needing to re-create anything.
  const handleStepPredictionReady = useCallback((fn) => {
    stepPredictionRef.current = fn;
  }, []);

  // Forward to whatever was passed in from outside (App.jsx passes it to PlayerRenderer)
  useEffect(() => {
    if (typeof onStepPredictionReady === "function") {
      onStepPredictionReady(handleStepPredictionReady);
    }
  }, [onStepPredictionReady, handleStepPredictionReady]);

  // ─── Asset hooks ────────────────────────────────────────────────────────
  const atlas = useTerrainAtlas({
    atlasSrc:   "/art/terrain/terrain.png",
    atlasCols:  3,
    gap:        2,
    margin:     2,
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

  // ─── Mirror everything into refs ────────────────────────────────────────
  const worldRef           = useRef(world);
  const atlasRef           = useRef(atlas);
  const foliageAssetsRef   = useRef(foliageAssets);
  const foliageRegistryRef = useRef(foliageRegistry);
  const weatherRef         = useRef(weather);

  const playersRef      = useRef(players);
  const worldObjectsRef = useRef(worldObjects);
  const objectDefsRef   = useRef(objectDefs);

  const myIdRef           = useRef(myId);
  const mySpriteSrcRef    = useRef(mySpriteSrc);
  const otherSpriteSrcRef = useRef(otherSpriteSrc);

  const predictedLocalPosRefRef = useRef(predictedLocalPosRef);
  const playerSpriteWRef        = useRef(playerSpriteW);
  const playerSpriteHRef        = useRef(playerSpriteH);

  useEffect(() => { worldRef.current           = world;           }, [world]);
  useEffect(() => { atlasRef.current           = atlas;           }, [atlas]);
  useEffect(() => { foliageAssetsRef.current   = foliageAssets;   }, [foliageAssets]);
  useEffect(() => { foliageRegistryRef.current = foliageRegistry; }, [foliageRegistry]);
  useEffect(() => { weatherRef.current         = weather;         }, [weather]);

  useEffect(() => { playersRef.current      = players;      }, [players]);
  useEffect(() => { worldObjectsRef.current = worldObjects; }, [worldObjects]);
  useEffect(() => { objectDefsRef.current   = objectDefs;   }, [objectDefs]);

  useEffect(() => { myIdRef.current           = myId;           }, [myId]);
  useEffect(() => { mySpriteSrcRef.current    = mySpriteSrc;    }, [mySpriteSrc]);
  useEffect(() => { otherSpriteSrcRef.current = otherSpriteSrc; }, [otherSpriteSrc]);

  useEffect(() => { predictedLocalPosRefRef.current = predictedLocalPosRef; }, [predictedLocalPosRef]);
  useEffect(() => { playerSpriteWRef.current        = playerSpriteW;        }, [playerSpriteW]);
  useEffect(() => { playerSpriteHRef.current        = playerSpriteH;        }, [playerSpriteH]);

  // Stable sprite resolver
  const getPlayerSpriteSrc = useCallback((id, p) => {
    const fallback =
      id === myIdRef.current ? mySpriteSrcRef.current : otherSpriteSrcRef.current;
    const cls = p?.class;
    return cls ? getSpriteByClassId(cls, fallback) : fallback;
  }, []);

  const getPlayerSpriteSrcRef = useRef(getPlayerSpriteSrc);
  useEffect(() => { getPlayerSpriteSrcRef.current = getPlayerSpriteSrc; }, [getPlayerSpriteSrc]);

  // ─── STABLE render callback ───────────────────────────────────────────────
  // ✅ Steps prediction FIRST so camTargetRef and predictedLocalPosRef are
  // up-to-date before terrain, sprites, or camera math runs this frame.
  const render = useCallback((ctx, frame) => {
    // Step prediction in sync with this frame's dt — single authoritative step
    stepPredictionRef.current?.(frame.dt);

    renderTerrain(ctx, frame, {
      world: worldRef.current,
      atlas: atlasRef.current,
    });

    renderFoliage(ctx, frame, {
      world: worldRef.current,
      foliage: {
        assets:   foliageAssetsRef.current,
        registry: foliageRegistryRef.current,
        seed:     4242,
      },
    });

    renderSortedSprites(ctx, frame, {
      objects:            worldObjectsRef.current,
      objectDefs:         objectDefsRef.current,
      playersById:        playersRef.current,
      myId:               myIdRef.current,
      predictedLocalPos:  predictedLocalPosRefRef.current?.current ?? null,
      getPlayerSpriteSrc: getPlayerSpriteSrcRef.current,
      playerSpriteW:      playerSpriteWRef.current,
      playerSpriteH:      playerSpriteHRef.current,
    });

    renderWeather(ctx, frame, { weather: weatherRef.current });

    renderCollisionDebug(ctx, frame, {
      objects:      worldObjectsRef.current,
      objectDefs:   objectDefsRef.current,
      playerPos:    predictedLocalPosRefRef.current?.current ?? null,
      playerRadius: 6,
    });
  }, []); // stable — all reads go through refs

  useViewportRenderer({
    canvasRef:  refToUse,
    camTargetRef,
    camSmoothRef,
    zoom,
    pixelArt:   true,
    clearColor: "#000",
    render,
  });

  return (
    <div className="main-viewport">
      <canvas ref={refToUse} />
    </div>
  );
}
