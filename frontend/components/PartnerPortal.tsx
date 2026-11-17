"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Login } from "@/components/Account";
import { errorMessage } from "@/lib/orders";

type L = { id: number; name: string; brand: string | null; size_litres: number; price: number; pincodes: string[]; status: string; review_note: string | null };
type Me = { business_name: string; contact_name: string; phone: string; listings: L[] };
type State = { kind: "loading" } | { kind: "out" } | { kind: "denied"; msg: string } | { kind: "in"; me: Me };

const json = { "Content-Type": "application/json" };
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting for review", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { label: "Live on the site", cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
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
  if (state.kind === "out") return <Login onDone={reload} title="Partner login" intro="Log in with the mobile number JalDrop approved for your business. We send a 6-digit code." footer={false} />;
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

      <ListingForm key={editing?.id ?? "new"} initial={editing} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />

      <section>
        <h2 className="mb-3 text-xl font-bold">Your products</h2>
        {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
        {me.listings.length === 0 && <p className="text-muted">Nothing listed yet. Add your first product above. Our team reviews it, usually within a day.</p>}
        <ul className="grid gap-3">
          {me.listings.map((l) => (
            <li key={l.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{l.name} <span className="font-normal text-muted">· {l.size_litres}L{l.brand ? ` · ${l.brand}` : ""}</span></p>
                <p className="text-sm text-muted">₹{l.price} per jar · {l.pincodes.length ? `Delivers to ${l.pincodes.join(", ")}` : "All JalDrop areas"}</p>
                {l.review_note && <p className="mt-1 text-sm italic">Note from JalDrop: “{l.review_note}”</p>}
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
      name: String(f.get("name")).trim(), brand: String(f.get("brand")).trim() || null,
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
      <div><label htmlFor="pl-name" className="small text-muted">Product name</label><input id="pl-name" name="name" required minLength={2} defaultValue={initial?.name} placeholder="e.g. Aqua Pure 20L jar" className="field mt-1" /></div>
      <div><label htmlFor="pl-brand" className="small text-muted">Brand (optional)</label><input id="pl-brand" name="brand" defaultValue={initial?.brand ?? ""} className="field mt-1" /></div>
      <div><label htmlFor="pl-size" className="small text-muted">Jar size (litres)</label><input id="pl-size" name="size_litres" type="number" min={1} max={50} required defaultValue={initial?.size_litres ?? 20} className="field mt-1" /></div>
      <div><label htmlFor="pl-price" className="small text-muted">Your price per jar (₹)</label><input id="pl-price" name="price" type="number" min={1} max={5000} required defaultValue={initial?.price} placeholder="58" className="field mt-1" /></div>
      <div className="sm:col-span-2"><label htmlFor="pl-pins" className="small text-muted">Pincodes you deliver to (comma separated, blank = all JalDrop areas)</label><input id="pl-pins" name="pincodes" defaultValue={initial?.pincodes.join(", ")} placeholder="400053, 400058" className="field mt-1" /></div>
      {error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : initial ? "Save and resubmit" : "Submit for review"}</button>
        {initial && <button type="button" onClick={onCancel} className="btn border border-line">Cancel</button>}
      </div>
    </form>
  );
}
