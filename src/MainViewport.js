// src/MainViewport.jsx
//
// render() must stay stable (empty deps) so useViewportRenderer never restarts
// its RAF loop. Any changing values are read through refs inside render().

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

// ── These must match the constants in server/sockets/playerState.js ──────────
const PLAYER_RADIUS    = 5;  // server: PLAYER_RADIUS
const FOOT_OFFSET_Y    = 6;  // server: FOOT_OFFSET_Y

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

  // Stable sprite resolver — reads myId/sprites from refs
  const getPlayerSpriteSrc = useCallback((id, p) => {
    const fallback =
      id === myIdRef.current ? mySpriteSrcRef.current : otherSpriteSrcRef.current;
    const cls = p?.class;
    return cls ? getSpriteByClassId(cls, fallback) : fallback;
  }, []);

  const getPlayerSpriteSrcRef = useRef(getPlayerSpriteSrc);
  useEffect(() => { getPlayerSpriteSrcRef.current = getPlayerSpriteSrc; }, [getPlayerSpriteSrc]);

  // ─── STABLE render callback — created once, reads all state from refs ─────
  const render = useCallback((ctx, frame) => {
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

    // Debug overlay — press ` to toggle
    // playerRadius and playerFootOffsetY mirror server/sockets/playerState.js constants
    renderCollisionDebug(ctx, frame, {
      objects:           worldObjectsRef.current,
      objectDefs:        objectDefsRef.current,
      playerPos:         predictedLocalPosRefRef.current?.current ?? null,
      playerRadius:      PLAYER_RADIUS,
      playerFootOffsetY: FOOT_OFFSET_Y,
    });
  }, []);

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
