"use client";

import { useEffect, useRef, useState } from "react";
import type { JarApi } from "./LivingJar";
import { burst } from "./Splash";
import { subscribe } from "@/lib/water/ticker.ts";

const FULL = 0.78;

/** One-shot opening pour. Pass the hero jar (already emptied/uncapped); renders nothing once finished. */
export default function PourIntro({ jar }: { jar: JarApi | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jar) return;
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = innerWidth * d; cv.height = innerHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const stream = (x: number, y0: number, y1: number, t: number) => {
      const n = Math.max(2, Math.ceil((y1 - y0) / 6));
      const L: [number, number][] = [], R: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const y = y0 + (y1 - y0) * i / n, f = i / n;
        const w = 11 - 3 * f + Math.sin(y * 0.06 - t * 22) * 1.4, wob = Math.sin(y * 0.025 + t * 7) * 1.6;
        L.push([x + wob - w, y]); R.push([x + wob + w, y]);
      }
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, "#a8dcff"); g.addColorStop(1, "#2a86e0");
      ctx.beginPath();
      L.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      L.forEach(([a, b], i) => (i ? ctx.lineTo(a + 4, b) : ctx.moveTo(a + 4, b)));
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2.4; ctx.stroke();
    };

    let s = 0, hit = false, capped = false, finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      unsub(); ctx.clearRect(0, 0, innerWidth, innerHeight);
      window.removeEventListener("resize", size);
      cv.width = cv.height = 0;
      jar.setCapped(true); jar.setTarget(FULL);
      setDone(true);
    };
    const unsub = subscribe((t, dt) => {
      s += dt;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const r = jar.el.getBoundingClientRect(), x = r.left + r.width / 2, land = r.top + r.height * (58 / 262);
      const head = s < 0.3 ? -30 : -30 + (land + 30) * Math.min(1, ((s - 0.3) / 0.45) ** 2);
      const tail = s < 2.5 ? -30 : -30 + (land + 30) * Math.min(1, ((s - 2.5) / 0.4) ** 2);
      if (head > tail + 1) stream(x, tail, head, t);
      if (s > 0.3 && s < 0.75) { ctx.beginPath(); ctx.arc(x, head, 12, 0, 7); ctx.fillStyle = "#3d93ea"; ctx.fill(); }
      if (s > 0.75 && !hit) { hit = true; jar.kick(0.05); burst(x, land, 14, 0.55); }
      if (s > 0.75) jar.setTarget(FULL * Math.min(1, (s - 0.75) / 1.8));
      if (s > 0.75 && s < 2.85 && Math.random() < 0.5) burst(x, land, 1, 0.4);
      if (s > 3.05 && !capped) { capped = true; jar.setCapped(true); setTimeout(() => jar.kick(0.04), 350); }
      if (s > 3.6) end();
    });
    return () => { finished = true; unsub(); window.removeEventListener("resize", size); };
  }, [jar]);

  if (!jar || done) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[55] h-full w-full" />;
}
