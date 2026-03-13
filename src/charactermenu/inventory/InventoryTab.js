import { useMemo, useRef, useLayoutEffect, useState } from "react";
import "./InventoryTab.css";

const DEFAULT_SLOTS = [
  { key: "head", label: "Head" },
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "hands", label: "Hands" },
  { key: "ring", label: "Ring" },
  { key: "weapon", label: "Weapon" },
  { key: "offhand", label: "Offhand" },
  { key: "feet", label: "Feet" },
];

const INV_BAGS = [
  { key: "bag1", label: "I", locked: false },
  { key: "bag2", label: "II", locked: true },
  { key: "bag3", label: "III", locked: true },
];

const TARGET_COLS = 10;
const TARGET_ROWS = 8;
const DEFAULT_CAPACITY = TARGET_COLS * TARGET_ROWS;

export default function InventoryTab({ character, selectedClass }) {
  const slots = useMemo(() => DEFAULT_SLOTS, []);
  const leftSlots = slots.slice(0, 4);
  const rightSlots = slots.slice(4, 8);

  const [invBag, setInvBag] = useState("bag1");

  const gridRef = useRef(null);
  const bottomRef = useRef(null);
  const headerRef = useRef(null);
  const bagTabsRef = useRef(null);

  const [cellPx, setCellPx] = useState(48);
  const [cols, setCols] = useState(TARGET_COLS);
  const [scrollable, setScrollable] = useState(false);
  const [availableGridHeight, setAvailableGridHeight] = useState(0);

  const CELL_FLOOR = 20;

  useLayoutEffect(() => {
    const scrollEl = gridRef.current;
    const bottomEl = bottomRef.current;
    const headerEl = headerRef.current;
    const bagTabsEl = bagTabsRef.current;
    if (!scrollEl || !bottomEl || !headerEl || !bagTabsEl) return;

    const compute = () => {
      const w = Math.max(0, scrollEl.getBoundingClientRect().width - 2);
      const fromWidth = Math.floor(w / TARGET_COLS);

      const bottomH = bottomEl.getBoundingClientRect().height;
      const headerH = headerEl.getBoundingClientRect().height;
      const bagH = bagTabsEl.getBoundingClientRect().height;
      const reserved = 6 + 10 + headerH + bagH + 5 + 5;
      const availH = Math.max(0, bottomH - reserved);
      const fromHeight = Math.floor(availH / TARGET_ROWS);

      const unclamped = Math.min(fromWidth, fromHeight);
      const px = Math.max(CELL_FLOOR, unclamped);
      const isScrollable = unclamped < CELL_FLOOR;

      setCellPx(px);
      setCols(TARGET_COLS);
      setScrollable(isScrollable);
      setAvailableGridHeight(availH);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(bottomEl);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, []);

  const capacity = character?.inventorySlots ?? DEFAULT_CAPACITY;
  const inventory = Array.isArray(character?.inventory) ? character.inventory : [];

  return (
    <div className="rightpanel__inventoryLayout">
      <section className="rightpanel__top">
        <div className="paperdollFit">
          <div className="equipCol">
            {leftSlots.map((s) => (
              <button key={s.key} className="equipSlot" type="button">
                <div className="equipSlot__label">{s.label}</div>
                <div className="equipSlot__item">—</div>
              </button>
            ))}
          </div>

          <div className="portraitBox">
            <div className="portraitInner">
              {selectedClass?.sprite ? (
                <img
                  src={selectedClass.sprite}
                  alt={selectedClass.label}
                  className="paperdoll__sprite"
                  draggable={false}
                />
              ) : (
                <>
                  <div className="paperdoll__sigil">◈</div>
                  <div className="portraitText">
                    {character?.classId || character?.class || "PORTRAIT"}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="equipCol">
            {rightSlots.map((s) => (
              <button key={s.key} className="equipSlot" type="button">
                <div className="equipSlot__label">{s.label}</div>
                <div className="equipSlot__item">—</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rightpanel__bottom" ref={bottomRef}>
        <div className="invHeader" ref={headerRef}>
          <div className="invHeader__left">Inventory</div>
          <div className="invHeader__center">
            Gold: <span className="goldValue">{character?.currency ?? 0}</span>
          </div>
          <div className="invHeader__right">
            {inventory.length} / {capacity}
          </div>
        </div>

        <div className="invBagTabs" ref={bagTabsRef}>
          {INV_BAGS.map((bag) => (
            <button
              key={bag.key}
              type="button"
              className={`invBagTab ${invBag === bag.key ? "isActive" : ""} ${
                bag.locked ? "isLocked" : ""
              }`}
              onClick={() => !bag.locked && setInvBag(bag.key)}
              title={bag.locked ? "Locked" : `Bag ${bag.label}`}
              disabled={bag.locked}
            >
              {bag.locked ? "🔒" : bag.label}
            </button>
          ))}
        </div>

        <div
          className="invScroll"
          ref={gridRef}
          style={{
            "--inv-cell": `${cellPx}px`,
            overflowY: scrollable ? "auto" : "hidden",
            height: scrollable ? `${Math.max(0, availableGridHeight)}px` : undefined,
          }}
        >
          <div
            className="invGrid"
            style={{ "--cols": cols, "--cell": `${cellPx}px` }}
            role="grid"
            aria-label="Inventory grid"
          >
            {Array.from({ length: capacity }).map((_, i) => (
              <button
                key={i}
                className="invCell"
                role="gridcell"
                aria-label={`Inventory ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}