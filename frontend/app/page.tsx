import PincodeChecker from "@/components/PincodeChecker";
import OrderForm from "@/components/OrderForm";
import Jar from "@/components/Jar";
import LeadForm from "@/components/LeadForm";
import Browse, { type Item } from "@/components/Browse";
import { getCatalog, getListings } from "@/lib/api";

const steps = [
  { t: "Pick a pass", d: "Pay once by UPI for 10 or 20 jars. Pay a refundable ₹350 deposit per jar we place with you." },
  { t: "Tap 'Refill'", d: "Message us on WhatsApp or tap one button. One credit is used. No cash, no calls." },
  { t: "Delivered in ~2 hours", d: "A verified rider brings a sealed ISI jar and collects the empty. Share a 4-digit OTP to confirm." },
];

const trust = [
  ["ISI/BIS-certified", "Every partner plant is verified, with licence numbers checked."],
  ["Sealed jars", "Tamper-proof neck tags with a QR code on each jar."],
  ["Prepaid, no cash", "No haggling, no extra charges at the door."],
  ["Private", "Your phone number is never shared with delivery staff."],
];

export default async function Home() {
  const [catalog, listings] = await Promise.all([getCatalog(), getListings()]);
  // Once any partner is listed, show only partner products; WaterMart's own packs are the fallback so the page is never empty.
  const own: Item[] = [
    ...catalog.products.map((p): Item => ({
      key: `jd-${p.id}`, pick: p.id, name: p.name, seller: "WaterMart", price: p.price, perJar: p.per_jar, kind: p.jars > 1 ? "pass" : "jar",
      partner: false, pincodes: [], badge: p.tagline, note: p.validity_days ? `Valid ${p.validity_days} days` : `${p.jars} jar`,
    })),
  ];
  const partnerItems: Item[] = [
    ...listings.map((l): Item => ({
      key: `l-${l.id}`, pick: `l:${l.id}`, name: l.name, seller: l.partner === l.name ? "Verified partner" : `by ${l.partner}`, price: l.price, perJar: l.price,
      kind: "jar", partner: true, partnerName: l.partner, pincodes: l.pincodes, note: `${l.size_litres}L jar`,
    })),
  ];
  const items = partnerItems.length > 0 ? partnerItems : own;
  return (
    <>
      <section id="start" className="bg-gradient-to-b from-brand-soft to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex items-center gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="display rise">20L water, delivered to your door in <span className="text-brand">2 hours</span>.</h1>
              <p className="lead mt-3 max-w-xl">Pick a brand from verified Mumbai partners. Prepaid, ISI-certified, no signup needed.</p>
              <div className="mt-6 max-w-lg"><PincodeChecker /></div>
              <p className="mt-4 inline-block rounded-full bg-card px-3 py-1 text-sm font-semibold text-brand shadow-sm">No signup needed to order.</p>
            </div>
            <Jar className="hidden h-56 shrink-0 drop-shadow-xl md:block" />
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="title mb-1">Order online from top water partners</h2>
        <p className="mb-6 text-muted">Jar deposit of ₹{catalog.deposit_per_jar} is fully refundable when you return the jar. Passes are always cheaper per jar.</p>
        <Browse items={items} />
      </section>

      <section id="order" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <div className="mb-8 flex items-center gap-5">
          <Jar className="hidden w-16 shrink-0 sm:block" />
          <div>
            <h2 className="title mb-2">Order 20L water jars</h2>
            <p className="lead">Tell us what and where. We confirm on WhatsApp and deliver in about 2 hours.</p>
            <p className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">No signup needed. Order as a guest.</p>
          </div>
        </div>
        <OrderForm catalog={catalog} listings={listings} />
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="title">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="card p-6">
              <div className="num-badge">{i + 1}</div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="title">Clean water you can verify</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {trust.map(([t, d]) => (
            <div key={t}><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="title">Where we deliver</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {catalog.zones.map((z) => (
              <div key={z.id} className="card p-5">
                <h3 className="font-semibold">{z.name}</h3>
                <p className="text-sm text-muted">{z.areas.join(", ")}</p>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${z.status === "launching" ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
                  {z.status === "launching" ? "Launching now" : "Coming soon"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card mx-auto max-w-xl p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Get your first jar free</h2>
          <p className="mb-4 text-sm text-muted">You only pay the ₹{catalog.deposit_per_jar} refundable deposit.</p>
          <LeadForm kind="waitlist" cta="Join waitlist" />
        </div>
      </section>
    </>
  );
}
