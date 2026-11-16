"use client";
import { useState } from "react";
import { STATUS_LABEL, STEPS, errorMessage, type Order } from "@/lib/orders";

export default function TrackLookup({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function look(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setOrder(null);
    try {
      // phone goes in the query only to this same-origin API call, never in the page URL
      const res = await fetch(`/api/orders/${encodeURIComponent(code.trim())}?phone=${encodeURIComponent(phone)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setOrder(data);
      else setError(res.status === 404 ? "We couldn't find that order. Check the code and the phone number you used." : errorMessage(data));
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!order || !confirm("Cancel this order?")) return;
    const res = await fetch(`/api/orders/${order.code}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrder(data); else setError(errorMessage(data));
  }

  const step = order ? STEPS.indexOf(order.status) : -1;
  return (
    <div className="grid gap-8">
      <form onSubmit={look} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="Order code (e.g. JD7K2M9Q)" aria-label="Order code" className="field font-mono" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="Phone used on the order" aria-label="Phone" className="field" />
        <button disabled={busy} className="btn btn-primary">{busy ? "Looking…" : "Track"}</button>
      </form>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {order && (
        <div className="card p-6" role="status">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-lg font-semibold">{order.code}</h2>
            <span className="text-sm text-muted">{order.slot}</span>
          </div>
          {order.status === "cancelled" ? (
            <p className="mt-4 font-medium text-red-600">This order was cancelled.</p>
          ) : (
            <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <div className={`mx-auto mb-2 h-2 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
                  <span className={i === step ? "font-semibold" : "text-muted"}>{STATUS_LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-sm text-muted">{order.jars_now} × 20L jar ({order.product}) to {order.society}{order.tower ? `, ${order.tower}` : ""}, {order.flat}</p>
          <p className="mt-1 text-sm">Total ₹{order.total_due} <span className="text-muted">(incl. ₹{order.deposit} refundable deposit)</span></p>
          {(order.status === "requested" || order.status === "confirmed") && (
            <button onClick={cancel} className="btn mt-5 border border-line text-sm">Cancel order</button>
          )}
        </div>
      )}
    </div>
  );
}
