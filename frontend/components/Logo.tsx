/** WATERMART wordmark: rounded geometric capitals with a dark-to-sand gradient, as in the brand logo. */
export default function Logo({ className = "h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 330 40" className={className} role="img" aria-label="WaterMart" fill="none">
      <defs>
        <linearGradient id="wm-grad" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: "var(--logo-1)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--logo-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-3)" }} />
        </linearGradient>
      </defs>
      <text x="0" y="32" fontFamily="var(--font-comfortaa), 'Comfortaa', system-ui, sans-serif" fontWeight="700" fontSize="36" letterSpacing="3" fill="url(#wm-grad)">WATERMART</text>
    </svg>
  );
}
