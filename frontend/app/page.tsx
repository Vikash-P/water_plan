import Link from "next/link";
import PincodeChecker from "@/components/PincodeChecker";
import LeadForm from "@/components/LeadForm";
import { getCatalog } from "@/lib/api";

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
  const catalog = await getCatalog();
  return (
    <>
      <section id="start" className="bg-gradient-to-b from-brand/10 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="display rise">
              20L drinking water at your door in <span className="text-brand">2 hours</span>.
            </h1>
            <p className="lead mt-4">ISI-certified, prepaid, one-tap refills. Built for Mumbai flats — no more calling around.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/order" className="btn btn-primary">Order water now</Link>
              <Link href="/track" className="btn border border-line">Track an order</Link>
            </div>
            <div className="mt-6 max-w-md"><p className="small mb-2 text-muted">Check if we deliver to you</p><PincodeChecker /></div>
          </div>
          <div className="card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Get your first jar free</h2>
            <p className="mb-4 text-sm text-muted">You only pay the ₹{catalog.deposit_per_jar} refundable deposit.</p>
            <LeadForm kind="waitlist" cta="Join waitlist" />
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="title">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="card p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-white">{i + 1}</div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="title">Simple pricing</h2>
          <p className="mt-2 text-muted">Passes are always cheaper per jar. Jar deposit of ₹{catalog.deposit_per_jar} is fully refundable when you return the jar.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {catalog.products.map((p) => (
              <div key={p.id} className={`card p-6 ${p.highlight ? "!border-brand ring-2 ring-brand" : ""}`}>
                <p className="text-sm font-medium text-brand">{p.tagline}</p>
                <h3 className="mt-1 text-xl font-semibold">{p.name}</h3>
                <p className="mt-4 text-4xl font-bold">₹{p.price}</p>
                <p className="text-sm text-muted">₹{p.per_jar} per jar{p.validity_days ? ` · valid ${p.validity_days} days` : ""}</p>
              </div>
            ))}
          </div>
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
    </>
  );
}
