"use client";
import { useEffect, useState } from "react";
import AdminPartners from "@/components/AdminPartners";
import { STATUS_LABEL, errorMessage, type AdminOrder } from "@/lib/orders";

export default function AdminBoard() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"orders" | "partners">("orders");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load(f = filter) {
    setError("");
    const res = await fetch(`/api/admin/orders${f ? `?status=${f}` : ""}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrders(data.orders); else { setOrders(null); if (res.status !== 401) setError(errorMessage(data)); }
    return res.ok;
  }

  // Already logged in (cookie from an earlier visit)? Skip the form.
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      if (!alive) return;
      if (d) setOrders(d.orders);
      setChecking(false);
    });
    return () => { alive = false; };
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: String(f.get("user")).trim(), password: String(f.get("password")) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      await load();
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setOrders(null);
  }

  async function move(o: AdminOrder, status: string) {
    const res = await fetch(`/api/admin/orders/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrders((prev) => prev && prev.map((x) => (x.id === o.id ? data : x))); else setError(errorMessage(data));
  }

  if (checking) return <p className="text-muted" role="status">Loading…</p>;
  if (!orders) {
    return (
      <form onSubmit={login} className="card grid max-w-sm gap-3 p-6">
        <h2 className="text-xl font-bold">Admin login</h2>
        <label htmlFor="ad-user" className="small text-muted">User ID</label>
        <input id="ad-user" name="user" required autoComplete="username" className="field" />
        <label htmlFor="ad-pass" className="small text-muted">Password</label>
        <input id="ad-pass" name="password" type="password" required autoComplete="current-password" className="field" />
        <button disabled={busy} className="btn btn-primary">{busy ? "Please wait…" : "Log in"}</button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-2" role="tablist">
        {(["orders", "partners"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn !px-5 !py-2 text-sm border border-line ${tab === t ? "!bg-brand text-white" : ""}`}>{t === "orders" ? "Orders" : "Partners & listings"}</button>
        ))}
        <button onClick={logout} className="btn ml-auto border border-line !px-4 !py-2 text-sm">Log out</button>
      </div>
      {tab === "partners" ? <AdminPartners onExpired={() => setOrders(null)} /> : (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {["", "requested", "confirmed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setFilter(s); load(s); }} className={`btn !px-4 !py-1.5 text-sm border border-line ${filter === s ? "!bg-brand text-white" : ""}`}>{s ? STATUS_LABEL[s] : "All"}</button>
        ))}
        <button onClick={() => load()} className="btn !px-4 !py-1.5 text-sm">Refresh</button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
      {orders.length === 0 && <p className="text-muted">No orders.</p>}
      <div className="grid gap-3">
        {orders.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-start justify-between gap-4 p-4">
            <div className="text-sm">
              <p><span className="font-mono font-semibold">{o.code}</span> · <span className="font-medium">{STATUS_LABEL[o.status]}</span> · {o.slot}</p>
              <p className="mt-1">{o.name} · <a className="text-brand" href={`tel:${o.phone}`}>{o.phone}</a></p>
              <p className="text-muted">{o.society}{o.tower ? `, ${o.tower}` : ""}, {o.flat} · {o.zone} {o.pincode}</p>
              <p className="text-muted">{o.jars_now} × {o.product}{o.partner_name ? ` (${o.partner_name})` : ""} · ₹{o.amount} + ₹{o.deposit} deposit = <b className="text-foreground">₹{o.total_due}</b>{o.has_jars ? " · has jars" : ""}</p>
              {o.notes && <p className="mt-1 italic">“{o.notes}”</p>}
            </div>
            <div className="flex gap-2">
              {o.next_statuses.map((s) => (
                <button key={s} onClick={() => move(o, s)} className={`btn !px-4 !py-1.5 text-sm ${s === "cancelled" ? "border border-line" : "btn-primary"}`}>{STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
