// src/components/WorldBootOverlay.jsx
export default function WorldBootOverlay({ worldBoot }) {
  if (!worldBoot?.active || worldBoot.ready) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        color: "rgba(230,240,255,0.95)",
        zIndex: 20000,
        display: "grid",
        placeItems: "center",
        fontFamily: "monospace",
        padding: 24,
      }}
    >
      <div style={{ width: "min(720px, 92vw)" }}>
        <div style={{ fontSize: 18, marginBottom: 10 }}>Loading world…</div>

        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 14 }}>
          (Systems are building offscreen — rendering will begin when ready.)
        </div>

        <div style={{ border: "1px solid rgba(160,220,255,0.18)", borderRadius: 10, padding: 14 }}>
          {worldBoot.steps.map((k) => {
            const s = worldBoot.state[k];
            const icon =
              s.status === "done" ? "✓" : s.status === "error" ? "✕" : s.status === "working" ? "…" : "•";
            const dim = s.status === "done" ? 0.75 : 1;

            return (
              <div key={k} style={{ display: "flex", gap: 10, padding: "6px 0", opacity: dim }}>
                <div style={{ width: 18, textAlign: "center" }}>{icon}</div>
                <div style={{ width: 140 }}>{k}</div>
                <div style={{ opacity: 0.75 }}>{s.note || ""}</div>
              </div>
            );
          })}
        </div>

        {worldBoot.hasError && (
          <div style={{ marginTop: 12, color: "rgba(255,170,170,0.95)" }}>
            Something failed while loading. Check console.
          </div>
        )}
      </div>
    </div>
  );
}
