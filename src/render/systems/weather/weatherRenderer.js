// src/render/systems/weather/weatherRenderer.js

export function renderWeather(ctx, frame, { weather }) {
  if (!weather || weather.type === "clear") return;

  const { type, intensity = 1.0 } = weather;

  if (type === "rain") renderRain(ctx, frame, intensity);
  if (type === "fog")  renderFog(ctx, frame, intensity);
  if (type === "snow") renderSnow(ctx, frame, intensity);
}

// ---- Rain ----
const rainParticles = [];
function ensureRain(count) {
  while (rainParticles.length < count) {
    rainParticles.push({
      x: Math.random(),   // 0-1 normalized to screen
      y: Math.random(),
      speed: 0.3 + Math.random() * 0.3,
      length: 6 + Math.random() * 8,
    });
  }
}

function renderRain(ctx, { dt, w, h }, intensity) {
  const count = Math.floor(200 * intensity);
  ensureRain(count);

  ctx.save();
  ctx.strokeStyle = `rgba(180, 200, 255, ${0.35 * intensity})`;
  ctx.lineWidth = 1;

  for (let i = 0; i < count; i++) {
    const p = rainParticles[i];
    p.y += p.speed * dt;
    p.x += 0.08 * dt; // slight angle
    if (p.y > 1) { p.y = 0; p.x = Math.random(); }
    if (p.x > 1) { p.x = 0; }

    const sx = p.x * w;
    const sy = p.y * h;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + p.length * 0.4, sy + p.length);
    ctx.stroke();
  }

  ctx.restore();
}

// ---- Fog ----
function renderFog(ctx, { t, w, h }, intensity) {
  ctx.save();

  // 3 drifting fog blobs
  const blobs = [
    { ox: 0.0, oy: 0.0, r: 0.6, speed: 0.04 },
    { ox: 0.5, oy: 0.3, r: 0.5, speed: 0.03 },
    { ox: 0.2, oy: 0.7, r: 0.55, speed: 0.05 },
  ];

  for (const b of blobs) {
    const cx = (b.ox + Math.sin(t * b.speed) * 0.15) * w;
    const cy = (b.oy + Math.cos(t * b.speed * 0.7) * 0.1) * h;
    const r = b.r * Math.max(w, h);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(200, 210, 220, ${0.12 * intensity})`);
    grad.addColorStop(1, `rgba(200, 210, 220, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

// ---- Snow ----
const snowParticles = [];
function ensureSnow(count) {
  while (snowParticles.length < count) {
    snowParticles.push({
      x: Math.random(),
      y: Math.random(),
      speed: 0.04 + Math.random() * 0.06,
      radius: 1 + Math.random() * 2,
      drift: Math.random() * Math.PI * 2, // phase offset for sway
    });
  }
}

function renderSnow(ctx, { dt, t, w, h }, intensity) {
  const count = Math.floor(120 * intensity);
  ensureSnow(count);

  ctx.save();
  ctx.fillStyle = `rgba(240, 248, 255, ${0.8 * intensity})`;

  for (let i = 0; i < count; i++) {
    const p = snowParticles[i];
    p.y += p.speed * dt;
    p.x += Math.sin(t * 0.5 + p.drift) * 0.001; // gentle sway
    if (p.y > 1) { p.y = 0; p.x = Math.random(); }

    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}