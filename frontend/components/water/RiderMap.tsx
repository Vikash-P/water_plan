"use client";

import { useEffect, useRef } from "react";
import { riderProgress } from "@/lib/water/rider.ts";
import { subscribe } from "@/lib/water/ticker.ts";
import { burst } from "./Splash";
import { STATUS_LABEL } from "@/lib/orders";

const D = "M50 170C170 175 150 50 300 70S440 190 545 60";
const DURATION = 1.2;

export default function RiderMap({ status }: { status: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const route = useRef<SVGPathElement>(null);
  const fg = useRef<SVGPathElement>(null);
  const rider = useRef<SVGGElement>(null);
  const cur = useRef(0);
  const arrived = useRef(false);
  const target = riderProgress(status);

  useEffect(() => {
    if (target === null) return;
    const path = route.current!, fgp = fg.current!, g = rider.current!;
    const len = path.getTotalLength();
    fgp.style.strokeDasharray = String(len);
    const draw = (p: number) => {
      const pt = path.getPointAtLength(p * len);
      g.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      fgp.style.strokeDashoffset = String(len * (1 - p));
    };
    const arrive = () => {
      if (target < 1 || arrived.current) return;
      arrived.current = true;
      const r = svg.current!.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) burst(r.left + r.width * 0.91, r.top + r.height * 0.2, 30);
    };
    const from = cur.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === target) {
      cur.current = target; draw(target);
      if (from === target) return;
      arrived.current = target === 1; // no burst when motion is reduced
      return;
    }
    let el = 0;
    draw(from);
    const unsub = subscribe((_t, dt) => {
      el += dt;
      const k = Math.min(1, el / DURATION);
      const e = 1 - (1 - k) ** 3;
      cur.current = from + (target - from) * e;
      draw(cur.current);
      if (k >= 1) { unsub(); cur.current = target; arrive(); }
    });
    return unsub;
  }, [target]);

  if (target === null) return null;
  return (
    <svg ref={svg} viewBox="0 0 600 220" width="100%" role="img"
      aria-label={`Rider is ${STATUS_LABEL[status]?.toLowerCase() ?? status}`}
      className="mt-4 block h-auto w-full text-foreground">
      <path ref={route} className="route-bg" d={D} />
      <path ref={fg} className="route-fg" d={D} />
      <g transform="translate(26 148)">
        <rect width="48" height="40" rx="8" fill="var(--brand-soft)" />
        <path d="M24 8s-10 11-10 17a10 10 0 0 0 20 0c0-6-10-17-10-17Z" fill="var(--brand)" />
      </g>
      <text x="50" y="208" textAnchor="middle" fill="currentColor" style={{ fontWeight: 600, fontSize: 13 }}>Partner plant</text>
      <g transform="translate(520 22)">
        <path d="M25 0L52 22H46V48H4V22H-2Z" fill="var(--brand)" />
        <rect x="18" y="30" width="14" height="18" rx="2" fill="var(--card)" />
      </g>
      <text x="545" y="94" textAnchor="middle" fill="currentColor" style={{ fontWeight: 600, fontSize: 13 }}>You</text>
      <g ref={rider} transform="translate(50 170)">
        <circle r="16" className="rider-pulse" />
        <circle r="15" fill="var(--brand)" />
        <rect x="-5" y="-8" width="10" height="15" rx="3" fill="#fff" />
        <rect x="-3" y="-11" width="6" height="4" rx="1" fill="#fff" />
      </g>
    </svg>
  );
}
