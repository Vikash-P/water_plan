/** WaterMart mark: raised blue badge with a white water drop, then the name in Space Grotesk. */
export default function Logo({ small = false }: { small?: boolean }) {
  const box = small ? 28 : 34;
  return (
    <span className="flex items-center gap-2.5 text-foreground">
      <span
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{
          width: box, height: box, borderRadius: small ? 8 : 10,
          background: "linear-gradient(145deg, #2B86FF, #0047B3)",
          boxShadow: "0 4px 0 #00327F, 0 8px 16px rgba(0,71,179,0.3)",
        }}
      >
        <svg width={small ? 15 : 18} height={small ? 15 : 18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
        </svg>
      </span>
      <span className="display-font font-bold tracking-[0.02em]" style={{ fontSize: small ? 17 : 20 }}>WaterMart</span>
    </span>
  );
}
