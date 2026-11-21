export type Seg = { d: string; pts: [number, number][]; y0: number; y1: number };

/** Vertical S-curve (cubic bezier) from (x0,y0) to (x1,y1), sampled at 61 points. */
export function cubicSeg(x0: number, y0: number, x1: number, y1: number): Seg {
  const dy = (y1 - y0) * 0.5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    pts.push([(a + b) * x0 + (c + d) * x1, a * y0 + b * (y0 + dy) + c * (y1 - dy) + d * y1]);
  }
  const k = (v: number) => v.toFixed(1);
  return {
    d: `M${k(x0)} ${k(y0)}C${k(x0)} ${k(y0 + dy)} ${k(x1)} ${k(y1 - dy)} ${k(x1)} ${k(y1)}`,
    pts, y0, y1,
  };
}

export function xAtY(seg: Seg, y: number): number {
  const p = seg.pts;
  for (let i = 1; i < p.length; i++) {
    if (p[i][1] >= y) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      return x0 + (x1 - x0) * ((y - y0) / (y1 - y0 || 1));
    }
  }
  return p[p.length - 1][0];
}

export function streamTip(scrollY: number, viewportH: number, top: number, bottom: number): number {
  return Math.max(top, Math.min(bottom, scrollY + viewportH * 0.6));
}
