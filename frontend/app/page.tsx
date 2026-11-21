import { Suspense, cache } from "react";
import { connection } from "next/server";
import PincodeChecker from "@/components/PincodeChecker";
import OrderForm from "@/components/OrderForm";
import HeroScene from "@/components/three-d/HeroScene";
import IsoAreasMap from "@/components/three-d/IsoAreasMap";
import { zoneBlocks } from "@/lib/three-d/layout.ts";
import LeadForm from "@/components/LeadForm";
import Browse, { type Item } from "@/components/Browse";
import { getCatalog, getListings } from "@/lib/api";

const steps = [
  { t: "Pick a pass", d: "Pay once by UPI for 10 or 20 jars, plus a refundable deposit per jar placed with you." },
  { t: "Tap Refill", d: "One button in the app or a WhatsApp message. One credit is used. No cash, no calls." },
  { t: "Swap at the door", d: "A verified rider brings a sealed jar, takes the empty, and you share a 4-digit OTP." },
];

const ICON = { width: 32, height: 32, viewBox: "0 0 24 24", fill: "none", stroke: "#0057D9", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const trust = [
  { t: "Tamper-proof seal", d: "Neck tag with a QR code you can scan at the door.", icon: <svg {...ICON}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg> },
  { t: "Prepaid, no cash", d: "No haggling and no extra charges at the door.", icon: <svg {...ICON}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg> },
  { t: "Number stays private", d: "Riders never see your phone number.", icon: <svg {...ICON}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><path d="M4 4l16 16" /></svg> },
];

// Only the parts that need API data wait for it; everything else is in the instant static shell.
// Data is read per request, never at build time: the build can't reach the API and would bake in an empty partner list.
// cache(): the sections below share one fetch per request.
const loadData = cache(async () => {
  await connection();
  return Promise.all([getCatalog(), getListings()]);
});

/** Placeholder with the final block's rough height, so streamed content doesn't push the page around. */
function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl motion-reduce:animate-none bg-line/60 ${className}`} />;
}

export default function Home() {
  return (
    <>
      <section id="top" className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-12 px-6 pb-14 pt-12 md:pt-[72px]">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <Suspense fallback={null}>
            <LiveBadge />
          </Suspense>
          <h1 className="display rise m-0">20L water at your door in about 2 hours.</h1>
          <p className="lead m-0 max-w-[520px]">Sealed, ISI-certified jars from verified Mumbai plants. Pay once by UPI, refill with one tap, hand over with an OTP.</p>
          <PincodeChecker />
          <div className="flex flex-wrap gap-5 text-sm text-[#3A4F64]">
            {["No signup needed", "Confirm on WhatsApp", "Deposit refunded on return"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0057D9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
        <HeroScene />
      </section>

      <section id="how" className="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-16">
        <h2 className="title m-0 mb-2">Three taps to a full jar</h2>
        <p className="lead m-0 mb-10">Each step is a raised tile, so the order of things reads at a glance.</p>
        <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {steps.map((s, i) => (
            <div key={s.t} className="wm-lift flex flex-col gap-3.5 rounded-3xl bg-white p-7" style={{ boxShadow: "8px 8px 0 #D3E1EE, 16px 16px 0 #BCD0E4" }}>
              <span aria-hidden="true" className="display-font text-[72px] font-bold leading-none text-brand" style={{ textShadow: "2px 2px 0 #9CC2F5, 4px 4px 0 #C9DCF7" }}>{i + 1}</span>
              <h3 className="m-0 text-[22px] font-bold"><span className="sr-only">Step {i + 1}: </span>{s.t}</h3>
              <p className="m-0 leading-relaxed text-[#3A4F64]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 bg-night px-6 py-20 text-white">
        <div className="mx-auto max-w-[1240px]">
          <h2 className="title m-0 mb-2">Choose how you refill</h2>
          <p className="m-0 mb-10 text-lg text-[#C9D6E3]">The pass most homes pick sits forward. Deposit shown separately on every card.</p>
          <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-3xl bg-[#13304D] motion-reduce:animate-none" />}>
            <Pricing />
          </Suspense>
        </div>
      </section>

      <section id="order" className="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-12">
        <h2 className="title m-0 mb-2">Order 20L water jars</h2>
        <p className="lead m-0 mb-8">Tell us what and where. We confirm on WhatsApp and deliver in about 2 hours. No signup needed.</p>
        <Suspense fallback={<Skeleton className="h-[36rem]" />}>
          <Order />
        </Suspense>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <h2 className="title m-0 mb-8">Water you can check yourself</h2>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {trust.map((c) => (
            <div key={c.t} className="wm-raised flex flex-col gap-2.5 p-6">
              {c.icon}
              <h3 className="m-0 text-[19px] font-bold">{c.t}</h3>
              <p className="m-0 leading-normal text-[#3A4F64]">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <Suspense fallback={<Skeleton className="mx-auto my-10 h-80 max-w-[1240px]" />}>
        <Areas />
      </Suspense>

      <section id="notify" className="mx-auto mb-20 max-w-[1240px] scroll-mt-20 px-6">
        <div className="flex flex-wrap items-center gap-8 rounded-[32px] bg-brand p-8 text-white sm:p-12" style={{ boxShadow: "0 10px 0 #003C99, 0 30px 60px rgba(0,87,217,0.3)" }}>
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
            <h2 className="m-0 text-[40px] font-bold leading-tight">Every 11th jar is free*</h2>
            <Suspense fallback={<p className="m-0 text-[17px] text-[#E3EEFF]">*Pay for 10 jars and the 11th is on us. Refundable jar deposit applies.</p>}>
              <DepositNote />
            </Suspense>
          </div>
          <div className="min-w-0 flex-[1_1_320px]">
            <LeadForm kind="waitlist" cta="Join waitlist" variant="banner" />
          </div>
        </div>
      </section>
    </>
  );
}

async function Pricing() {
  const [catalog, listings] = await loadData();
  // Once any partner is listed, show only partner products; WaterMart's own packs are the fallback so the page is never empty.
  const own: Item[] = catalog.products.map((p): Item => ({
    key: `jd-${p.id}`, pick: p.id, name: p.name, seller: "WaterMart", price: p.price, perJar: p.per_jar, kind: p.jars > 1 ? "pass" : "jar",
    partner: false, pincodes: [], badge: p.tagline, note: p.validity_days ? `Valid ${p.validity_days} days` : `${p.jars} jar`,
    deposit: catalog.deposit_per_jar,
  }));
  const partnerItems: Item[] = listings.map((l): Item => ({
    key: `l-${l.id}`, pick: `l:${l.id}`, name: l.name, seller: "Verified partner", price: l.price, perJar: l.price,
    kind: "jar", partner: true, pincodes: l.pincodes, note: `${l.size_litres}L jar`,
    deposit: l.deposit_per_jar ?? catalog.deposit_per_jar,
  }));
  return <Browse items={partnerItems.length > 0 ? partnerItems : own} />;
}

/** "Now delivering in …" from the first live zone; hidden when no zone is live. */
async function LiveBadge() {
  const [catalog] = await loadData();
  const live = catalog.zones.find((z) => z.status === "launching");
  if (!live) return null;
  return (
    <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#D3E1EE] bg-white px-3.5 py-[7px] text-sm font-medium text-[#1D3A57]">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#12A150]" />Now delivering in {live.name}
    </span>
  );
}

async function Order() {
  const [catalog, listings] = await loadData();
  return <OrderForm catalog={catalog} listings={listings} />;
}

/** "Where we deliver": zone list plus the isometric block map. Hidden when there are no zones. */
async function Areas() {
  const [catalog] = await loadData();
  if (catalog.zones.length === 0) return null;
  const zones = [...catalog.zones].sort((a, b) => Number(b.status === "launching") - Number(a.status === "launching"));
  return (
    <section id="areas" className="mx-auto flex max-w-[1240px] scroll-mt-20 flex-wrap items-center gap-12 px-6 pb-20 pt-10">
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        <h2 className="title m-0">Where we deliver</h2>
        <p className="lead m-0">Raised blocks are live. Flat ones are coming soon, so you can join the list for your area.</p>
        <ul className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-[18px] py-3.5">
              <span><span className="font-semibold">{z.name}</span>{z.areas.length > 0 && <span className="text-muted"> · {z.areas.join(", ")}</span>}</span>
              {z.status === "launching"
                ? <span className="shrink-0 rounded-full bg-[#DDF5E6] px-2.5 py-1 text-[13px] font-semibold text-[#0B6A32]">Live</span>
                : <a href="#notify" className="shrink-0 text-sm font-semibold text-brand">Notify me</a>}
            </li>
          ))}
        </ul>
      </div>
      <IsoAreasMap blocks={zoneBlocks(catalog.zones)} />
    </section>
  );
}

async function DepositNote() {
  const [catalog] = await loadData();
  return <p className="m-0 text-[17px] text-[#E3EEFF]">*Pay for 10 jars and the 11th is on us. Refundable jar deposit of ₹{catalog.deposit_per_jar} applies.</p>;
}
