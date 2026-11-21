/**
 * 20L jar drawn with CSS only (no JS), ported from the 3D concept mockups.
 * lg = the hero jar (200×330), sm = the order card jar (104×140). Decorative: aria-hidden.
 */
type Props = { size?: "lg" | "sm"; level?: string; capped?: boolean; float?: boolean; label?: boolean };

const GLASS = "linear-gradient(90deg, #8FBDE6, #EEF8FF 36%, #B7D8F3 68%, #7FAEDB)";
const WATER = "linear-gradient(90deg, #0B5FD0, #4FA9FF 36%, #1F7DE6 68%, #0A4FAE)";
const NECK = "linear-gradient(90deg, #8EBEE6, #EAF6FF 45%, #9CC6EA)";
const CAP = "linear-gradient(90deg, #00337F, #2B86FF 42%, #0047B3 80%, #00337F)";

export default function CssJar({ size = "lg", level = "74%", capped = true, float = true, label = true }: Props) {
  const lg = size === "lg";
  const d = lg
    ? { w: 200, h: 330, cap: [68, 0, 64, 30], band: [66, 22, 68, 12], neck: [78, 32, 44, 22], body: [10, 50, 180, 276], radius: "78px 78px 30px 30px", shadow: [20, 160, 30], hl: [32, 30, 16, 210], wave: 18 }
    : { w: 104, h: 140, cap: [36, 0, 32, 15], band: [0, 0, 0, 0], neck: [40, 14, 24, 12], body: [6, 24, 92, 114], radius: "40px 40px 16px 16px", shadow: [12, 80, 14], hl: [16, 14, 9, 84], wave: 10 };
  const box = (b: number[]) => ({ position: "absolute" as const, left: b[0], top: b[1], width: b[2], height: b[3] });

  return (
    <div aria-hidden="true" className="wm-anim relative" style={{ width: d.w, height: d.h, flex: "0 0 auto" }}>
      <div
        style={{
          position: "absolute", left: d.shadow[0], bottom: lg ? -16 : -6, width: d.shadow[1], height: d.shadow[2], borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(11,31,51,0.35), rgba(11,31,51,0) 70%)",
          animation: float ? `wmShadow ${lg ? 4 : 3.5}s ease-in-out infinite` : undefined,
        }}
      />
      <div style={{ position: "absolute", inset: 0, animation: float ? `${lg ? "wmFloat 4s" : "wmFloatSm 3.5s"} ease-in-out infinite` : undefined }}>
        {capped && (
          <>
            <div style={{ ...box(d.cap), borderRadius: lg ? "10px 10px 5px 5px" : "6px 6px 3px 3px", background: CAP, boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.18)" }} />
            {lg && <div style={{ ...box(d.band), borderRadius: 4, background: "linear-gradient(90deg, #FF8A2A, #FFC270 45%, #E86E0C)" }} />}
          </>
        )}
        <div style={{ ...box(d.neck), background: NECK }} />
        <div style={{ ...box(d.body), borderRadius: d.radius, overflow: "hidden", background: GLASS, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5)" }}>
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: level, background: WATER,
              transition: "height 0.6s cubic-bezier(0.3, 1.4, 0.5, 1)",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: -d.wave / 2, height: d.wave, borderRadius: "50%", background: "#8FD2FF", animation: `wmWave ${lg ? 2.6 : 2.4}s ease-in-out infinite` }} />
          </div>
          {lg && (
            <>
              <div style={{ position: "absolute", left: 0, right: 0, top: "36%", height: 3, background: "rgba(255,255,255,0.35)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: "86%", height: 3, background: "rgba(255,255,255,0.35)" }} />
            </>
          )}
          <div style={{ ...box(d.hl), borderRadius: 10, background: "rgba(255,255,255,0.55)" }} />
          {lg && label && (
            <div style={{ position: "absolute", left: "50%", top: 118, width: 108, marginLeft: -54, padding: "10px 0", borderRadius: 10, background: "#FFFFFF", textAlign: "center", boxShadow: "0 6px 14px rgba(0,40,100,0.25)" }}>
              <div className="display-font" style={{ fontWeight: 700, fontSize: 28, lineHeight: 1, color: "#0B1F33" }}>20L</div>
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#1D3A57" }}>ISI · SEALED</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
