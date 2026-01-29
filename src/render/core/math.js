export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
