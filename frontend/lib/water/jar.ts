export type JarState = { level: number; target: number; phi: number; v: number };

/** Advance the jar one frame: level eases to target, phi springs toward -angle. */
export function stepJar(s: JarState, angleDeg: number, dt: number): JarState {
  const f = dt * 60;
  const level = s.level + (s.target - s.level) * Math.min(1, dt * 2.5);
  const tgt = (-angleDeg * Math.PI) / 180;
  const v = s.v + ((tgt - s.phi) * 0.05 - s.v * 0.07) * f;
  const phi = s.phi + v * f;
  return { level, target: s.target, phi, v };
}

export function surfaceY(s: JarState, x: number, t: number): number {
  const amp = 1.4 + Math.min(7, Math.abs(s.v) * 140);
  return (
    252 - s.level * 172 + Math.tan(s.phi) * (x - 80) +
    amp * (Math.sin(x * 0.07 + t * 2.3) + 0.5 * Math.sin(x * 0.16 - t * 1.7))
  );
}

export function waterPath(s: JarState, t: number): { fill: string; surface: string } {
  let surface = "";
  for (let x = -10; x <= 170; x += 10) {
    surface += (x < 0 ? "M" : "L") + x + " " + surfaceY(s, x, t).toFixed(1);
  }
  return { fill: surface + "L170 270L-10 270Z", surface };
}
