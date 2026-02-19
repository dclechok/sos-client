export const TERRAIN_ATLAS_LAYOUT = {
  cols: 10,  // ✅ row 2 now has 10 tiles wide
  tile: 16,
  gap: 2,
  margin: 2,

  rows: {
    // Row 0: 5 grass variants
    grass: { row: 0, startCol: 0, count: 5 },

    // Row 1: 3 deep ocean variants
    water: { row: 1, startCol: 0, count: 3 },

    // Row 2, cols 0-4: standard shore (water top, grass bank bottom)
    shore: { row: 2, startCol: 0, count: 5 },

    // Row 2, cols 5-9: depth variants — used ONLY instead of rotating 180°
    shoreDepth: { row: 2, startCol: 5, count: 5 },

    // Row 3: 4 outer corner pieces — SE=0, SW=1, NE=2, NW=3
    shoreOuterCorner: { row: 3, startCol: 0, count: 4 },

    // Row 4: 4 inner corner overlays — NW=0, NE=1, SE=2, SW=3
    shoreInnerCorner: { row: 4, startCol: 0, count: 4 },
  },
};