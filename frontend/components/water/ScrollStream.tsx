"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { cubicSeg, streamTip, xAtY, type Seg } from "@/lib/water/stream.ts";
import { subscribe } from "@/lib/water/ticker.ts";
import { burst } from "./Splash";

const noop = () => () => {};

type Geo = { A: Seg; B: Seg; jarX: number; jarY: number; jarVisible: boolean };

/** Thick water stream that follows the scroll position down the home page. Anchors: [data-stream="source|jar|end"]. */
export default function ScrollStream() {
  const on = useSyncExternalStore(noop, () => !matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const svgRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const pathsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!on) return;
    const svg = svgRef.current!, rect = rectRef.current!, head = headRef.current!;
    const paths = pathsRef.current!.querySelectorAll("path");
    const q = (k: string) => document.querySelector<HTMLElement>(`[data-stream="${k}"]`);

    let geo: Geo | null = null;
    let tip = 0, lastSY = scrollY, unsub: (() => void) | null = null;
    const snapUntil = performance.now() + 1200; // browser scroll restoration lands shortly after mount

    const target = () => (geo ? streamTip(scrollY, innerHeight, geo.A.y0, geo.B.y1) : 0);

    const build = () => {
      const src = q("source"), jar = q("jar"), end = q("end");
      if (!src || !jar || !end) { geo = null; svg.setAttribute("height", "0"); return; }
      const sy = scrollY;
      const sr = src.getBoundingClientRect();
      const hj = src.querySelector(".jar-stage")?.getBoundingClientRect();
      const W = document.documentElement.clientWidth;
      const sx = hj && hj.width > 0 ? hj.left + hj.width / 2 : W * 0.85;
      const jr = jar.getBoundingClientRect();
      const row = (jar.parentElement ?? jar).getBoundingClientRect();
      const visible = jr.width > 0 && jr.height > 0;
      const jx = visible ? jr.left + jr.width / 2 : sx;
      const jy = visible ? jr.top + sy + jr.height * 0.15 : row.top + sy;
      const by = (visible ? jr.bottom : row.bottom) + sy + 8;
      const er = end.getBoundingClientRect();
      const A = cubicSeg(sx, sr.bottom + sy - 14, jx, jy);
      const B = cubicSeg(jx, by, er.left + er.width / 2, er.top + sy);
      const H = Math.ceil(document.body.getBoundingClientRect().bottom + sy);
      svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      rect.setAttribute("width", String(W));
      paths.forEach((p) => p.setAttribute("d", A.d + B.d));
      geo = { A, B, jarX: jx, jarY: jy, jarVisible: visible };
      tip = geo && performance.now() < snapUntil ? target() : Math.max(A.y0, Math.min(B.y1, tip));
      start();
    };

    const tick = (_t: number, dt: number) => {
      if (!geo) { stop(); return; }
      const { A, B } = geo, sy = scrollY;
      const dv = sy - lastSY; lastSY = sy;
      if (dv) window.dispatchEvent(new CustomEvent("watermart:slosh", { detail: { k: Math.max(-0.05, Math.min(0.05, dv * 0.0005)) } }));
      const tg = target();
      if (performance.now() < snapUntil) tip = tg;
      const prev = tip;
      tip += (tg - tip) * Math.min(1, dt * 4.5);
      rect.setAttribute("height", Math.max(0, tip).toFixed(1));
      let x: number | null = null;
      if (tip > A.y0 + 2 && tip < A.y1) x = xAtY(A, tip);
      else if (tip > B.y0 && tip < B.y1 - 2) x = xAtY(B, tip);
      head.setAttribute("visibility", x === null ? "hidden" : "visible");
      if (x !== null) {
        head.setAttribute("transform", `translate(${x.toFixed(1)} ${tip.toFixed(1)})`);
        if (Math.abs(tg - tip) > 30 && Math.random() < 0.2) burst(x, tip - sy, 1, 0.3);
      }
      if (prev < A.y1 && tip >= A.y1) {
        window.dispatchEvent(new CustomEvent("watermart:stream-hit", { detail: { anchor: "jar" } }));
        burst(geo.jarX, geo.jarY - sy, 16, 0.6);
      }
      if (prev < B.y1 - 2 && tip >= B.y1 - 2) {
        window.dispatchEvent(new CustomEvent("watermart:stream-hit", { detail: { anchor: "end" } }));
        burst(xAtY(B, B.y1), B.y1 - sy, 26, 0.7);
      }
      if (Math.abs(tg - tip) < 0.5 && !dv) { tip = tg; rect.setAttribute("height", Math.max(0, tip).toFixed(1)); stop(); }
    };

    function start() { if (!unsub && geo) unsub = subscribe(tick); }
    function stop() { unsub?.(); unsub = null; }

    build();
    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", build);
    const ro = new ResizeObserver(build);
    ro.observe(document.body);
    document.fonts?.ready.then(build);
    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("scroll", start);
      window.removeEventListener("resize", build);
    };
  }, [on]);

  if (!on) return null;
  return (
    <svg ref={svgRef} className="stream" width="0" height="0" aria-hidden="true">
      <defs><clipPath id="streamClip" clipPathUnits="userSpaceOnUse"><rect ref={rectRef} x="0" y="0" width="0" height="0" /></clipPath></defs>
      <g ref={pathsRef} clipPath="url(#streamClip)">
        <path className="fb" /><path className="fc" /><path className="fs" />
      </g>
      <g ref={headRef} visibility="hidden">
        <g transform="scale(1.7)">
          <path d="M0 -17C6 -7 10 -2 10 3A10 10 0 0 1 -10 3C-10 -2 -6 -7 0 -17Z" fill="#3d93ea" />
          <circle cx="-3.5" cy="2" r="2.6" fill="#fff" fillOpacity=".85" />
        </g>
      </g>
    </svg>
  );
}
