// src/render/systems/terrain/terrainLayout.js
export const TERRAIN_ATLAS_LAYOUT = {
  cols: 5,
  tile: 16,
  gap: 2,
  margin: 2,

  rows: {
    // Row 0: 5 grass variants
    grass: { row: 0, startCol: 0, count: 5 },

    // Row 1: 3 deep ocean variants
    water: { row: 1, startCol: 0, count: 3 },

    // Row 2: 5 straight shore/edge variants
    // Sprite: WATER on top, GRASS BANK on bottom.
    // Renderer rotates so bank always faces the adjacent grass tile:
    //   grass to S → rotation 0          (bank already at bottom)
    //   grass to N → rotation Math.PI    (flip, bank now at top)
    //   grass to W → rotation Math.PI/2  (CW,  bank now at left)
    //   grass to E → rotation -Math.PI/2 (CCW, bank now at right)
    shore: { row: 2, startCol: 0, count: 5 },

    // Row 3: 4 outer corner pieces (water tile with grass on two adjacent cardinals)
    // Index 0: grass in bottom-right → SE outer corner (water tile has grass S + E)
    // Index 1: grass in bottom-left  → SW outer corner (water tile has grass S + W)
    // Index 2: grass in top-right    → NE outer corner (water tile has grass N + E)
    // Index 3: grass in top-left     → NW outer corner (water tile has grass N + W)
    shoreOuterCorner: { row: 3, startCol: 0, count: 4 }, // SE=0, SW=1, NE=2, NW=3

    // Row 4: 4 inner corner overlays (transparent, drawn ON TOP of grass tiles)
    // Applied when all 4 cardinals are grass but a diagonal neighbour is water.
    // Index 0: water in top-left     → NW inner (nwId is ocean)
    // Index 1: water in top-right    → NE inner (neId is ocean)
    // Index 2: water in bottom-right → SE inner (seId is ocean)
    // Index 3: water in bottom-left  → SW inner (swId is ocean)
    shoreInnerCorner: { row: 4, startCol: 0, count: 4 }, // NW=0, NE=1, SE=2, SW=3
  },
};
