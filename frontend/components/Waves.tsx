/** Slow rolling waves along the bottom edge of a section. Decorative. */
export default function Waves({ className = "" }: { className?: string }) {
  const tile = "M0 40 C 150 10 300 70 450 40 S 750 10 900 40 S 1200 70 1350 40 S 1650 10 1800 40 V80 H0 Z";
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden ${className}`} aria-hidden="true">
      <svg className="hero-wave-b absolute bottom-0 h-full w-[200%]" viewBox="0 0 1800 80" preserveAspectRatio="none"><path d={tile} fill="var(--accent)" fillOpacity="0.18" /></svg>
      <svg className="hero-wave-a absolute bottom-0 h-3/4 w-[200%]" viewBox="0 0 1800 80" preserveAspectRatio="none"><path d={tile} fill="var(--brand)" fillOpacity="0.16" /></svg>
    </div>
  );
}
