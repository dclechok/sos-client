World chunk export (binary)

- meta.json: map and palette metadata
- chunks/cx_cy.bin: Uint8 tile-id grid, row-major, size chunk_size*chunk_size bytes.
  - tileId 0 = GRASS (#176414)
  - tileId 1 = DEEP_OCEAN (#0e3a59) [impassable]
  - tileId 255 = UNKNOWN (fallback/debug)

Loading (browser):
  const res = await fetch(`/world/chunks/${cx}_${cy}.bin`);
  const buf = await res.arrayBuffer();
  const tiles = new Uint8Array(buf); // length = chunkSize*chunkSize
  // tile at local (lx,ly):
  const id = tiles[ly*chunkSize + lx];

NOTE: This export auto-mapped 3 near-colors found in the PNG to grass/ocean.
