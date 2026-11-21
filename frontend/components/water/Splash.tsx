"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/water/ticker.ts";

type Part = { x: number; y: number; vx: number; vy: number; r: number; life: number; c: string };
const COLS = ["#BFE3FF", "#7cc4ff", "#3d93ea", "#1F6FC9"];

let emit: ((x: number, y: number, n: number, scale: number) => void) | null = null;

/** Fire a burst of water drops at viewport coordinates. No-op until mounted or under reduced motion. */
export function burst(x: number, y: number, n = 46, scale = 1): void {
  emit?.(x, y, n, scale);
}

export default function Splash() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d");
    if (!ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let parts: Part[] = [];
    let unsub: (() => void) | null = null;

    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = innerWidth * d; cv.height = innerHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const tick = (_t: number, dt: number) => {
      const f = dt * 60;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 30);
      for (const p of parts) {
        p.vy += 0.3 * f; p.vx *= Math.pow(0.99, f);
        p.x += p.vx * f; p.y += p.vy * f; p.life -= 0.011 * f;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.7, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (!parts.length) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        unsub?.(); unsub = null;
      }
    };

    emit = (x, y, n, sc) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = (4 + Math.random() * 8) * sc;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.5 + Math.random() * 4, life: 1, c: COLS[i % COLS.length] });
      }
      if (!unsub) unsub = subscribe(tick);
    };

    return () => {
      emit = null; unsub?.();
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}
