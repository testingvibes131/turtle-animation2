const SIN_LUT_SIZE = 2048;
const SIN_LUT = new Float32Array(SIN_LUT_SIZE + 1);
for (let i = 0; i <= SIN_LUT_SIZE; i++) {
  SIN_LUT[i] = Math.sin((i / SIN_LUT_SIZE) * Math.PI * 2);
}
const TAU = Math.PI * 2;

/** Table-lookup sine (~1e-5 max error) — the blob loops issue ~25k sines per
 *  frame for ambient drift/ripple, where Math.sin is a measurable cost in
 *  Safari's JS engine. Visual-grade accuracy only. */
export function fastSin(x: number): number {
  let t = x / TAU;
  t -= Math.floor(t);
  const f = t * SIN_LUT_SIZE;
  // Clamp: tiny negative x can round t to exactly 1.0, putting i one past the
  // guard entry (NaN read). Clamping makes the lerp land on sin(2π) instead.
  const i = Math.min(f | 0, SIN_LUT_SIZE - 1);
  const frac = f - i;
  const a = SIN_LUT[i]!;
  return a + (SIN_LUT[i + 1]! - a) * frac;
}
