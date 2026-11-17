"use client";
import { useId, useRef } from "react";

// One wave tile is 160 units wide (4 half-waves), so sliding it by 160 loops without a seam.
const wave = (y: number, amp: number) => {
  let d = `M0 ${y} q20 ${-amp} 40 0`;
  for (let i = 0; i < 11; i++) d += " t40 0";
  return `${d} V270 H0 Z`;
};
const BODY = "M64 52H96V60C96 74 150 78 150 102V226C150 246 138 258 120 258H40C22 258 10 246 10 226V102C10 78 64 74 64 60Z";
const BUBBLES = [[40, 230, 0], [70, 240, 1.4], [100, 225, 2.6], [124, 238, 0.8], [56, 214, 3.4], [88, 246, 4.2]];

/** A 20L jar that tilts toward the pointer in 3D, floats gently, and has moving water with rising bubbles. */
export default function WaterJar({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const tilt = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = tilt.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 28}deg) rotateX(${-y * 16}deg)`;
  }
  function leave() {
    if (tilt.current) tilt.current.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg)";
  }

  return (
    <div className={`relative select-none ${className}`} onPointerMove={move} onPointerLeave={leave} aria-hidden="true">
      <div className="jar-float">
        <div ref={tilt} className="jar-tilt">
          <svg viewBox="0 0 160 280" className="block h-full w-full overflow-visible">
            <defs>
              <clipPath id={`${id}c`}><path d={BODY} /></clipPath>
              <linearGradient id={`${id}g`} x1="0" x2="1">
                <stop offset="0" stopColor="#5fa6e0" /><stop offset="0.4" stopColor="#b9e0fa" /><stop offset="1" stopColor="#4d97d6" />
              </linearGradient>
              <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2f9bea" /><stop offset="1" stopColor="#0a63b5" />
              </linearGradient>
              <linearGradient id={`${id}s`} x1="0" x2="1">
                <stop offset="0" stopColor="#04304f" stopOpacity="0.45" /><stop offset="0.28" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.72" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#04304f" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id={`${id}k`} x1="0" x2="1">
                <stop offset="0" stopColor="#1b5fb0" /><stop offset="0.5" stopColor="#58a6f0" /><stop offset="1" stopColor="#174f97" />
              </linearGradient>
            </defs>

            <ellipse cx="80" cy="268" rx="62" ry="8" fill="#04304f" opacity="0.18" />
            {[0, 1.3, 2.6].map((d) => (
              <ellipse key={d} className="jar-ripple" cx="80" cy="268" rx="56" ry="7" fill="none" stroke="#35b8e8" strokeWidth="1.5" style={{ animationDelay: `${d}s` }} />
            ))}

            <path d={BODY} fill={`url(#${id}g)`} fillOpacity="0.55" />
            <g clipPath={`url(#${id}c)`}>
              <g className="wave-b" opacity="0.55"><path d={wave(124, 7)} fill="#69c3fb" /></g>
              <g className="wave-a"><path d={wave(132, 9)} fill={`url(#${id}w)`} /></g>
              {BUBBLES.map(([x, y, d]) => (
                <circle key={x} className="bubble-dot" cx={x} cy={y} r={2.4 + (x % 3)} fill="#fff" fillOpacity="0.8" style={{ animationDelay: `${d}s` }} />
              ))}
            </g>
            <path d={BODY} fill={`url(#${id}s)`} />
            <path d={BODY} fill="none" stroke="#2c7fc4" strokeWidth="2.5" strokeLinejoin="round" />
            {[108, 158, 222].map((y) => (<path key={y} d={`M12 ${y}C50 ${y + 12} 110 ${y + 12} 148 ${y}`} fill="none" stroke="#2c7fc4" strokeOpacity="0.7" strokeWidth="2" />))}
            <path d="M22 112C22 140 26 196 28 226" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="6" strokeLinecap="round" />
            <path d="M44 96C62 100 82 100 102 96" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="4" strokeLinecap="round" />

            <rect x="64" y="33" width="32" height="21" fill="#b4daf6" stroke="#2c7fc4" strokeWidth="2" />
            <rect x="58" y="3" width="44" height="31" rx="9" fill={`url(#${id}k)`} />
            <rect x="76" y="9" width="8" height="19" rx="3" fill="#fff" fillOpacity="0.8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
