import { useEffect, useMemo, useState } from "react";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

export function useFoliageAssets({
  tuft1Src = "/art/foliage/grasstuft1.png",
  tuft2Src = "/art/foliage/grasstuft2.png",
} = {}) {
  const [tuft1, setTuft1] = useState(null);
  const [tuft2, setTuft2] = useState(null);

  useEffect(() => {
    let alive = true;

    loadImage(tuft1Src)
      .then((img) => alive && setTuft1(img))
      .catch((e) => console.error("Failed to load grasstuft1", e));

    loadImage(tuft2Src)
      .then((img) => alive && setTuft2(img))
      .catch((e) => console.error("Failed to load grasstuft2", e));

    return () => {
      alive = false;
    };
  }, [tuft1Src, tuft2Src]);

  return useMemo(() => ({ tuft1, tuft2 }), [tuft1, tuft2]);
}
