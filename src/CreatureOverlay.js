import "./styles/CreatureOverlay.css";

// Each classification gets a MIN% and MAX% band.
const CLASS_Y_RANGES = {
  vermin:   [70, 80],   // rats, roaches, slimes
  humanoid: [45, 55],   // bandits, miners, workers
  beast:    [55, 70],   // bigger creatures sit lower
  flyer:    [20, 35],   // drones, bats, floating entities
  boss:     [40, 50]
};

// Helper — pick random value inside the percentage range.
function randomPercent(min, max) {
  return Math.random() * (max - min) + min;
}

function CreatureOverlay({ creatures = [] }) {
  return (
    <div className="creature-overlay">
      {creatures.map((c) => {
        const range = CLASS_Y_RANGES[c.classification];

        // If classification has a range: pick a random Y ONCE per instance
        const yPos = range
          ? `${randomPercent(range[0], range[1])}%`
          : `${c.y}px`; // fallback to server Y if no category

        return (
          <img
            key={c.instanceId}
            src={`/art/items/sprites/${c.creatureId}.png`}
            className="creature-sprite"
            style={{
              left: `${c.x}px`,   // server-authoritative X
              top: yPos,          // random vertical range per category
              transform: `translate(-50%, -50%) scaleX(${c.facing || 1})`
            }}
          />
        );
      })}
    </div>
  );
}

export default CreatureOverlay;
