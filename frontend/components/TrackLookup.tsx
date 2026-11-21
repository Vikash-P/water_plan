"use client";
import { useState } from "react";
import TrackScene from "@/components/three-d/TrackScene";
import { riderProgress } from "@/lib/three-d/rider.ts";
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
  const progress = order ? riderProgress(order.status) : null;
  return (
    <div className="grid gap-8">
      <form onSubmit={look} className="grid gap-3 rounded-[20px] border border-line bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" style={{ boxShadow: "0 6px 0 #DCE6F0" }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="Order code (e.g. JD7K2M9Q)" aria-label="Order code" className="field font-mono" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="Phone used on the order" aria-label="Phone" className="field" />
        <button disabled={busy} className="btn btn-primary wm-press">{busy ? "Looking…" : "Track"}</button>
      </form>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {order && (
        <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: "0 6px 0 #DCE6F0, 0 18px 30px rgba(11,31,51,0.08)" }}>
          {progress !== null && <TrackScene progress={progress} />}
          <div
            className={`wm-anim relative flex flex-col gap-4 bg-white px-5 pb-5 pt-3 ${progress !== null ? "-mt-10 rounded-t-[28px]" : ""}`}
            style={progress !== null ? { boxShadow: "0 -12px 30px rgba(11,31,51,0.14)", animation: "wmSheet 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) both" } : undefined}
            role="status"
          >
            {progress !== null && <div aria-hidden="true" className="h-[5px] w-10 self-center rounded-[3px] bg-[#C6D5E4]" />}
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[13px] text-muted">{STATUS_LABEL[order.status] ?? order.status}</div>
                <div className="display-font text-[26px] font-bold leading-tight">{order.slot}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Order</div>
                <div className="font-mono font-semibold">{order.code}</div>
              </div>
            </div>
            {order.status === "cancelled" ? (
              <p className="m-0 font-semibold text-red-700">This order was cancelled.</p>
            ) : step >= 0 && (
              <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
                {STEPS.map((s, i) => {
                  const now = i === step && s !== "delivered";
                  const done = i < step || (i === step && s === "delivered");
                  return (
                    <li key={s} className="flex flex-col gap-1.5">
                      <div
                        className="h-2.5 rounded-md"
                        style={now
                          ? { background: "#FF8A2A", boxShadow: "0 3px 0 #C25A00", animation: "wmBreath 1.6s ease-in-out infinite" }
                          : done ? { background: "#0057D9", boxShadow: "0 3px 0 #003C99" } : { background: "#DCE6F0" }}
                      />
                      <span className={`text-xs ${now ? "font-semibold text-foreground" : done ? "text-[#1D3A57]" : "text-muted"}`}>
                        {STATUS_LABEL[s]}{now && <span className="sr-only"> (current step)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="rounded-2xl border border-line p-3.5 text-sm">
              <p className="m-0 text-muted">{order.jars_now} × 20L jar ({order.product}) to {order.society}{order.tower ? `, ${order.tower}` : ""}, {order.flat}</p>
              <p className="m-0 mt-1">Total <span className="display-font font-bold">₹{order.total_due}</span> <span className="text-muted">(incl. ₹{order.deposit} refundable deposit)</span></p>
            </div>
            {(order.status === "requested" || order.status === "confirmed") && (
              <button onClick={cancel} className="btn wm-press min-h-12 border-2 border-brand bg-white text-[#0047B3]">Cancel order</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
