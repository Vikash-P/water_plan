"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/orders";

type L = { id: number; name: string; size_litres: number; price: number; pincodes: string[]; status: string; review_note: string | null };
type Me = { business_name: string; contact_name: string; phone: string; listings: L[] };
type PO = { code: string; status: string; customer: string; product: string | null; jars: number; society: string; tower: string | null; flat: string; zone: string; pincode: string; slot: string; notes: string | null; next_status: string | null };
type State = { kind: "loading" } | { kind: "out" } | { kind: "denied"; msg: string } | { kind: "in"; me: Me };

const json = { "Content-Type": "application/json" };
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting for review", cls: "bg-amber-500/15 text-amber-700" },
  approved: { label: "Live on the site", cls: "bg-green-500/15 text-green-700" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-700" },
};

export default function PartnerPortal() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/partner/me")
      .then(async (res): Promise<State> => {
        if (res.ok) return { kind: "in", me: await res.json() };
        if (res.status === 401) return { kind: "out" };
        return { kind: "denied", msg: errorMessage(await res.json().catch(() => ({}))) };
      })
      .catch((): State => ({ kind: "out" }))
      .then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, [tick]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ kind: "out" });
  }

  if (state.kind === "loading") return <p className="text-muted" role="status">Loading…</p>;
  if (state.kind === "out") return <PartnerLogin onDone={reload} />;
  if (state.kind === "denied") {
    return (
      <div className="card mx-auto max-w-md p-6">
        <h1 className="title">Not a partner yet</h1>
        <p className="lead mt-2">{state.msg}</p>
        <div className="mt-6 flex gap-3"><Link href="/partner" className="btn btn-primary">Apply to partner</Link><button onClick={logout} className="btn border border-line">Log out</button></div>
      </div>
    );
  }
  return <Dashboard me={state.me} reload={reload} logout={logout} />;
}

function Dashboard({ me, reload, logout }: { me: Me; reload: () => void; logout: () => void }) {
  const [editing, setEditing] = useState<L | null>(null);
  const [error, setError] = useState("");

  async function remove(l: L) {
    const res = await fetch(`/api/partner/listings/${l.id}`, { method: "DELETE" });
    if (res.ok) reload(); else setError(errorMessage(await res.json().catch(() => ({}))));
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="title">{me.business_name}</h1>
          <p className="text-muted">Logged in as {me.contact_name} · {me.phone}</p>
        </div>
        <button onClick={logout} className="btn border border-line !px-4 !py-2 text-sm">Log out</button>
      </div>

      <Orders />

      <ListingForm key={editing?.id ?? "new"} initial={editing} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />

      <section>
        <h2 className="mb-3 text-xl font-bold">Your products</h2>
        {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
        {me.listings.length === 0 && <p className="text-muted">Nothing listed yet. Add your first product above. Our team reviews it, usually within a day.</p>}
        <ul className="grid gap-3">
          {me.listings.map((l) => (
            <li key={l.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{l.name} <span className="font-normal text-muted">· {l.size_litres}L jar</span></p>
                <p className="text-sm text-muted">₹{l.price} per jar · {l.pincodes.length ? `Delivers to ${l.pincodes.join(", ")}` : "All WaterMart areas"}</p>
                {l.review_note && <p className="mt-1 text-sm italic">Note from WaterMart: “{l.review_note}”</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[l.status]?.cls}`}>{STATUS[l.status]?.label ?? l.status}</span>
                <button onClick={() => setEditing(l)} className="btn border border-line !px-3 !py-1.5 text-sm">Edit</button>
                <button onClick={() => remove(l)} className="btn border border-line !px-3 !py-1.5 text-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Changing a product or its price sends it back for review.</p>
      </section>
    </div>
  );
}

function ListingForm({ initial, onSaved, onCancel }: { initial: L | null; onSaved: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name")).trim(),
      size_litres: Number(f.get("size_litres")), price: Number(f.get("price")), pincodes: String(f.get("pincodes")).trim(),
    };
    setBusy(true); setError("");
    try {
      const res = await fetch(initial ? `/api/partner/listings/${initial.id}` : "/api/partner/listings", { method: initial ? "PATCH" : "POST", headers: json, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      (e.target as HTMLFormElement).reset();
      onSaved();
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="text-xl font-bold sm:col-span-2">{initial ? "Edit product" : "List a product"}</h2>
      <div><label htmlFor="pl-name" className="small text-muted">Shop name</label><input id="pl-name" name="name" required minLength={2} defaultValue={initial?.name} placeholder="e.g. Rajput Water" className="field mt-1" /></div>
      <div><label htmlFor="pl-size" className="small text-muted">Jar size (litres)</label><input id="pl-size" name="size_litres" type="number" min={1} max={50} required defaultValue={initial?.size_litres ?? 20} className="field mt-1" /></div>
      <div><label htmlFor="pl-price" className="small text-muted">Your price per jar (₹)</label><input id="pl-price" name="price" type="number" min={1} max={5000} required defaultValue={initial?.price} placeholder="58" className="field mt-1" /></div>
      <div className="sm:col-span-2"><label htmlFor="pl-pins" className="small text-muted">Pincodes you deliver to (comma separated, blank = all WaterMart areas)</label><input id="pl-pins" name="pincodes" defaultValue={initial?.pincodes.join(", ")} placeholder="400053, 400058" className="field mt-1" /></div>
      {error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : initial ? "Save and resubmit" : "Submit for review"}</button>
        {initial && <button type="button" onClick={onCancel} className="btn border border-line">Cancel</button>}
      </div>
    </form>
  );
}

const MOVE: Record<string, string> = { out_for_delivery: "Out for delivery", delivered: "Mark delivered" };
const OSTATUS: Record<string, string> = { requested: "Awaiting WaterMart confirmation", confirmed: "Ready to deliver", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" };

function Orders() {
  const [orders, setOrders] = useState<PO[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/partner/orders").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => { if (alive && d) setOrders(d.orders); });
    return () => { alive = false; };
  }, [tick]);

  async function move(o: PO) {
    setError("");
    const res = await fetch(`/api/partner/orders/${o.code}`, { method: "PATCH", headers: json, body: JSON.stringify({ status: o.next_status }) });
    if (res.ok) setTick((t) => t + 1); else setError(errorMessage(await res.json().catch(() => ({}))));
  }

  if (!orders || orders.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold">Orders for you</h2>
      {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
      <ul className="grid gap-3">
        {orders.map((o) => (
          <li key={o.code} className="card flex flex-wrap items-start justify-between gap-4 p-4 text-sm">
            <div className="min-w-0">
              <p><span className="font-mono font-semibold">{o.code}</span> · {OSTATUS[o.status] ?? o.status}</p>
              <p className="mt-1">{o.jars} × {o.product} for {o.customer}</p>
              <p className="text-muted">{o.society}{o.tower ? `, ${o.tower}` : ""}, {o.flat} · {o.zone} {o.pincode} · {o.slot}</p>
              {o.notes && <p className="italic">“{o.notes}”</p>}
            </div>
            {o.next_status && <button onClick={() => move(o)} className="btn btn-primary !px-4 !py-1.5">{MOVE[o.next_status]}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PartnerLogin({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    const password = String(f.get("password"));
    if (mode === "setup" && password !== f.get("confirm")) { setError("The two passwords don't match."); return; }
    const body = { phone, password };
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/partner/auth/${mode}`, { method: "POST", headers: json, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      onDone();
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="title">{mode === "login" ? "Partner login" : "Create your password"}</h1>
      <p className="lead mt-2">
        {mode === "login" ? "Your partner ID is the mobile number WaterMart approved for your business." : "Enter your partner ID and choose a password. You only do this once."}
      </p>
      <form key={mode} onSubmit={submit} className="mt-6 grid gap-3">
        <label htmlFor="pp-phone" className="small text-muted">Partner ID (mobile number)</label>
        <input id="pp-phone" name="phone" required inputMode="tel" autoComplete="username" placeholder="10-digit number" className="field" />
        <label htmlFor="pp-pass" className="small text-muted">{mode === "login" ? "Password" : "New password (at least 8 characters)"}</label>
        <input id="pp-pass" name="password" type="password" required minLength={mode === "setup" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className="field" />
        {mode === "setup" && (
          <>
            <label htmlFor="pp-confirm" className="small text-muted">Confirm password</label>
            <input id="pp-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" />
          </>
        )}
        <button disabled={busy} className="btn btn-primary">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Save password and log in"}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      <button type="button" onClick={() => { setMode(mode === "login" ? "setup" : "login"); setError(""); }} className="small mt-5 text-brand underline">
        {mode === "login" ? "First time? Create your password" : "Already have a password? Log in"}
      </button>
      {mode === "login" && <p className="small mt-3 text-muted">Forgot your password? Ask WaterMart to reset it, then use “First time? Create your password”.</p>}
    </div>
  );
}
