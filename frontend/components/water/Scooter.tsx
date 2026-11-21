/** Delivery rider for the order-placed card. CSS-only: rides in once; static under reduced motion (see globals.css). */
export default function Scooter() {
  return (
    <div className="road">
      <svg className="scooter" viewBox="0 0 130 78" role="img" aria-label="Rider on a scooter carrying your jar">
        <line className="speed" x1="-30" y1="40" x2="-6" y2="40" /><line className="speed" x1="-40" y1="54" x2="-12" y2="54" />
        <g className="bodyg">
          <rect x="4" y="14" width="22" height="30" rx="6" fill="#a9d3f5" stroke="#4f86bd" strokeWidth="2" />
          <rect x="10" y="6" width="10" height="9" rx="3" fill="#2a6fcf" />
          <path d="M6 50h70l14-22h10l-10 26H18Z" fill="var(--brand)" />
          <path d="M90 28l8-20" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="62" cy="12" r="8" fill="#F2B48A" />
          <path d="M54 8a8 8 0 0 1 16 0Z" fill="#FFB627" />
          <path d="M58 20l-6 26M60 26l26 0" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
        <g><circle cx="24" cy="62" r="13" fill="var(--foreground)" /><g className="spokes"><circle cx="24" cy="62" r="5" fill="#cfe4f7" /><path d="M24 52v20M14 62h20" stroke="#cfe4f7" strokeWidth="2" /></g></g>
        <g><circle cx="100" cy="62" r="13" fill="var(--foreground)" /><g className="spokes"><circle cx="100" cy="62" r="5" fill="#cfe4f7" /><path d="M100 52v20M90 62h20" stroke="#cfe4f7" strokeWidth="2" /></g></g>
      </svg>
    </div>
  );
}
