const cache = {};

export async function getTightBounds(defId, imgSrc) {
  if (cache[defId]) return cache[defId];

  const img = new Image();
  img.src = imgSrc;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

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

  const cx = img.width / 2;
  const cy = img.height / 2;

  const bounds = {
    offX: (minX + maxX) / 2 - cx,
    offY: (minY + maxY) / 2 - cy,
    w: maxX - minX,
    h: maxY - minY,
  };

  cache[defId] = bounds;
  return bounds;
}