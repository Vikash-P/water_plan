"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LivingJar, { type JarApi } from "@/components/water/LivingJar";
import Scooter from "@/components/water/Scooter";
import { burst } from "@/components/water/Splash";
import { orderFill } from "@/lib/water/orderFill.ts";
import type { Catalog, Listing } from "@/lib/api";
import { SLOTS, errorMessage, type Order } from "@/lib/orders";

type Zone = { status: string; zone: string | null } | null;
type Addr = { society: string; tower: string | null; flat: string; pincode: string };
type Saved = { phone: string; name: string | null; addresses: Addr[] };
const JSON_H = { "Content-Type": "application/json" };

export default function OrderForm({ catalog, listings = [] }: { catalog: Catalog; listings?: Listing[] }) {
  const [product, setProduct] = useState(listings.length > 0 ? `l:${listings[0].id}` : "single");
  const [jars, setJars] = useState(1);
  const [hasJars, setHasJars] = useState(false);
  const [slot, setSlot] = useState("asap");
  const [pin, setPin] = useState("");
  const [zone, setZone] = useState<Zone>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);
  // Returning customers: tick "I already have jars" -> verify the phone once -> pick a saved address.
  const [saved, setSaved] = useState<Saved | "login" | null>(null);
  const [fill, setFill] = useState<{ name?: string; phone?: string; society?: string; tower?: string; flat?: string }>({});
  const [fillKey, setFillKey] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [vPhone, setVPhone] = useState("");
  const [vCode, setVCode] = useState("");
  const [vSent, setVSent] = useState(false);
  const [vHint, setVHint] = useState("");
  const [vErr, setVErr] = useState("");
  const [vBusy, setVBusy] = useState(false);
  // Living jar: fills as the form is completed.
  const formRef = useRef<HTMLFormElement>(null);
  const jarRef = useRef<JarApi | null>(null);
  const doneRef = useRef(-1);
  const [fillInfo, setFillInfo] = useState(() => orderFill({ product: true, name: "", phone: "", pincode: "", society: "", flat: "", slot: true }));
  const onJar = useCallback((api: JarApi) => { jarRef.current = api; doneRef.current = -1; setFillInfo((o) => o); }, []);
  const onPlacedJar = useCallback((api: JarApi) => {
    // After the success scroll-to-top has settled: close the cap, hop and splash once.
    requestAnimationFrame(() => {
      api.setCapped(true); api.hop();
      const r = api.el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * 0.45);
    });
  }, []);

  // "single" / "pass10" are WaterMart packs; "l:12" is a partner's listing (priced per jar by the partner).
  const listing = product.startsWith("l:") ? listings.find((l) => `l:${l.id}` === product) : undefined;
  const pack = catalog.products.find((x) => x.id === product);
  const p = listing
    ? { id: product, name: listing.name, price: listing.price }
    : pack ?? catalog.products[0];
  const perJar = !!listing || p.id === "single";
  const amount = perJar ? p.price * jars : p.price;
  const wrongArea = !!listing && listing.pincodes.length > 0 && pin.length === 6 && !listing.pincodes.includes(pin);

  useEffect(() => {
    const onPick = (e: Event) => setProduct((e as CustomEvent<string>).detail);
    window.addEventListener("jd-pick", onPick);
    return () => window.removeEventListener("jd-pick", onPick);
  }, []);

  const recompute = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const f = new FormData(form);
    const v = (k: string) => String(f.get(k) ?? "");
    const r = orderFill({ product: !!product, name: v("name"), phone: v("phone"), pincode: pin, society: v("society"), flat: v("flat"), slot: !!slot });
    const prev = doneRef.current;
    doneRef.current = r.done;
    setFillInfo((o) => (o.done === r.done && o.missing === r.missing ? o : r));
    jarRef.current?.setTarget(r.level);
    if (prev >= 0 && r.done > prev) jarRef.current?.kick(0.07);
  }, [product, pin, slot]);
  // Autofill applies via defaultValue + remount, so read the form after render.
  useEffect(() => { recompute(); }, [recompute, fillKey, placed]);

  // Only fills in once the customer has typed their own number. A login left over in this browser is used
  // silently when the typed number matches it; any other number has to be verified with a code.
  async function loadSaved(typed?: string) {
    try {
      const r = await fetch("/api/me/addresses");
      if (!r.ok) { if (!typed) setSaved("login"); return; }
      const d: Saved = await r.json();
      if (typed && d.phone !== typed) return;
      setSaved(d);
      setFill((f) => ({ ...f, name: d.name ?? f.name, phone: d.phone }));
      setFillKey((k) => k + 1);
      if (d.addresses.length === 1) chooseAddr(d, 0);
    } catch { if (!typed) setSaved("login"); }
  }
  function onVPhone(v: string) {
    setVPhone(v);
    const digits = v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (digits.length === 10) loadSaved(digits);
  }

  function chooseAddr(d: Saved, i: number) {
    const a = d.addresses[i];
    setPicked(i);
    setFill({ name: d.name ?? undefined, phone: d.phone, society: a.society, tower: a.tower ?? "", flat: a.flat });
    setFillKey((k) => k + 1);
    setPin(a.pincode); checkPin(a.pincode);
  }
  async function sendCode() {
    setVBusy(true); setVErr("");
    try {
      const r = await fetch("/api/auth/otp/request", { method: "POST", headers: JSON_H, body: JSON.stringify({ phone: vPhone }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setVErr(errorMessage(d)); return; }
      setVSent(true); setVHint(d.dev_code ?? "");
    } catch { setVErr("Couldn't reach the server. Please try again."); } finally { setVBusy(false); }
  }
  async function verifyCode() {
    setVBusy(true); setVErr("");
    try {
      const r = await fetch("/api/auth/otp/verify", { method: "POST", headers: JSON_H, body: JSON.stringify({ phone: vPhone, code: vCode }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setVErr(errorMessage(d)); return; }
      await loadSaved();
    } catch { setVErr("Couldn't reach the server. Please try again."); } finally { setVBusy(false); }
  }
  const enter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); fn(); } };

  const deposit = hasJars ? 0 : (listing?.deposit_per_jar ?? catalog.deposit_per_jar) * jars;

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
      tower: f.get("tower") || null, flat: f.get("flat"), product_id: listing ? null : product, listing_id: listing?.id ?? null, jars_now: jars,
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
        <div className="mx-auto mb-4 w-20"><LivingJar level={1} capped={false} onReady={onPlacedJar} /></div>
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
        <Scooter />
        <p className="mt-4 text-sm text-muted">Save your order code — you'll need it with your phone number to track this order.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/track?code=${placed.code}`} className="btn btn-primary">Track this order</Link>
          <button className="btn border border-line" onClick={() => setPlaced(null)}>Place another</button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} onInput={recompute} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-8">
        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">1. What would you like?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(listings.length > 0 ? [] : catalog.products).map((x) => (
              <label key={x.id} className={`card cursor-pointer p-4 transition-colors ${product === x.id ? "!border-brand ring-2 ring-brand" : ""}`}>
                <input type="radio" name="product" className="sr-only" checked={product === x.id} onChange={() => setProduct(x.id)} />
                <span className="block text-xs font-medium text-brand">{x.tagline}</span>
                <span className="block font-semibold">{x.name}</span>
                <span className="block text-sm text-muted">₹{x.price}{x.jars > 1 ? ` · ₹${x.per_jar}/jar` : " per jar"}</span>
              </label>
            ))}
            {listings.map((l) => (
              <label key={l.id} className={`card cursor-pointer p-4 transition-colors ${product === `l:${l.id}` ? "!border-brand ring-2 ring-brand" : ""}`}>
                <input type="radio" name="product" className="sr-only" checked={product === `l:${l.id}`} onChange={() => setProduct(`l:${l.id}`)} />
                <span className="block text-xs font-medium text-brand">Partner · {l.partner}</span>
                <span className="block font-semibold">{l.name}</span>
                <span className="block text-sm text-muted">₹{l.price} per jar · {l.size_litres}L</span>
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-3 text-sm">
            <span>{perJar ? "Jars" : "Jars to deliver now"}</span>
            <select value={jars} onChange={(e) => setJars(Number(e.target.value))} className="field !w-24">
              {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={hasJars} onChange={(e) => { setHasJars(e.target.checked); setSaved(e.target.checked ? "login" : null); setPicked(-1); }} className="h-5 w-5 accent-[var(--brand)]" />
            I already have WaterMart jars to swap (no new deposit)
          </label>
          {hasJars && saved === "login" && (
            <div className="card grid gap-3 p-4 text-sm">
              <p className="font-semibold">Welcome back! Enter your number and we’ll fill in your address.</p>
              {!vSent ? (
                <div className="flex gap-2">
                  <input value={vPhone} onChange={(e) => onVPhone(e.target.value)} onKeyDown={enter(sendCode)} inputMode="tel" autoComplete="tel" placeholder="Your 10-digit mobile number" aria-label="Your mobile number" className="field" />
                  <button type="button" onClick={sendCode} disabled={vBusy || vPhone.length < 10} className="btn btn-primary shrink-0 !px-4">{vBusy ? "Sending…" : "Send code"}</button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <p className="text-muted">We sent a 6-digit code to {vPhone}.{vHint && <> Dev code: <b>{vHint}</b></>}</p>
                  <div className="flex gap-2">
                    <input value={vCode} onChange={(e) => setVCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={enter(verifyCode)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code" className="field" />
                    <button type="button" onClick={verifyCode} disabled={vBusy || vCode.length !== 6} className="btn btn-primary shrink-0 !px-4">{vBusy ? "Checking…" : "Verify"}</button>
                  </div>
                </div>
              )}
              {vErr && <p className="text-red-600" role="alert">{vErr}</p>}
              <p className="text-muted">No saved address, or don’t want to verify? Just fill the details below.</p>
            </div>
          )}
          {hasJars && saved && saved !== "login" && saved.addresses.length === 0 && (
            <p className="text-sm text-muted" role="status">Welcome back, {saved.phone}. You have no saved address yet. Fill it in below once and we’ll remember it for next time.</p>
          )}
          {hasJars && saved && saved !== "login" && saved.addresses.length > 0 && (
            <div className="grid gap-2 text-sm">
              <p className="font-semibold">Deliver to a saved address</p>
              {saved.addresses.map((a, i) => (
                <button type="button" key={i} onClick={() => chooseAddr(saved, i)} aria-pressed={picked === i}
                  className={`card p-3 text-left ${picked === i ? "!border-brand ring-2 ring-brand" : ""}`}>
                  {a.society}{a.tower ? `, ${a.tower}` : ""}, {a.flat} <span className="text-muted">· {a.pincode}</span>
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">2. Where should we deliver?</legend>
          <input key={`n${fillKey}`} defaultValue={fill.name} name="name" required minLength={2} autoComplete="name" placeholder="Your name" className="field" />
          <input key={`p${fillKey}`} defaultValue={fill.phone} name="phone" required inputMode="tel" autoComplete="tel" placeholder="WhatsApp number (10 digits)" className="field" />
          <div>
            <input value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(v); checkPin(v); }}
              required inputMode="numeric" pattern="\d{6}" placeholder="Pincode" aria-label="Pincode" className="field" />
            {wrongArea && <p className="mt-2 text-sm text-amber-600" role="status">{listing!.partner} delivers to {listing!.pincodes.join(", ")} only. Pick another product for this pincode.</p>}
            {zone && (
              <p className={`mt-2 text-sm ${zone.status === "launching" ? "text-green-600" : "text-amber-600"}`} role="status">
                {zone.status === "launching" ? `✓ We deliver in ${zone.zone}` : zone.status === "waitlist" ? `${zone.zone} isn't live yet — you can join the waitlist on the home page.` : "We don't deliver here yet."}
              </p>
            )}
          </div>
          <input key={`s${fillKey}`} defaultValue={fill.society} name="society" required placeholder="Society / building name" className="field" />
          <div className="grid grid-cols-2 gap-3">
            <input key={`t${fillKey}`} defaultValue={fill.tower} name="tower" placeholder="Tower / wing (optional)" className="field" />
            <input key={`f${fillKey}`} defaultValue={fill.flat} name="flat" required placeholder="Flat number" className="field" />
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
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="w-20"><LivingJar level={fillInfo.level} capped={false} onReady={onJar} /></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-soft" aria-hidden="true">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${Math.round((fillInfo.done / fillInfo.total) * 100)}%` }} />
            </div>
            <p className="text-sm font-semibold" aria-live="polite">
              {fillInfo.missing ? `${Math.round(fillInfo.level * 100)}% full · add ${fillInfo.missing}` : "Full! Ready to go"}
            </p>
          </div>
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <dt className="text-muted">{p.name}{perJar ? ` × ${jars}` : ""}</dt><dd>₹{amount}</dd>
            <dt className="text-muted">Refundable deposit</dt><dd>₹{deposit}</dd>
            <dt className="border-t border-line pt-2 font-semibold">Total</dt><dd className="border-t border-line pt-2 font-semibold">₹{amount + deposit}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">No payment now. We confirm on WhatsApp and send a UPI link. The deposit is refunded when you return the jars.</p>
          <button disabled={busy || wrongArea} className="btn btn-primary mt-5 w-full">{busy ? "Placing request…" : "Request delivery"}</button>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </aside>
    </form>
  );
}
