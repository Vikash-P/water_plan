type Tick = (t: number, dt: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  for (const fn of Array.from(subs)) fn(t, dt);
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}

/** Shared rAF loop: starts on the first subscriber, stops when the last leaves. Browser-only. */
export function subscribe(fn: Tick): () => void {
  subs.add(fn);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
