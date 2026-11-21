"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CssJar from "@/components/three-d/CssJar";
import { jarFill } from "@/lib/three-d/layout.ts";
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
  const placedRef = useRef<HTMLDivElement>(null);
  // On success, bring the confirmation card into view (on the home page the form sits mid-page).
  useEffect(() => { if (placed) placedRef.current?.scrollIntoView({ block: "start" }); }, [placed]);

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
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <div ref={placedRef} className="mx-auto flex max-w-xl scroll-mt-24 flex-col gap-1 rounded-3xl bg-white p-8" style={{ boxShadow: "0 6px 0 #D3E1EE, 0 18px 30px rgba(11,31,51,0.08)" }} role="status">
        <div className="mx-auto mb-4"><CssJar size="sm" level="90%" /></div>
        <p className="m-0 text-sm font-semibold text-brand">Request received</p>
        <h1 className="title m-0 mt-1">Thank you, {placed.name.split(" ")[0]}!</h1>
        <p className="lead mt-3">We&apos;ll confirm on WhatsApp shortly and send a UPI link for the amount below. Nothing is charged until you pay that link.</p>
        <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted">Order code</dt><dd className="font-mono font-semibold">{placed.code}</dd>
          <dt className="text-muted">Delivering</dt><dd>{placed.jars_now} × 20L jar · {placed.product}</dd>
          <dt className="text-muted">To</dt><dd>{placed.society}{placed.tower ? `, ${placed.tower}` : ""}, {placed.flat}</dd>
          <dt className="text-muted">When</dt><dd>{placed.slot}</dd>
          <dt className="text-muted">Amount</dt><dd>₹{placed.amount}</dd>
          <dt className="text-muted">Refundable deposit</dt><dd>₹{placed.deposit}</dd>
          <dt className="font-semibold">Total to pay</dt><dd className="display-font text-lg font-bold">₹{placed.total_due}</dd>
        </dl>
        <p className="mt-4 text-sm text-muted">Save your order code. You&apos;ll need it with your phone number to track this order.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/track?code=${placed.code}`} className="btn btn-primary wm-press no-underline">Track this order</Link>
          <button className="btn btn-outline wm-press" onClick={() => setPlaced(null)}>Place another</button>
        </div>
      </div>
    );
  }

  const card = "flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-[18px]";
  const pickCard = (on: boolean) =>
    `wm-press flex min-h-14 cursor-pointer rounded-2xl border-2 bg-white px-4 py-3 ${on ? "border-brand shadow-[0_4px_0_#0047B3]" : "border-line shadow-[0_3px_0_#DCE6F0]"}`;
  const unitPrice = listing ? listing.price : p.price;
  const summary = (
    <>
      <div className="flex justify-between gap-3 text-sm text-[#3A4F64]">
        <span>{p.name}{perJar ? ` × ${jars}` : ""} · ₹{amount}</span>
        <span>Deposit ₹{deposit}{deposit > 0 ? ", refunded on return" : ""}</span>
      </div>
      <button disabled={busy || wrongArea} className="btn btn-primary wm-press w-full !justify-between !rounded-2xl !px-5 !py-4 text-base" style={{ boxShadow: "0 5px 0 #003C99" }}>
        <span>{busy ? "Placing request…" : "Request delivery"}</span>
        <span className="display-font text-xl">₹{amount + deposit}</span>
      </button>
      <span className="text-center text-xs text-muted">No payment now. UPI link arrives on WhatsApp.</span>
      {error && <p className="m-0 text-sm text-red-700" role="alert">{error}</p>}
    </>
  );

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Selected product, with a jar whose water rises with the jar count */}
        <div className="flex items-center gap-4 rounded-3xl bg-white p-5" style={{ boxShadow: "0 6px 0 #D3E1EE, 0 18px 30px rgba(11,31,51,0.08)" }}>
          <CssJar size="sm" level={jarFill(jars)} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1D3A57]">{listing ? "Verified partner" : "WaterMart"}</span>
            <span className="display-font text-[22px] font-bold leading-tight">{p.name}</span>
            <span className="text-sm text-[#3A4F64]">₹{unitPrice}{perJar ? " per jar" : ""} · ISI sealed</span>
            {listing && <span className="self-start rounded-full bg-[#E5F0FF] px-2.5 py-1 text-xs font-semibold text-[#0047B3]">Verified plant</span>}
          </div>
        </div>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-base font-semibold">What would you like?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(listings.length > 0 ? [] : catalog.products).map((x) => (
              <label key={x.id} className={`${pickCard(product === x.id)} flex-col justify-center`}>
                <input type="radio" name="product" className="sr-only" checked={product === x.id} onChange={() => setProduct(x.id)} />
                <span className="block text-xs font-semibold text-[#0047B3]">{x.tagline}</span>
                <span className="block font-semibold">{x.name}</span>
                <span className="block text-sm text-muted">₹{x.price}{x.jars > 1 ? ` · ₹${x.per_jar}/jar` : " per jar"}</span>
              </label>
            ))}
            {listings.map((l) => (
              <label key={l.id} className={`${pickCard(product === `l:${l.id}`)} flex-col justify-center`}>
                <input type="radio" name="product" className="sr-only" checked={product === `l:${l.id}`} onChange={() => setProduct(`l:${l.id}`)} />
                <span className="block text-xs font-semibold text-[#0047B3]">Verified partner</span>
                <span className="block font-semibold">{l.name}</span>
                <span className="block text-sm text-muted">₹{l.price} per jar · {l.size_litres}L</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <span id="jars-label" className="text-base font-semibold">{perJar ? "How many jars?" : "Jars to deliver now"}</span>
            <div className="stepper" role="group" aria-labelledby="jars-label">
              <button type="button" className="wm-press" aria-label="Fewer jars" onClick={() => setJars((n) => Math.max(1, n - 1))}>−</button>
              <span aria-live="polite">{jars}</span>
              <button type="button" className="wm-press !bg-brand !text-white !shadow-[0_3px_0_#003C99]" aria-label="More jars" onClick={() => setJars((n) => Math.min(5, n + 1))}>+</button>
            </div>
          </div>
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border px-3 py-2.5 ${hasJars ? "border-brand bg-[#EEF5FF]" : "border-line bg-white"}`}>
            <input type="checkbox" checked={hasJars} onChange={(e) => { setHasJars(e.target.checked); setSaved(e.target.checked ? "login" : null); setPicked(-1); }} className="peer sr-only" />
            <span aria-hidden="true" className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-2 border-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand ${hasJars ? "bg-brand" : "bg-white"}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <span className="text-sm leading-snug">I already have WaterMart jars to swap <span className="text-muted">(no new deposit)</span></span>
          </label>
          {hasJars && saved === "login" && (
            <div className="grid gap-3 rounded-2xl bg-[#F2F7FB] p-4 text-sm">
              <p className="m-0 font-semibold">Welcome back! Enter your number and we’ll fill in your address.</p>
              {!vSent ? (
                <div className="flex gap-2">
                  <input value={vPhone} onChange={(e) => onVPhone(e.target.value)} onKeyDown={enter(sendCode)} inputMode="tel" autoComplete="tel" placeholder="Your 10-digit mobile number" aria-label="Your mobile number" className="field" />
                  <button type="button" onClick={sendCode} disabled={vBusy || vPhone.length < 10} className="btn btn-primary wm-press shrink-0 !px-4">{vBusy ? "Sending…" : "Send code"}</button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <p className="m-0 text-muted">We sent a 6-digit code to {vPhone}.{vHint && <> Dev code: <b>{vHint}</b></>}</p>
                  <div className="flex gap-2">
                    <input value={vCode} onChange={(e) => setVCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={enter(verifyCode)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code" className="field" />
                    <button type="button" onClick={verifyCode} disabled={vBusy || vCode.length !== 6} className="btn btn-primary wm-press shrink-0 !px-4">{vBusy ? "Checking…" : "Verify"}</button>
                  </div>
                </div>
              )}
              {vErr && <p className="m-0 text-red-700" role="alert">{vErr}</p>}
              <p className="m-0 text-muted">No saved address, or don’t want to verify? Just fill the details below.</p>
            </div>
          )}
          {hasJars && saved && saved !== "login" && saved.addresses.length === 0 && (
            <p className="m-0 text-sm text-muted" role="status">Welcome back, {saved.phone}. You have no saved address yet. Fill it in below once and we’ll remember it for next time.</p>
          )}
          {hasJars && saved && saved !== "login" && saved.addresses.length > 0 && (
            <div className="grid gap-2 text-sm">
              <p className="m-0 font-semibold">Deliver to a saved address</p>
              {saved.addresses.map((a, i) => (
                <button type="button" key={i} onClick={() => chooseAddr(saved, i)} aria-pressed={picked === i}
                  className={`${pickCard(picked === i)} !min-h-0 items-center text-left`}>
                  <span>{a.society}{a.tower ? `, ${a.tower}` : ""}, {a.flat} <span className="text-muted">· {a.pincode}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

        <fieldset className={`${card} m-0`}>
          <legend className="sr-only">Deliver to</legend>
          <span aria-hidden="true" className="text-base font-semibold">Deliver to</span>
          <input key={`n${fillKey}`} defaultValue={fill.name} name="name" required minLength={2} autoComplete="name" placeholder="Your name" aria-label="Your name" className="field" />
          <input key={`p${fillKey}`} defaultValue={fill.phone} name="phone" required inputMode="tel" autoComplete="tel" placeholder="WhatsApp number (10 digits)" aria-label="WhatsApp number" className="field" />
          <div>
            <input value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(v); checkPin(v); }}
              required inputMode="numeric" pattern="\d{6}" placeholder="Pincode" aria-label="Pincode" className="field" />
            {wrongArea && <p className="mt-2 text-sm text-[#B85300]" role="status">This product delivers to {listing!.pincodes.join(", ")} only. Pick another product for this pincode.</p>}
            {zone && (
              <p className={`mt-2 text-sm ${zone.status === "launching" ? "text-[#0B6A32]" : "text-[#B85300]"}`} role="status">
                {zone.status === "launching" ? `✓ We deliver in ${zone.zone}` : zone.status === "waitlist" ? `${zone.zone} isn't live yet — you can join the waitlist on the home page.` : "We don't deliver here yet."}
              </p>
            )}
          </div>
          <input key={`s${fillKey}`} defaultValue={fill.society} name="society" required placeholder="Society / building name" aria-label="Society or building name" className="field" />
          <div className="grid grid-cols-2 gap-3">
            <input key={`t${fillKey}`} defaultValue={fill.tower} name="tower" placeholder="Tower / wing (optional)" aria-label="Tower or wing" className="field" />
            <input key={`f${fillKey}`} defaultValue={fill.flat} name="flat" required placeholder="Flat number" aria-label="Flat number" className="field" />
          </div>
          <textarea name="notes" rows={2} maxLength={500} placeholder="Gate or lift instructions (optional)" aria-label="Gate or lift instructions" className="field" />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-base font-semibold">When?</legend>
          {SLOTS.map((s) => (
            <label key={s.id} className={`${pickCard(slot === s.id)} items-center justify-between gap-3`}>
              <input type="radio" name="slot" className="sr-only" checked={slot === s.id} onChange={() => setSlot(s.id)} />
              <span className="font-semibold">{s.label}</span>
              <span className="text-sm text-muted">{s.hint}</span>
            </label>
          ))}
        </fieldset>
      </div>

      {/* Phones: a summary sheet that sticks to the bottom while the form is on screen. Desktop: sticky side card. */}
      <div className="sticky bottom-0 z-[5] -mx-6 flex flex-col gap-2.5 rounded-t-3xl bg-white px-5 pb-5 pt-3.5 lg:hidden" style={{ boxShadow: "0 -10px 30px rgba(11,31,51,0.12)" }}>
        {summary}
      </div>
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-6" style={{ boxShadow: "0 6px 0 #D3E1EE, 0 18px 30px rgba(11,31,51,0.08)" }}>
          <h2 className="m-0 text-lg font-bold">Summary</h2>
          {summary}
        </div>
      </aside>
    </form>
  );
}
