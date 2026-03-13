import { useMemo, useState } from "react";
import "./CharacterMenu.css";

import { getClassById } from "../render/players/characterClasses";
import { getRoleColor } from "../utils/roles";

import InventoryTab from "./inventory/InventoryTab";
import SkillsTab from "./skills/SkillsTab";

const TABS = [
  { key: "inventory", label: "Inventory" },
  { key: "skills", label: "Skills" },
];

export default function CharacterMenu({ account, character, onClose }) {
  const [tab, setTab] = useState("inventory");

  const selectedClass = useMemo(() => {
    return getClassById(character?.class);
  }, [character?.class]);

  const roleColor = useMemo(() => {
    return getRoleColor(account?.role);
  }, [account?.role]);

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
          <div
            className="rightpanel__titleMain"
            style={{ color: roleColor?.text || "#f3e7c6" }}
          >
            {character?.charName || character?.name || "Adventurer"}
          </div>

          <div className="rightpanel__titleSub">
            {selectedClass?.label || character?.class || "Wanderer"}
          </div>
        </div>

        <button
          type="button"
          className="rightpanel__close"
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="rightpanel__tabs" role="tablist" aria-label="Character tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tabLink ${tab === t.key ? "isActive" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rightpanel__content">
        {tab === "inventory" && (
          <InventoryTab
            character={character}
            selectedClass={selectedClass}
          />
        )}

        {tab === "skills" && (
          <SkillsTab
            character={character}
            selectedClass={selectedClass}
          />
        )}
      </div>
    </aside>
  );
}