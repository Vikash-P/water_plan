import CssJar from "./CssJar";

const chip = "absolute flex items-center gap-2.5 rounded-2xl px-4 py-3";
const chipShadow = "0 4px 0 #CFDDEB, 0 20px 36px rgba(11,31,51,0.14)";

/** Hero 3D scene from the mockup: isometric platform, ripple rings, floating jar, three bobbing chips. CSS only. */
export default function HeroScene({ otpDemo = "4827" }: { otpDemo?: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_440px] justify-center">
      {/* Scaled down on phones so the 480px scene never overflows */}
      <div className="wm-anim relative h-[380px] w-[340px] max-w-full sm:h-[520px] sm:w-[480px]">
        <div className="absolute left-1/2 top-0 h-[520px] w-[480px] origin-top -translate-x-1/2 scale-[0.71] sm:scale-100">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[340px] -ml-[190px] h-[380px] w-[380px] rounded-[48px]"
            style={{ transform: "rotateX(62deg) rotateZ(45deg)", background: "linear-gradient(135deg, #FFFFFF, #DCEAF7)", boxShadow: "12px 12px 0 #B8CFE6, 24px 24px 0 #9DBBD9, 40px 40px 60px rgba(11,31,51,0.18)" }}
          />
          <div aria-hidden="true" className="absolute left-1/2 top-[395px] -ml-[150px] h-[90px] w-[300px] rounded-[50%] border-2 border-[rgba(0,87,217,0.18)]" style={{ animation: "wmRipple 3.2s ease-out infinite" }} />
          <div aria-hidden="true" className="absolute left-1/2 top-[410px] -ml-[110px] h-[62px] w-[220px] rounded-[50%] border-2 border-[rgba(0,87,217,0.28)]" style={{ animation: "wmRipple 3.2s 1.6s ease-out infinite" }} />
          <div className="absolute left-1/2 top-[70px] -ml-[100px]">
            <CssJar size="lg" />
          </div>

          <div className={`${chip} left-0 top-[96px] bg-white`} style={{ boxShadow: chipShadow, transform: "rotate(-4deg)", animation: "wmBob 5s ease-in-out infinite" }}>
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E5F0FF]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0057D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </span>
            <span><span className="block text-[15px] font-semibold">About 2 hours</span><span className="block text-[13px] text-muted">ASAP delivery</span></span>
          </div>
          <div className={`${chip} right-0 top-[200px] bg-white`} style={{ boxShadow: chipShadow, transform: "rotate(3deg)", animation: "wmBob 5s -1.7s ease-in-out infinite" }}>
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FFF1E2]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B85300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2" /></svg>
            </span>
            <span><span className="block text-[15px] font-semibold">QR seal on every jar</span><span className="block text-[13px] text-muted">Scan to verify plant</span></span>
          </div>
          <div className={`${chip} left-6 top-[300px] bg-night text-white`} style={{ boxShadow: "0 4px 0 #000000, 0 20px 36px rgba(11,31,51,0.25)", transform: "rotate(-2deg)", animation: "wmBob 5s -3.3s ease-in-out infinite" }}>
            <span className="display-font text-xl font-bold tracking-[0.3em]">{otpDemo}</span>
            <span className="text-[13px] text-[#C9D6E3]">OTP handover</span>
          </div>
        </div>
      </div>
    </div>
  );
}
