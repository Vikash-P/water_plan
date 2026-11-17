"use client";
import { useMemo, useState } from "react";
import Jar from "@/components/Jar";

export type Item = {
  key: string; pick: string; name: string; seller: string; price: number; perJar: number; note: string;
  kind: "pass" | "jar"; partner: boolean; partnerName?: string; pincodes: string[]; badge?: string;
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 shadow-sm md:max-w-sm" htmlFor="browse-pin">
          <span aria-hidden="true">📍</span>
          <input id="browse-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Your pincode, e.g. 400053" className="w-full min-w-0 bg-transparent outline-none" />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter products">
          {CHIPS.map((c) => (
            <button key={c.id} onClick={() => setChip(c.id)} aria-pressed={chip === c.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${chip === c.id ? "border-brand bg-brand text-white" : "border-line bg-card hover:border-brand"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-muted">Nothing matches this filter and pincode yet. Try “All”, or clear the pincode.</p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((i) => (
            <li key={i.key} className="group overflow-hidden rounded-2xl border border-line bg-card transition-shadow hover:shadow-lg">
              <div className="relative flex h-40 items-end justify-center bg-gradient-to-b from-sky-100 to-sky-50 dark:from-sky-950 dark:to-background">
                <Jar className="h-32 transition-transform group-hover:scale-105" />
                {i.partnerName && <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-md bg-brand px-2 py-1 text-xs font-bold text-white">{i.partnerName}</span>}
                {i.badge && <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-1 text-xs font-bold text-white">{i.badge}</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-tight">{i.name}</h3>
                  <span className="shrink-0 rounded-md bg-brand-soft px-2 py-0.5 text-sm font-bold text-brand">₹{i.perJar}/jar</span>
                </div>
                <p className="mt-1 text-sm text-muted">{i.seller}</p>
                <p className="mt-3 flex items-center justify-between text-xs text-muted"><span>⏱ ~2 hrs</span><span>{i.note}</span></p>
                <a href="#order" onClick={() => window.dispatchEvent(new CustomEvent("jd-pick", { detail: i.pick }))} className="btn btn-primary mt-4 w-full !py-2 text-sm">Order · ₹{i.price}</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
