"use client";
import { useMemo, useState } from "react";
import { pricingLayout } from "@/lib/three-d/layout.ts";

export type Item = {
  key: string; pick: string; name: string; seller: string; price: number; perJar: number; note: string;
  kind: "pass" | "jar"; partner: boolean; partnerName?: string; pincodes: string[]; badge?: string;
  /** Refundable deposit per jar, shown on the card. */
  deposit?: number;
};

const CHIPS = [
  { id: "all", label: "All" },
  { id: "jar", label: "Single jars" },
  { id: "pass", label: "Passes" },
  { id: "cheap", label: "Under ₹60 / jar" },
  { id: "partner", label: "Partner brands" },
];

export default function Browse({ items }: { items: Item[] }) {
  const [chip, setChip] = useState("all");
  const [pin, setPin] = useState("");

  const shown = useMemo(() => {
    let out = items;
    if (chip === "jar" || chip === "pass") out = out.filter((i) => i.kind === chip);
    if (chip === "cheap") out = out.filter((i) => i.perJar < 60);
    if (chip === "partner") out = out.filter((i) => i.partner);
    if (/^\d{6}$/.test(pin)) out = out.filter((i) => !i.partner || i.pincodes.length === 0 || i.pincodes.includes(pin));
    return [...out].sort((a, b) => a.perJar - b.perJar);
  }, [items, chip, pin]);

  const { featured, tilted } = pricingLayout(shown.map((i) => i.kind));
  const pick = (i: Item) => window.dispatchEvent(new CustomEvent("jd-pick", { detail: i.pick }));

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <label htmlFor="browse-pin" className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-white px-4 py-3 text-foreground md:max-w-sm" style={{ boxShadow: "0 4px 0 #8FA7BF" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0057D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="10" r="3" /><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /></svg>
          <span className="sr-only">Your pincode</span>
          <input id="browse-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Your pincode, e.g. 400053" className="w-full min-w-0 bg-transparent outline-none placeholder:text-[#4A5B6E]" />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter products">
          {CHIPS.map((c) => (
            <button key={c.id} onClick={() => setChip(c.id)} aria-pressed={chip === c.id}
              className={`wm-press min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${chip === c.id ? "border-white bg-white text-[#0047B3]" : "border-[#4A77A6] bg-transparent text-white hover:border-white"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center text-foreground" style={{ boxShadow: "0 8px 0 #0047B3" }}>
          <p className="m-0 text-lg font-semibold">{/^\d{6}$/.test(pin) ? `No partner delivers to ${pin} yet` : "No products match this filter"}</p>
          <a href="#notify" className="mt-4 inline-block font-semibold text-brand">Join the waitlist</a>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-7 p-0 [perspective:1400px]">
          {shown.map((i, idx) => {
            const hero = idx === featured;
            const tilt = tilted && !hero ? (idx < (featured ?? 0) ? "md:[transform:rotateY(14deg)]" : "md:[transform:rotateY(-14deg)]") : "";
            return (
              <li
                key={i.key}
                className={`flex flex-[1_1_280px] flex-col gap-3.5 ${hero ? "max-w-[360px] rounded-[28px] bg-white px-8 py-10 text-foreground md:-translate-y-3" : `max-w-[340px] rounded-3xl border border-[#24476B] bg-[#13304D] p-8 text-white ${tilt}`}`}
                style={hero ? { boxShadow: "0 8px 0 #0047B3, 0 30px 60px rgba(0,87,217,0.45)" } : { boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}
              >
                {hero && <span className="self-start rounded-full bg-[#FFE2C2] px-3 py-1.5 text-[13px] font-semibold text-[#7A3A00]">Most popular</span>}
                <span className={`text-sm font-semibold uppercase tracking-[0.08em] ${hero ? "text-[#1D3A57]" : "text-[#9FC4EC]"}`}>{i.partnerName ?? i.badge ?? i.seller}</span>
                <h3 className="m-0 text-xl font-bold leading-tight">{i.name}</h3>
                <span className="display-font text-5xl font-bold">₹{i.price}</span>
                <span className={hero ? "text-[#3A4F64]" : "text-[#C9D6E3]"}>{i.kind === "pass" ? `₹${i.perJar} per jar · ${i.note}` : `${i.note} · about 2 hours`}</span>
                {i.deposit != null && <span className={`text-sm ${hero ? "text-[#3A4F64]" : "text-[#C9D6E3]"}`}>+ ₹{i.deposit} refundable deposit{i.kind === "pass" ? " per jar" : ""}</span>}
                <a
                  href="#order"
                  onClick={() => pick(i)}
                  className={hero
                    ? "btn btn-primary wm-press mt-2 !rounded-xl !py-[15px] text-center no-underline"
                    : "btn wm-press mt-2 !rounded-xl border border-[#4A77A6] !py-3.5 text-center text-white no-underline hover:border-white"}
                >
                  Order · ₹{i.price}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
