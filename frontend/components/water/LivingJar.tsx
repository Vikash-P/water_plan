"use client";

import { useEffect, useRef } from "react";
import Jar from "@/components/Jar";
import { stepJar, surfaceY, waterPath, type JarState } from "@/lib/water/jar.ts";
import { subscribe } from "@/lib/water/ticker.ts";

export type JarApi = {
  kick(a: number): void;
  setTarget(level: number): void;
  setLevel(level: number): void;
  setCapped(c: boolean): void;
  hop(): void;
  el: SVGSVGElement;
};

type Bub = { el: SVGCircleElement; x: number; y: number; r: number; sp: number; ph: number };
const NS = "http://www.w3.org/2000/svg";
const BUBBLES = 8;
const DROPS: [number, string, string, number, number][] = [
  [90, "12%", "18%", 26, 0], [-60, "78%", "12%", 16, -1], [120, "82%", "62%", 30, -2],
  [-30, "8%", "70%", 14, -0.5], [60, "64%", "84%", 12, -1.6],
];

export default function LivingJar({
  className = "", level = 0.78, capped = true, tilt = false, onReady,
}: { className?: string; level?: number; capped?: boolean; tilt?: boolean; onReady?: (api: JarApi) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  useEffect(() => { readyRef.current = onReady; });

  useEffect(() => {
    const holder = holderRef.current!;
    const svg = holder.querySelector("svg") as SVGSVGElement;
    const water = svg.querySelector(".water")!;
    const surf = svg.querySelector(".surf")!;
    const bubG = svg.querySelector(".bub")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let s: JarState = { level, target: level, phi: 0, v: 0 };
    let angle = 0, t = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -9;
    const bubs: Bub[] = [];

    const draw = () => {
      const p = waterPath(s, t);
      water.setAttribute("d", p.fill);
      surf.setAttribute("d", p.surface);
    };

    if (!reduce) {
      for (let i = 0; i < BUBBLES; i++) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("fill", "#fff");
        c.setAttribute("fill-opacity", ".55");
        bubG.appendChild(c);
        bubs.push({ el: c, x: 25 + Math.random() * 110, y: 120 + Math.random() * 130, r: 1.5 + Math.random() * 3, sp: 0.25 + Math.random() * 0.5, ph: Math.random() * 6 });
      }
    }

    const tick = (now: number, dt: number) => {
      t = now;
      if (tilt && tiltRef.current) {
        const idle = now - lastMove > 2.5;
        const gx = idle ? Math.sin(now * 0.7) * 0.45 : tx;
        const gy = idle ? Math.sin(now * 0.5) * 0.25 : ty;
        const k = Math.min(1, dt * 4);
        cx += (gx - cx) * k; cy += (gy - cy) * k;
        const rz = -cx * 9;
        tiltRef.current.style.transform = `rotateX(${(-cy * 14).toFixed(2)}deg) rotateY(${(cx * 26).toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
        angle = rz;
      }
      s = stepJar(s, angle, dt);
      draw();
      const f = dt * 60;
      for (const b of bubs) {
        b.y -= b.sp * f;
        const bx = b.x + Math.sin(now * 3 + b.ph) * 2;
        if (b.y < surfaceY(s, bx, now) + b.r + 2) { b.y = 252; b.x = 25 + Math.random() * 110; }
        b.el.setAttribute("cx", bx.toFixed(1));
        b.el.setAttribute("cy", b.y.toFixed(1));
        b.el.setAttribute("r", String(b.r));
      }
    };

    draw();
    let unsub: (() => void) | null = null;
    let io: IntersectionObserver | null = null;
    if (!reduce) {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !unsub) unsub = subscribe(tick);
        else if (!e.isIntersecting && unsub) { unsub(); unsub = null; }
      });
      io.observe(holder);
    }

    // Tilt input (passive listeners)
    const stage = stageRef.current!;
    const point = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 1.4)));
      ty = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 1.4)));
      lastMove = performance.now() / 1000;
    };
    const onWinMove = (e: PointerEvent) => { if (unsub && e.pointerType === "mouse") point(e); };
    const onStageMove = (e: PointerEvent) => { if (e.pointerType !== "mouse" && e.buttons) point(e); };
    const opt = { passive: true } as const;
    const listen = tilt && !reduce;
    if (listen) {
      window.addEventListener("pointermove", onWinMove, opt);
      stage.addEventListener("pointerdown", point, opt);
      stage.addEventListener("pointermove", onStageMove, opt);
    }

    const api: JarApi = {
      kick: (a) => { if (!unsub) return; s = { ...s, v: Math.max(-0.08, Math.min(0.08, s.v + a)) }; },
      setTarget: (l) => { s = { ...s, target: l }; if (reduce) { s = { ...s, level: l }; draw(); } },
      setLevel: (l) => { s = { ...s, level: l, target: l }; draw(); },
      setCapped: (c) => svg.classList.toggle("uncapped", !c),
      hop: () => { holder.classList.remove("hop"); void holder.offsetWidth; holder.classList.add("hop"); },
      el: svg,
    };
    readyRef.current?.(api);

    return () => {
      unsub?.(); io?.disconnect();
      if (listen) {
        window.removeEventListener("pointermove", onWinMove);
        stage.removeEventListener("pointerdown", point);
        stage.removeEventListener("pointermove", onStageMove);
      }
      bubs.forEach((b) => b.el.remove());
    };
  // level/capped are initial values; later changes go through the API
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilt]);

  return (
    <div className={className}>
      <div ref={stageRef} className={`jar-stage${tilt ? " jar-stage-tilt" : ""}`}>
        <div ref={tiltRef} className="jar-tilt">
          {tilt && DROPS.map(([z, l, tp, sz, d], i) => (
            <span key={i} className="dropw" style={{ ["--z" as string]: `${z}px`, left: l, top: tp }}>
              <i className="drop" style={{ ["--s" as string]: `${sz}px`, animationDelay: `${d}s` }} />
            </span>
          ))}
          <div ref={holderRef} className={`jar-holder${tilt ? " float" : ""}`}>
            <Jar level={level} capped={capped} />
          </div>
        </div>
        {tilt && <div className="jar-shadow" aria-hidden />}
      </div>
    </div>
  );
}
