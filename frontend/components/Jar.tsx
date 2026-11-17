import { useId } from "react";

/** 20L water jar: blue cap, narrow neck, sloped shoulders, ribbed body. */
export default function Jar({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 160 262" className={className} role="img" aria-label="20 litre water jar">
      <defs>
        <linearGradient id={`${id}b`} x1="0" x2="1">
          <stop offset="0" stopColor="#7fb0dc" />
          <stop offset="0.45" stopColor="#a9cdee" />
          <stop offset="1" stopColor="#6c9fd0" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" x2="1">
          <stop offset="0" stopColor="#2a62b0" />
          <stop offset="0.5" stopColor="#3f82d6" />
          <stop offset="1" stopColor="#2a62b0" />
        </linearGradient>
      </defs>
      <rect x="58" y="3" width="44" height="30" rx="9" fill={`url(#${id}c)`} />
      <rect x="76" y="9" width="8" height="18" rx="3" fill="#fff" fillOpacity=".75" />
      <rect x="64" y="33" width="32" height="20" fill="#9cc3e6" stroke="#4f86bd" strokeWidth="2" />
      <path
        d="M64 52H96V60C96 74 150 78 150 102V226C150 246 138 258 120 258H40C22 258 10 246 10 226V102C10 78 64 74 64 60Z"
        fill={`url(#${id}b)`} stroke="#4f86bd" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path d="M12 104C50 118 110 118 148 104" fill="none" stroke="#4f86bd" strokeWidth="2.5" />
      <path d="M12 156C50 168 110 168 148 156" fill="none" stroke="#4f86bd" strokeWidth="2.5" />
      <path d="M12 220C50 232 110 232 148 220" fill="none" stroke="#4f86bd" strokeWidth="2.5" />
      <path d="M20 108C20 130 24 190 26 226" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" />
      <path d="M40 94C60 98 80 98 100 94" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
