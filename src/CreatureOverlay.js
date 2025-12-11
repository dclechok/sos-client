import { useEffect, useState } from "react";
import './styles/CreatureOverlay.css';

const CLASS_Y_BANDS = {
  vermin: 80,      // bottom 20%
  humanoid: 55,    // mid-lower
  beast: 65,       // heavy creatures
  flyer: 30,       // upper-mid air
  boss: 50         // center
};

function CreatureOverlay({ creatures }) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    setPositions(prev => {
      const updated = { ...prev };

      creatures.forEach(c => {
        // Only assign a random position once per creature instance
        if (!updated[c.instanceId]) {
          updated[c.instanceId] = {
            x: randomX(window.innerWidth),   // random packed horizontal position
          };
        }
      });

      return updated;
    });
  }, [creatures]);

  return (
    <div className="creature-overlay">
      {creatures.map(c => {
        const band = CLASS_Y_BANDS[c.classification];
        const yPos = band ? `${band}%` : `${c.y}px`;

        const pos = positions[c.instanceId] || { x: c.x };

        return (
          <img
            key={c.instanceId}
            src={`/art/items/sprites/${c.creatureId}.png`}
            className="creature-sprite"
            style={{
              left: `${pos.x}px`,
              top: yPos,
              transform: "translate(-50%, -50%)"
            }}
          />
        );
      })}
    </div>
  );
}

// Utility function
function randomX(maxWidth, spriteWidth = 64) {
  return Math.floor(Math.random() * (maxWidth - spriteWidth));
}

export default CreatureOverlay;
