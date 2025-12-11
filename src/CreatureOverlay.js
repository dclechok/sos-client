import "./styles/CreatureOverlay.css";

function CreatureOverlay({ creatures = [] }) {
  return (
    <div className="creature-overlay">
      {creatures.map(c => (
        <img
          key={c.instanceId}
          src={`/art/items/sprites/${c.creatureId}.png`}
          className="creature-sprite"
          style={{
            left: `${c.x}px`,        // exact server X
            top: `${c.y}px`,         // exact server Y
            transform: `translate(-50%, -50%) scaleX(${c.facing || 1})`
          }}
        />
      ))}
    </div>
  );
}

export default CreatureOverlay;
