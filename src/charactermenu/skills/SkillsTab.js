import "./SkillsTab.css";

const CORE_STAT_ORDER = [
  "vitality",
  "strength",
  "dexterity",
  "intelligence",
  "perception",
  "luck",
];

const DERIVED_STAT_ORDER = [
  "maxHP",
  "maxMana",
  "stamina",
  "physicalPower",
  "spellPower",
  "armor",
  "accuracy",
  "evasion",
  "critChance",
  "critDamage",
  "swingSpeed",
  "castSpeed",
  "moveSpeed",
  "hpRegen",
  "manaRegen",
  "lootFind",
  "detectRange",
];

function formatLabel(key) {
  const customLabels = {
    maxHP: "Max HP",
    maxMana: "Max Mana",
    physicalPower: "Physical Power",
    spellPower: "Spell Power",
    critChance: "Crit Chance",
    critDamage: "Crit Damage",
    swingSpeed: "Swing Speed",
    castSpeed: "Cast Speed",
    moveSpeed: "Move Speed",
    hpRegen: "HP Regen",
    manaRegen: "Mana Regen",
    lootFind: "Loot Find",
    detectRange: "Detect Range",
  };

  if (customLabels[key]) return customLabels[key];

  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatValue(key, value) {
  if (value == null) return "—";

  if (typeof value === "number") {
    if (["critChance", "lootFind"].includes(key)) {
      return `${value.toFixed(1)}%`;
    }

    if (["critDamage"].includes(key)) {
      return `${value.toFixed(1)}%`;
    }

    if (["swingSpeed", "castSpeed", "hpRegen", "manaRegen"].includes(key)) {
      return value.toFixed(2);
    }

    return String(value);
  }

  return String(value);
}

function buildOrderedEntries(data, order = []) {
  const source = data || {};
  const seen = new Set();

  const ordered = order
    .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
    .map((key) => {
      seen.add(key);
      return [key, source[key]];
    });

  const extras = Object.entries(source).filter(([key]) => !seen.has(key));

  return [...ordered, ...extras];
}

function StatList({ title, data, emptyText, order }) {
  const entries = buildOrderedEntries(data, order);

  return (
    <section className="skillsTab__block">
      <div className="skillsTab__blockHeader">{title}</div>

      {entries.length === 0 ? (
        <div className="skillsTab__empty">{emptyText}</div>
      ) : (
        <div className="skillsTab__rows">
          {entries.map(([key, value]) => (
            <div key={key} className="skillsTab__row">
              <span className="skillsTab__label">{formatLabel(key)}</span>
              <span className="skillsTab__value">{formatValue(key, value)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SkillsTab({ character, selectedClass }) {
  const coreStats = character?.stats || {};
  const derivedStats = character?.derivedStats || {};
  const skills = character?.skills || {};

  return (
    <div className="skillsTab">
      <div className="skillsTab__summary">
        <div className="skillsTab__summaryName">
          {character?.charName || "Adventurer"}
        </div>

        <div className="skillsTab__summaryClass">
          {selectedClass?.label || character?.class || "Wanderer"}
        </div>

        <div className="skillsTab__summaryExp">
          Experience: <span>{character?.exp ?? 1}</span>
        </div>
      </div>

      <div className="skillsTab__grid">
        <StatList
          title="Core Stats"
          data={coreStats}
          order={CORE_STAT_ORDER}
          emptyText="No core stats found."
        />

        <StatList
          title="Derived Stats"
          data={derivedStats}
          order={DERIVED_STAT_ORDER}
          emptyText="No derived stats found."
        />

        <StatList
          title="Skills"
          data={skills}
          emptyText="No skills found."
        />
      </div>
    </div>
  );
}