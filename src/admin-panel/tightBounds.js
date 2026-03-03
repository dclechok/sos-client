// tightBounds.js

const tightBoundsCache = {};

// Returns Promise<{ offX, offY, w, h, imgW, imgH }>
export function getTightBounds(defId, src) {
  if (!src) return Promise.resolve(null);
  if (tightBoundsCache[defId]) return tightBoundsCache[defId];

  tightBoundsCache[defId] = (async () => {
    try {
      const img = new Image();
      img.src = src;

      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

      let minX = width, maxX = 0, minY = height, maxY = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (minX > maxX || minY > maxY) {
        return {
          offX: 0,
          offY: 0,
          w: img.width,
          h: img.height,
          imgW: img.width,
          imgH: img.height,
        };
      }

      const cx = img.width / 2;
      const cy = img.height / 2;

      return {
        offX: (minX + maxX) / 2 - cx,
        offY: (minY + maxY) / 2 - cy,
        w: maxX - minX,
        h: maxY - minY,
        imgW: img.width,
        imgH: img.height,
      };
    } catch (e) {
      console.warn("[tightBounds] failed:", e);
      delete tightBoundsCache[defId];
      return null;
    }
  })();

  return tightBoundsCache[defId];
}

export function warmTightBoundsForObjects(worldObjects, objectDefs) {
  for (const obj of worldObjects) {
    const def = objectDefs?.[obj.defId];
    if (def?.frames?.[0]) {
      getTightBounds(obj.defId, def.frames[0]);
    }
  }
}