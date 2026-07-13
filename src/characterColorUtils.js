function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, Number(value))
  );
}

function componentToHex(value) {
  return clamp(
    Math.round(value),
    0,
    255
  )
    .toString(16)
    .padStart(2, "0");
}

export function createColorFromHsl({
  hue = 0,
  saturation = 0,
  lightness = 0,
}) {
  const h =
    (((Number(hue) || 0) % 360) +
      360) %
    360;

  const s =
    clamp(saturation, 0, 100) /
    100;

  const l =
    clamp(lightness, 0, 100) /
    100;

  const chroma =
    (1 - Math.abs(2 * l - 1)) *
    s;

  const hueSection = h / 60;

  const secondary =
    chroma *
    (1 -
      Math.abs(
        (hueSection % 2) - 1
      ));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = secondary;
  } else if (
    hueSection >= 1 &&
    hueSection < 2
  ) {
    red = secondary;
    green = chroma;
  } else if (
    hueSection >= 2 &&
    hueSection < 3
  ) {
    green = chroma;
    blue = secondary;
  } else if (
    hueSection >= 3 &&
    hueSection < 4
  ) {
    green = secondary;
    blue = chroma;
  } else if (
    hueSection >= 4 &&
    hueSection < 5
  ) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = l - chroma / 2;

  return (
    "#" +
    componentToHex(
      (red + match) * 255
    ) +
    componentToHex(
      (green + match) * 255
    ) +
    componentToHex(
      (blue + match) * 255
    )
  );
}

export function hexToHsl(hex) {
  const cleaned = String(
    hex || "#000000"
  )
    .replace("#", "")
    .trim();

  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map(
            (character) =>
              character + character
          )
          .join("")
      : cleaned.padEnd(6, "0").slice(0, 6);

  const red =
    parseInt(
      normalized.slice(0, 2),
      16
    ) / 255;

  const green =
    parseInt(
      normalized.slice(2, 4),
      16
    ) / 255;

  const blue =
    parseInt(
      normalized.slice(4, 6),
      16
    ) / 255;

  const maximum = Math.max(
    red,
    green,
    blue
  );

  const minimum = Math.min(
    red,
    green,
    blue
  );

  const difference =
    maximum - minimum;

  let hue = 0;

  if (difference !== 0) {
    if (maximum === red) {
      hue =
        60 *
        (((green - blue) /
          difference) %
          6);
    } else if (maximum === green) {
      hue =
        60 *
        ((blue - red) /
          difference +
          2);
    } else {
      hue =
        60 *
        ((red - green) /
          difference +
          4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  const lightness =
    (maximum + minimum) / 2;

  const saturation =
    difference === 0
      ? 0
      : difference /
        (1 -
          Math.abs(
            2 * lightness - 1
          ));

  return {
    hue: Math.round(hue),

    saturation: Math.round(
      saturation * 100
    ),

    lightness: Math.round(
      lightness * 100
    ),
  };
}