import { useEffect, useRef, useState, useMemo } from "react";
import { fetchInventory } from "./api/inventoryApi";
import "./styles/InventoryMenu.css";
import { LOOT_COLORS } from "./utils/lootColorCodes";

function readGold({ character }) {
  const c = character?.currency ?? character?.gold ?? 0;
  const n = Number(c);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export default function InventoryMenu({ account, character, onClose }) {
  const [slots, setSlots] = useState(Array(25).fill(null));
  const [hoverItem, setHoverItem] = useState(null);

  // ✅ mouse position RELATIVE TO THE INVENTORY POPOUT
  const [mouseLocal, setMouseLocal] = useState({ x: 0, y: 0 });
  const popoutRef = useRef(null);

  // ✅ draggable popout
  const [pos, setPos] = useState({ x: 80, y: 90 });
  const dragRef = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!character?._id || !account?.token) return;

    (async () => {
      try {
        const inv = await fetchInventory(character._id, account.token);
        if (!alive) return;
        if (Array.isArray(inv)) setSlots(inv);
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [character, account]);

  const gold = useMemo(() => readGold({ character }), [character]);

  // ✅ local mouse tracking inside popout
  const onPopoutMouseMove = (e) => {
    const el = popoutRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMouseLocal({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    });
  };

  // ✅ drag start
  const onDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target && e.target.closest?.(".inventory-close")) return;

    setHoverItem(null);
    e.preventDefault();

    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  };

  const onDragMove = (e) => {
    if (!dragRef.current) return;

    const nextX = e.clientX - dragRef.current.dx;
    const nextY = e.clientY - dragRef.current.dy;

    const pad = 8;
    const w = 368;
    const h = 420;
    const maxX = window.innerWidth - w - pad;
    const maxY = window.innerHeight - h - pad;

    setPos({
      x: clamp(nextX, pad, maxX),
      y: clamp(nextY, pad, maxY),
    });
  };

  const onDragEnd = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
  };

  // ✅ tooltip position (inside popout)
  const offset = 10;
  const ttW = 240;
  const ttH = 140;

  let ttX = mouseLocal.x + offset;
  let ttY = mouseLocal.y + offset;

  // clamp inside popout (so it doesn't go off the panel)
  const popW = 364; // matches CSS width
  const popH = 420; // rough; fine for now

  if (ttX + ttW > popW - 8) ttX = mouseLocal.x - offset - ttW;
  if (ttY + ttH > popH - 8) ttY = popH - ttH - 8;
  if (ttY < 8) ttY = 8;

  return (
    <div
      ref={popoutRef}
      className="inventory-popout"
      style={{ left: pos.x, top: pos.y }}
      onMouseMove={onPopoutMouseMove}
    >
      <div className="inventory-topbar" onMouseDown={onDragStart}>
        <div className="inventory-title">
          Inventory <span className="inventory-gold">• Gold: {gold}</span>
        </div>

        <button className="inventory-close" onClick={() => onClose?.()}>
          ✕
        </button>
      </div>

      <div className="inventory-grid">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="inventory-slot"
            onMouseEnter={() => setHoverItem(slot)}
            onMouseLeave={() => setHoverItem(null)}
          >
            {slot && (
              <img
                src={`/art/items/${slot.graphic}`}
                alt={slot.name}
                className="inventory-item-graphic"
                draggable={false}
              />
            )}

            {slot && slot.stackable && slot.qty > 1 && (
              <div className="inventory-slot-stacksize">{slot.qty}</div>
            )}
          </div>
        ))}
      </div>

      {hoverItem && (
        <div
          className="inventory-tooltip"
          style={{
            left: ttX,
            top: ttY,
            "--tooltip-glow": LOOT_COLORS[hoverItem.lootClass],
          }}
        >
          <div
            className="tooltip-name"
            style={{ color: LOOT_COLORS[hoverItem.lootClass] }}
          >
            <strong>{hoverItem.name}</strong>
          </div>
          <div className="tooltip-desc">{hoverItem.desc}</div>

          <div className="tooltip-meta">
            {hoverItem.stackable && <div>Max Stack: {hoverItem.maxStackSize}</div>}
            {hoverItem.qty != null && <div>Qty: {hoverItem.qty}</div>}
          </div>
        </div>
      )}
    </div>
  );
}