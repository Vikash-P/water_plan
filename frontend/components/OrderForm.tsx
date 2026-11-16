"use client";
import Link from "next/link";
import { useState } from "react";
import type { Catalog } from "@/lib/api";
import { SLOTS, errorMessage, type Order } from "@/lib/orders";

type Zone = { status: string; zone: string | null } | null;

export default function OrderForm({ catalog }: { catalog: Catalog }) {
  const [product, setProduct] = useState("single");
  const [jars, setJars] = useState(1);
  const [hasJars, setHasJars] = useState(false);
  const [slot, setSlot] = useState("asap");
  const [pin, setPin] = useState("");
  const [zone, setZone] = useState<Zone>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);

  const p = catalog.products.find((x) => x.id === product)!;
  const amount = p.id === "single" ? p.price * jars : p.price;
  const deposit = hasJars ? 0 : catalog.deposit_per_jar * jars;

  async function checkPin(value: string) {
    setZone(null);
    if (value.length !== 6) return;
    try {
      const r = await fetch(`/api/serviceability/${value}`);
      setZone(r.ok ? await r.json() : null);
    } catch { /* the server validates again on submit */ }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"), phone: f.get("phone"), pincode: pin, society: f.get("society"),
      tower: f.get("tower") || null, flat: f.get("flat"), product_id: product, jars_now: jars,
      has_jars: hasJars, slot, notes: f.get("notes") || null,
    };
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      setPlaced(data);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <div className="card mx-auto max-w-xl p-8" role="status">
        <p className="text-sm font-medium text-brand">Request received</p>
        <h1 className="title mt-1">Thank you, {placed.name.split(" ")[0]}!</h1>
        <p className="lead mt-3">We'll confirm on WhatsApp shortly and send a UPI link for the amount below. Nothing is charged until you pay that link.</p>
        <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted">Order code</dt><dd className="font-mono font-semibold">{placed.code}</dd>
          <dt className="text-muted">Delivering</dt><dd>{placed.jars_now} × 20L jar · {placed.product}</dd>
          <dt className="text-muted">To</dt><dd>{placed.society}{placed.tower ? `, ${placed.tower}` : ""}, {placed.flat}</dd>
          <dt className="text-muted">When</dt><dd>{placed.slot}</dd>
          <dt className="text-muted">Amount</dt><dd>₹{placed.amount}</dd>
          <dt className="text-muted">Refundable deposit</dt><dd>₹{placed.deposit}</dd>
          <dt className="font-semibold">Total to pay</dt><dd className="font-semibold">₹{placed.total_due}</dd>
        </dl>
        <p className="mt-4 text-sm text-muted">Save your order code — you'll need it with your phone number to track this order.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/track?code=${placed.code}`} className="btn btn-primary">Track this order</Link>
          <button className="btn border border-line" onClick={() => setPlaced(null)}>Place another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-8">
        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">1. What would you like?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {catalog.products.map((x) => (
              <label key={x.id} className={`card cursor-pointer p-4 transition-colors ${product === x.id ? "!border-brand ring-2 ring-brand" : ""}`}>
                <input type="radio" name="product" className="sr-only" checked={product === x.id} onChange={() => setProduct(x.id)} />
                <span className="block text-xs font-medium text-brand">{x.tagline}</span>
                <span className="block font-semibold">{x.name}</span>
                <span className="block text-sm text-muted">₹{x.price}{x.jars > 1 ? ` · ₹${x.per_jar}/jar` : " per jar"}</span>
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-3 text-sm">
            <span>{p.id === "single" ? "Jars" : "Jars to deliver now"}</span>
            <select value={jars} onChange={(e) => setJars(Number(e.target.value))} className="field !w-24">
              {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={hasJars} onChange={(e) => setHasJars(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
            I already have JalDrop jars to swap (no new deposit)
          </label>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">2. Where should we deliver?</legend>
          <input name="name" required minLength={2} autoComplete="name" placeholder="Your name" className="field" />
          <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="WhatsApp number (10 digits)" className="field" />
          <div>
            <input value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(v); checkPin(v); }}
              required inputMode="numeric" pattern="\d{6}" placeholder="Pincode" aria-label="Pincode" className="field" />
            {zone && (
              <p className={`mt-2 text-sm ${zone.status === "launching" ? "text-green-600" : "text-amber-600"}`} role="status">
                {zone.status === "launching" ? `✓ We deliver in ${zone.zone}` : zone.status === "waitlist" ? `${zone.zone} isn't live yet — you can join the waitlist on the home page.` : "We don't deliver here yet."}
              </p>
            )}
          </div>
          <input name="society" required placeholder="Society / building name" className="field" />
          <div className="grid grid-cols-2 gap-3">
            <input name="tower" placeholder="Tower / wing (optional)" className="field" />
            <input name="flat" required placeholder="Flat number" className="field" />
          </div>
          <textarea name="notes" rows={2} maxLength={500} placeholder="Gate or lift instructions (optional)" className="field" />
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">3. When?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SLOTS.map((s) => (
              <label key={s.id} className={`card cursor-pointer p-4 ${slot === s.id ? "!border-brand ring-2 ring-brand" : ""}`}>
                <input type="radio" name="slot" className="sr-only" checked={slot === s.id} onChange={() => setSlot(s.id)} />
                <span className="block font-semibold">{s.label}</span>
                <span className="block text-sm text-muted">{s.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card p-6">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <dt className="text-muted">{p.name}{p.id === "single" ? ` × ${jars}` : ""}</dt><dd>₹{amount}</dd>
            <dt className="text-muted">Refundable deposit</dt><dd>₹{deposit}</dd>
            <dt className="border-t border-line pt-2 font-semibold">Total</dt><dd className="border-t border-line pt-2 font-semibold">₹{amount + deposit}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">No payment now. We confirm on WhatsApp and send a UPI link. The deposit is refunded when you return the jars.</p>
          <button disabled={busy} className="btn btn-primary mt-5 w-full">{busy ? "Placing request…" : "Request delivery"}</button>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </aside>
    </form>
  );
}
