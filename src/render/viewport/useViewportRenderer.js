// src/render/viewport/useViewportRenderer.js
import { useEffect, useRef } from "react";
import { TUNABLES } from "../core/tunables";
import { resizeCanvasToParent } from "../core/canvas";

import { createStarSystem, makeStars } from "../systems/stars";
import { createDustSystem } from "../systems/dust";
import { createMeteorSystem } from "../systems/meteors";

// ❌ IMPORTANT: do NOT import nebula statically here
// import { createNebulaSystem } from "../systems/nebula/nebulaSystem";

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
  worldBoot,
  bootApi,
}) {
  // Keep latest boot refs without re-binding the whole render loop constantly
  const bootRef = useRef({ worldBoot: null, bootApi: null });
  useEffect(() => {
    bootRef.current.worldBoot = worldBoot || null;
    bootRef.current.bootApi = bootApi || null;
  }, [worldBoot, bootApi]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    const WORLD_SEED = getStableWorldSeed(worldSeed);

    // ---- fast systems (safe to create immediately) ----
    const starSystem = createStarSystem();
    const farStars = makeStars(111, 900, 50, "far");
    const nearStars = makeStars(222, 520, 12, "near");

    const dust = createDustSystem();
    const meteors = createMeteorSystem(WORLD_SEED);

    // ---- nebula is deferred + optional ----
    let nebula = null;
    let nebulaImportStarted = false;

    let raf = 0;
    let w = 0;
    let h = 0;
    let lastW = 0;
    let lastH = 0;

    let lastMs = 0;

    // Boot flow bookkeeping
    let bootStarted = false;
    let nebulaStepDone = false;

    let nebulaTimeoutId = 0;

    function resize() {
      const r = resizeCanvasToParent(canvas, ctx, TUNABLES.DPR_CAP);
      if (!r) return;

      if (r.w === lastW && r.h === lastH) return;

      lastW = r.w;
      lastH = r.h;
      w = r.w;
      h = r.h;

      if (nebula?.resize) nebula.resize({ w, h });
    }

    function updateCamera(dt) {
      const target = camTargetRef.current;
      const smooth = camSmoothRef.current;

      if (!Number.isFinite(smooth.x) || !Number.isFinite(smooth.y)) {
        smooth.x = target.x;
        smooth.y = target.y;
      }

      const k = 1 - Math.exp(-TUNABLES.CAMERA_FOLLOW * dt);
      smooth.x += (target.x - smooth.x) * k;
      smooth.y += (target.y - smooth.y) * k;

      return { camX: smooth.x, camY: smooth.y };
    }

    function markNebulaDone(note) {
      if (nebulaStepDone) return;
      nebulaStepDone = true;

      const B = bootRef.current;
      if (B.worldBoot?.active && B.bootApi) {
        B.bootApi.done("nebula", note || "Nebula ready");
      }
    }

    // ✅ Start boot once, and schedule nebula import AFTER a paint.
    function bootStartIfNeeded() {
      if (bootStarted) return;
      bootStarted = true;

      resize();

      const B = bootRef.current;
      const active = Boolean(B.worldBoot?.active);
      const api = B.bootApi;

      // If boot is active, mark fast steps right away.
      if (active && api) {
        api.done("stars", "Stars ready");
        api.done("dust", "Dust ready");
        api.start("nebula", "Loading nebula…");
      }

      // ✅ Hard safety: never hang forever on nebula.
      // (Also: clear any previous timer, just in case)
      if (nebulaTimeoutId) clearTimeout(nebulaTimeoutId);
      nebulaTimeoutId = window.setTimeout(() => {
        markNebulaDone(nebula ? "Nebula streaming" : "Nebula skipped");
      }, 1500);

      // ✅ Defer nebula module import until after overlay has a chance to paint.
      if (!nebulaImportStarted) {
        nebulaImportStarted = true;

        // Two rAFs = "guarantee at least one paint" before heavy work.
        requestAnimationFrame(() => {
          requestAnimationFrame(async () => {
            try {
              const mod = await import("../systems/nebula/nebulaSystem");
              const createNebulaSystem = mod.createNebulaSystem;

              nebula = createNebulaSystem(WORLD_SEED);

              resize();
              nebula?.init?.({ w: w || 1920, h: h || 1080 });

              // Tiny warm-up so first frame has *something*.
              const { camX, camY } = updateCamera(0.016);
              nebula?.prewarmAround?.({
                camX,
                camY,
                w: w || 1920,
                h: h || 1080,
                budgetMs: 4.0,
              });

              // ✅ IMPORTANT: mark nebula done as soon as it's initialized.
              // Don't block on full baking.
              markNebulaDone("Nebula streaming");
            } catch (e) {
              console.error("[NEBULA] dynamic import/init failed:", e);

              // Still release boot + show error state
              markNebulaDone("Nebula failed (skipped)");

              const B2 = bootRef.current;
              if (B2.worldBoot?.active && B2.bootApi) {
                B2.bootApi.error("nebula", "Nebula failed (see console)");
              }
            }
          });
        });
      }
    }

    function drawFrame(nowMs) {
      // Start boot ASAP if active
      if (bootRef.current.worldBoot?.active) {
        bootStartIfNeeded();
      }

      const t = nowMs * 0.001;

      const dtRaw = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      const dt = Math.min(dtRaw, 0.033);
      lastMs = nowMs;

      resize();
      const { camX, camY } = updateCamera(dt);

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

      // Dust
      dust.draw(ctx, { dt, w, h, camX, camY });

      // Nebula (optional)
      if (nebula) {
        nebula?.prewarmAround?.({ camX, camY, w, h, budgetMs: 2.5 });
        nebula?.updateAndDraw?.(ctx, { dt, t, w, h, camX, camY });
      }

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

      raf = requestAnimationFrame(drawFrame);
    }

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (nebulaTimeoutId) clearTimeout(nebulaTimeoutId);
    };

    // ✅ CRITICAL: do NOT depend on worldBoot/bootApi here.
    // We read those through bootRef.
  }, [canvasRef, worldSeed, camTargetRef, camSmoothRef]);
}
