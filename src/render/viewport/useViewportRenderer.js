// src/render/viewport/useViewportRenderer.js
import { useEffect } from "react";
import { TUNABLES } from "../core/tunables";
import { resizeCanvasToParent } from "../core/canvas";

import { createStarSystem, makeStars } from "../systems/stars";
import { createDustSystem } from "../systems/dust";
import { createMeteorSystem } from "../systems/meteors";
import { createNebulaSystem } from "../systems/nebula/nebulaSystem";

function getStableWorldSeed(worldSeedProp) {
  const WORLD_SEED_KEY = "space_world_seed_v1";

  let seed = Number.isFinite(worldSeedProp)
    ? worldSeedProp
    : Number(localStorage.getItem(WORLD_SEED_KEY));

  if (!Number.isFinite(seed)) {
    seed = (Math.random() * 2 ** 32) >>> 0;
    localStorage.setItem(WORLD_SEED_KEY, String(seed));
  }

  if (Number.isFinite(worldSeedProp)) {
    localStorage.setItem(WORLD_SEED_KEY, String(worldSeedProp));
  }

  return seed >>> 0;
}

export function useViewportRenderer({
  canvasRef,
  worldSeed,
  camTargetRef,
  camSmoothRef,
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });

    const WORLD_SEED = getStableWorldSeed(worldSeed);

    // Systems
    const starSystem = createStarSystem();
    const farStars = makeStars(111, 900, 50, "far");
    const nearStars = makeStars(222, 520, 12, "near");

    const dust = createDustSystem();
    const meteors = createMeteorSystem(WORLD_SEED);
    const nebula = createNebulaSystem(WORLD_SEED);

    let raf = 0;
    let w = 0;
    let h = 0;

    function resize() {
      const r = resizeCanvasToParent(canvas, ctx, TUNABLES.DPR_CAP);
      if (!r) return;

      w = r.w;
      h = r.h;

      // match original behavior: rebuild nebula on resize
      nebula.reset({ w, h });
    }

    let lastMs = 0;

    function frame(nowMs) {
      const t = nowMs * 0.001;

      const dtRaw = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      const dt = Math.min(dtRaw, 0.033);
      lastMs = nowMs;

      // Camera smoothing
      const target = camTargetRef.current;
      const smooth = camSmoothRef.current;
      const k = 1 - Math.exp(-TUNABLES.CAMERA_FOLLOW * dt);
      smooth.x += (target.x - smooth.x) * k;
      smooth.y += (target.y - smooth.y) * k;

      const camX = smooth.x;
      const camY = smooth.y;

      // Clear
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Far stars
      starSystem.drawStars(ctx, farStars, {
        w,
        h,
        camX,
        camY,
        scale: TUNABLES.SCALES.FAR,
        t,
        layerAlphaMult: 1,
        isFarLayer: true,
      });

      // Meteors (NOTE: API is maybeSpawn, not maybeSpawnMeteor)
      meteors.maybeSpawn(dt, w, h);
      meteors.draw(ctx, dt);

      // Dust + nebula
      dust.draw(ctx, { dt, w, h, camX, camY });
      nebula.updateAndDraw(ctx, { dt, t, w, h, camX, camY });

      // Near stars
      starSystem.drawStars(ctx, nearStars, {
        w,
        h,
        camX,
        camY,
        scale: TUNABLES.SCALES.NEAR,
        t,
        layerAlphaMult: 1,
        isFarLayer: false,
      });

      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, worldSeed, camTargetRef, camSmoothRef]);
}
