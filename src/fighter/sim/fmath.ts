// Math for the simulation that gives the same answer on every device.
//
// Online play uses rollback netcode: both devices run the same simulation and
// must stay identical to the last bit. + - * / and Math.floor/min/max/abs are
// exact everywhere, but Math.sin, Math.cos, Math.atan2, Math.pow and similar
// may differ slightly between browser engines (an iPhone runs a different
// engine from Chrome). So angles here go through a fixed polynomial built only
// from + - * /.

const RAD = 0.017453292519943295; // pi / 180

/** Sine of an angle in degrees. Accurate to about 1e-9. */
export function dsin(deg: number): number {
  // Bring the angle into [-180, 180), then into [-90, 90].
  let d = deg - 360 * Math.floor((deg + 180) / 360);
  if (d > 90) d = 180 - d;
  else if (d < -90) d = -180 - d;
  const x = d * RAD;
  const x2 = x * x;
  // Taylor series to x^13, in nested form.
  return x * (1 - (x2 / 6) * (1 - (x2 / 20) * (1 - (x2 / 42) * (1 - (x2 / 72) * (1 - (x2 / 110) * (1 - x2 / 156))))));
}

/** Cosine of an angle in degrees. */
export function dcos(deg: number): number {
  return dsin(deg + 90);
}

/** Square root from Newton's method (+ - * / only, so the same on every device). */
export function dsqrt(v: number): number {
  if (!(v > 0)) return 0;
  // Start at a power of two at or above the root, then a few Newton steps.
  let x = 1;
  while (x * x < v) x *= 2;
  while (x * x > v * 4) x /= 2;
  for (let i = 0; i < 8; i++) x = 0.5 * (x + v / x);
  return x;
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Moves `v` toward `target` by at most `step`. */
export function approach(v: number, target: number, step: number) {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

/** Squared distance between segment AB and segment CD (capsule tests compare it to (r1 + r2)²). */
export function segSegDist2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
  const d1x = bx - ax;
  const d1y = by - ay;
  const d2x = dx - cx;
  const d2y = dy - cy;
  const rx = ax - cx;
  const ry = ay - cy;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  let s: number;
  let t: number;
  if (a <= 1e-9 && e <= 1e-9) return rx * rx + ry * ry;
  if (a <= 1e-9) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= 1e-9) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      s = denom > 1e-9 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }
  const px = ax + d1x * s - (cx + d2x * t);
  const py = ay + d1y * s - (cy + d2y * t);
  return px * px + py * py;
}
