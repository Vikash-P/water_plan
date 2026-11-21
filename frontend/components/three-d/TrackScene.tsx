/**
 * Isometric city map from the tracking mockup: dashed route, scooter riding to the order's progress (0–1),
 * pulsing home pin. CSS only; decorative (the status is announced in text by the caller).
 */
const BLOCKS = [2, 3, 0, 1, 2, 1, 4, 1, 0, 2, 1, -1, 1, 2, 1, 2]; // stack height per tile; 0 = park, -1 = the blue landmark
const SIDES = ["#C6D8EA", "#B3CBE3", "#A3BFDC", "#93B3D5"];
const ROUTE = "M80 110 C 140 160, 170 190, 210 220 S 280 270, 300 300";

function tile(h: number) {
  if (h === 0) return { background: "#D6F0DF", boxShadow: "2px 2px 0 #B7E0C4" };
  if (h === -1) return { background: "#0057D9", boxShadow: "4px 4px 0 #0047B3, 8px 8px 0 #003C99, 12px 12px 0 #00317F, 16px 16px 20px rgba(0,40,106,0.35)" };
  return { background: "#FFFFFF", boxShadow: SIDES.slice(0, h).map((c, i) => `${(i + 1) * 4}px ${(i + 1) * 4}px 0 ${c}`).join(", ") };
}

export default function TrackScene({ progress }: { progress: number }) {
  return (
    <div aria-hidden="true" className="wm-anim relative h-[420px] overflow-hidden bg-[#E3EEF8]">
      <div className="absolute left-1/2 top-0 h-[420px] w-[390px] -translate-x-1/2">
        <div
          className="absolute left-1/2 top-10 -ml-[210px] grid h-[420px] w-[420px] grid-cols-4 gap-[18px]"
          style={{ transform: "rotateX(58deg) rotateZ(-45deg)" }}
        >
          {BLOCKS.map((h, i) => <div key={i} className="rounded-xl" style={tile(h)} />)}
        </div>
        <svg width="390" height="420" viewBox="0 0 390 420" className="absolute left-0 top-0">
          <path d={ROUTE} fill="none" stroke="#FF8A2A" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" style={{ animation: "wmDash 0.9s linear infinite" }} />
        </svg>
        <div className="absolute left-[280px] top-[270px] box-border h-10 w-10 rounded-full border-[3px] border-brand" style={{ animation: "wmPing 1.8s ease-out infinite" }} />
        <div className="absolute left-[280px] top-[270px] h-10 w-10 rounded-full border-4 border-brand bg-white" style={{ boxShadow: "0 8px 18px rgba(0,71,179,0.35)" }} />
        <div
          className="wm-ride absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-[14px] bg-orange"
          style={{ "--to": `${Math.round(progress * 90)}%`, boxShadow: "0 4px 0 #C25A00, 0 10px 20px rgba(194,90,0,0.4)" } as React.CSSProperties}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17h5l3-7h3M9 10h4" /></svg>
        </div>
      </div>
    </div>
  );
}
