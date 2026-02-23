// RightPanelMenu.jsx
import { useMemo, useRef, useLayoutEffect, useState } from "react";
import "./styles/RightPanelMenu.css";
import { getClassById } from "./render/players/characterClasses";
import { getRoleColor } from "./utils/roles";

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

const TABS = [
  { key: "inventory", label: "Inventory" },
  { key: "skills", label: "Skills" },
  { key: "nodes", label: "Nodes" },
  { key: "tree", label: "Tree" },
];

const INV_BAGS = [
  { key: "bag1", label: "I",   locked: false },
  { key: "bag2", label: "II",  locked: true  },
  { key: "bag3", label: "III", locked: true  },
];

const TARGET_COLS = 10;
const TARGET_ROWS = 8;
const DEFAULT_CAPACITY = TARGET_COLS * TARGET_ROWS; // 80 cells exactly

export default function RightPanelMenu({ account, character, onClose }) {
  const slots = useMemo(() => DEFAULT_SLOTS, []);
  const leftSlots = slots.slice(0, 4);
  const rightSlots = slots.slice(4, 8);

  // sprite from class definition — handles legacy class names via getClassById
  const selectedClass = useMemo(() =>
    getClassById(character?.class),
    [character?.class]
  );

  // role color for name
  const roleColor = useMemo(() =>
    getRoleColor(account?.role),
    [account?.role]
  );

  const [tab, setTab] = useState("inventory");
  const [invBag, setInvBag] = useState("bag1");

  const gridRef    = useRef(null);
  const bottomRef  = useRef(null);
  const headerRef  = useRef(null);
  const bagTabsRef = useRef(null);
  const [cellPx, setCellPx] = useState(48);
  const [cols, setCols]     = useState(TARGET_COLS);
  const [scrollable, setScrollable] = useState(false);
  const [availableGridHeight, setAvailableGridHeight] = useState(0);

  const CELL_FLOOR = 20; // px — below this, stop shrinking and scroll instead

  useLayoutEffect(() => {
    const scrollEl  = gridRef.current;
    const bottomEl  = bottomRef.current;
    const headerEl  = headerRef.current;
    const bagTabsEl = bagTabsRef.current;
    if (!scrollEl || !bottomEl || !headerEl || !bagTabsEl) return;

    const compute = () => {
      const w = Math.max(0, scrollEl.getBoundingClientRect().width - 2);
      const fromWidth = Math.floor(w / TARGET_COLS);

      const bottomH = bottomEl.getBoundingClientRect().height;
      const headerH = headerEl.getBoundingClientRect().height;
      const bagH    = bagTabsEl.getBoundingClientRect().height;
      const reserved = 6 + 10 + headerH + bagH + 5 + 5;
      const availH  = Math.max(0, bottomH - reserved);
      const fromHeight = Math.floor(availH / TARGET_ROWS);

      // shrink to fit both dimensions
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

  return (
    <aside
      className="rightpanel"
      role="dialog"
      aria-modal="true"
      aria-label="Character Menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="rightpanel__header">
        <div className="rightpanel__title">
          <div className="rightpanel__titleMain" style={{ color: roleColor.text }}>
            {character?.charName || character?.name || "Adventurer"}
          </div>
          <div className="rightpanel__titleSub">
            {character?.class || character?.classId || "Wanderer"}
          </div>
        </div>

        <button className="rightpanel__close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>

      <div className="rightpanel__tabs" role="tablist" aria-label="Menu tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tabLink ${tab === t.key ? "isActive" : ""}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rightpanel__content">
        {/* Always mounted so refs stay alive and ResizeObserver keeps working */}
        <div
          className="rightpanel__inventoryLayout"
          style={{ display: tab === "inventory" ? undefined : "none" }}
        >
            {/* TOP: portrait + equip */}
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

            {/* BOTTOM: inventory */}
            <section className="rightpanel__bottom" ref={bottomRef}>
              <div className="invHeader" ref={headerRef}>
                <div className="invHeader__left">Inventory</div>
                <div className="invHeader__center">
                  Gold: <span className="goldValue">{character?.currency ?? 0}</span>
                </div>
                <div className="invHeader__right">
                  0 / {capacity}
                </div>
              </div>

              {/* Bag tabs */}
              <div className="invBagTabs" ref={bagTabsRef}>
                {INV_BAGS.map((bag) => (
                  <button
                    key={bag.key}
                    type="button"
                    className={`invBagTab ${invBag === bag.key ? "isActive" : ""} ${bag.locked ? "isLocked" : ""}`}
                    onClick={() => !bag.locked && setInvBag(bag.key)}
                    title={bag.locked ? "Locked" : `Bag ${bag.label}`}
                    disabled={bag.locked}
                  >
                    {bag.locked ? "🔒" : bag.label}
                  </button>
                ))}
              </div>

              {/* Scroll container — cell size computed from width */}
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

        {/* Placeholder for other tabs */}
        {tab !== "inventory" && (
          <div className="rightpanel__placeholder">
            <div className="placeholderTitle">{TABS.find((t) => t.key === tab)?.label}</div>
            <div className="placeholderBody">
              Placeholder page. We'll put your {tab} UI here (skills list, node tree, etc).
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}