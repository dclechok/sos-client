import "./styles/CreatureOverlay.css";

function CreatureOverlay({ creatures = [] }) {
  return (
    <div className="creature-overlay">
      {creatures.map(c => (
        <div
          key={c.instanceId}
          className="creature-wrapper"
          style={{
            left: `${c.x}px`,
            top: `${c.y}px`
          }}
        >
          <img
            src={`/art/items/sprites/${c.creatureId}.png`}
            className="creature-sprite"
            style={{
              transform: `scaleX(${c.facing || 1})`
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default CreatureOverlay;
