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

    // Prevent resize storms
    let lastW = 0;
    let lastH = 0;

    function resize() {
      const r = resizeCanvasToParent(canvas, ctx, TUNABLES.DPR_CAP);
      if (!r) return;

      if (r.w === lastW && r.h === lastH) return;

      lastW = r.w;
      lastH = r.h;
      w = r.w;
      h = r.h;

      // IMPORTANT: resize must NOT re-roll / respawn nebula.
      // It only informs nebula about viewport sizing (which we keep stable).
      nebula.resize({ w, h });
    }
console.log("Total nebula:", nebula.getTotalCount());
console.log("Nebula within +/-100k of origin:", nebula.countWithin({ x: 0, y: 0, range: 100000 }));

    // ---- Boot sequence (spawn once + bake once, offscreen) ----
    // 1) size the canvas
    resize();

    // 2) spawn nebula world once + bake all buffers once BEFORE first frame
    // This prevents any "first move chunk" caused by lazy baking.
    nebula.init({ w: w || 1920, h: h || 1080 });
    nebula.prewarm();

    let lastMs = 0;

    function frame(nowMs) {
      const t = nowMs * 0.001;

      const dtRaw = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      const dt = Math.min(dtRaw, 0.033);
      lastMs = nowMs;

      // Camera smoothing
      const target = camTargetRef.current;
      const smooth = camSmoothRef.current;

      // If you ever get a one-time snap on first movement, this helps:
      // snap once if smooth is uninitialized (optional, safe)
      if (!Number.isFinite(smooth.x) || !Number.isFinite(smooth.y)) {
        smooth.x = target.x;
        smooth.y = target.y;
      }

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

      // Meteors
      meteors.maybeSpawn(dt, w, h);
      meteors.draw(ctx, dt);

      // Dust + nebula (nebula is already baked; draw is stable)
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
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, worldSeed, camTargetRef, camSmoothRef]);
}
