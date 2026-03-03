import { useCallback, useEffect, useState } from "react";
import { useClientToWorld } from "./useClientToWorld";

export default function GeneralTab({ socket, canvasRef, camSmoothRef, zoom, closeNonce }) {
  const [armed, setArmed] = useState(false);
  const [mouseClient, setMouseClient] = useState({ x: 0, y: 0 });

  const clientToWorld = useClientToWorld({ canvasRef, camSmoothRef, zoom });

  const cancel = useCallback(() => setArmed(false), []);
  useEffect(() => { cancel(); }, [closeNonce, cancel]);

  // mouse preview
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    canvas.style.cursor = armed ? "crosshair" : "";
    if (!armed) return;

    const onMove = (e) => setMouseClient({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      canvas.style.cursor = "";
    };
  }, [armed, canvasRef]);

  // click-to-teleport
  useEffect(() => {
    if (!armed) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const onClick = (e) => {
      const pt = clientToWorld(e.clientX, e.clientY);
      if (!pt) return;
      socket?.emit("teleport", { x: Math.round(pt.x), y: Math.round(pt.y) });
      setArmed(false);
    };

    const t = setTimeout(() => canvas.addEventListener("click", onClick), 50);
    return () => { clearTimeout(t); canvas.removeEventListener("click", onClick); };
  }, [armed, canvasRef, clientToWorld, socket]);

  return (
    <>
      {armed && (
        <div className="admin-preview admin-preview--teleport" style={{ left: mouseClient.x, top: mouseClient.y }} />
      )}

      <div className="admin-panel__section">
        <div className="admin-panel__section-label">Movement</div>

        <div className="admin-panel__row">
          <button
            className={`admin-btn${armed ? " admin-btn--active" : ""}`}
            onClick={() => setArmed((v) => !v)}
          >
            {armed ? "Target…" : "Teleport"}
          </button>
        </div>

        {armed && (
          <p className="admin-panel__hint">
            Click the world to teleport. <kbd>Esc</kbd> cancels.
          </p>
        )}
      </div>
    </>
  );
}