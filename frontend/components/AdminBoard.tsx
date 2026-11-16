"use client";
import { useState } from "react";
import { STATUS_LABEL, errorMessage, type AdminOrder } from "@/lib/orders";

export default function AdminBoard() {
  const [key, setKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  async function load(k = key, f = filter) {
    setError("");
    const res = await fetch(`/api/admin/orders${f ? `?status=${f}` : ""}`, { headers: { "X-Admin-Key": k } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrders(data.orders); else { setOrders(null); setError(errorMessage(data)); }
  }

  async function move(o: AdminOrder, status: string) {
    const res = await fetch(`/api/admin/orders/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Admin-Key": key }, body: JSON.stringify({ status }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrders((prev) => prev && prev.map((x) => (x.id === o.id ? data : x))); else setError(errorMessage(data));
  }

  if (!orders) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="grid max-w-sm gap-3">
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key" aria-label="Admin key" className="field" required />
        <button className="btn btn-primary">Open orders</button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {["", "requested", "confirmed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setFilter(s); load(key, s); }} className={`btn !px-4 !py-1.5 text-sm border border-line ${filter === s ? "!bg-brand text-white" : ""}`}>{s ? STATUS_LABEL[s] : "All"}</button>
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
              <p className="text-muted">{o.jars_now} × {o.product} · ₹{o.amount} + ₹{o.deposit} deposit = <b className="text-foreground">₹{o.total_due}</b>{o.has_jars ? " · has jars" : ""}</p>
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
    </div>
  );
}
