import { useId } from "react";
import { waterPath } from "@/lib/water/jar.ts";

export const JAR_BODY =
  "M64 52H96V60C96 74 150 78 150 102V226C150 246 138 258 120 258H40C22 258 10 246 10 226V102C10 78 64 74 64 60Z";

/** 20L water jar (static server SVG): glass body, blue cap, water at `level`. LivingJar animates the slots. */
export default function Jar({
  className = "",
  level = 0.78,
  capped = true,
}: {
  className?: string;
  level?: number;
  capped?: boolean;
  /** Premium look has no face; kept for API parity. */
  face?: false;
}) {
  const id = useId().replace(/:/g, "");
  const w = waterPath({ level, target: level, phi: 0, v: 0 }, 0);
  return (
    <svg viewBox="0 0 160 262" className={`jar-svg${capped ? "" : " uncapped"} ${className}`} role="img" aria-label="20 litre water jar">
      <defs>
        <linearGradient id={`${id}g`} x1="0" x2="1">
          <stop offset="0" stopColor="#cfe6fb" stopOpacity=".8" />
          <stop offset=".45" stopColor="#f2f9ff" stopOpacity=".5" />
          <stop offset="1" stopColor="#b7d7f4" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" x2="1">
          <stop offset="0" stopColor="#2a62b0" />
          <stop offset=".5" stopColor="#4b8fe2" />
          <stop offset="1" stopColor="#2a62b0" />
        </linearGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc8ff" />
          <stop offset="1" stopColor="#1c6fd0" />
        </linearGradient>
        <clipPath id={`${id}k`}><path d={JAR_BODY} /></clipPath>
      </defs>
      <g className="cap">
        <rect x="58" y="3" width="44" height="30" rx="9" fill={`url(#${id}c)`} />
        <rect x="76" y="9" width="8" height="18" rx="3" fill="#fff" fillOpacity=".75" />
      </g>
      <rect x="64" y="33" width="32" height="20" fill="#cfe4f7" stroke="#4f86bd" strokeWidth="2" />
      <path d={JAR_BODY} fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}k)`}>
        <path className="water" d={w.fill} fill={`url(#${id}w)`} fillOpacity=".92" />
        <path className="surf" d={w.surface} fill="none" stroke="#d6efff" strokeWidth="3" strokeLinecap="round" />
        <g className="bub" />
      </g>
      <path d={JAR_BODY} fill="none" stroke="#4f86bd" strokeWidth="2.5" strokeLinejoin="round" />
      <g fill="none" stroke="#4f86bd" strokeWidth="2.2" strokeOpacity=".75">
        <path d="M12 104C50 118 110 118 148 104" />
        <path d="M12 156C50 168 110 168 148 156" />
        <path d="M12 220C50 232 110 232 148 220" />
      </g>
      <path d="M22 110C22 132 25 190 27 224" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="6" strokeLinecap="round" />
      <path d="M40 94C60 98 80 98 100 94" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
