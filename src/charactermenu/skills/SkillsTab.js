import "./SkillsTab.css";

function formatLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function StatList({ title, data, emptyText }) {
  const entries = Object.entries(data || {});

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
              <span className="skillsTab__value">{value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SkillsTab({ character, selectedClass }) {
  const stats = character?.stats || {};
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
          title="Stats"
          data={stats}
          emptyText="No stats found."
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