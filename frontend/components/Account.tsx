"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SLOTS, STATUS_LABEL, STEPS, errorMessage, type Order } from "@/lib/orders";

type Me = {
  phone: string; name: string | null; orders: Order[]; active_order: Order | null;
  address: { society: string; tower: string | null; flat: string; pincode: string; zone: string } | null;
  usual: { jars: number; slot: string } | null;
};

const json = { "Content-Type": "application/json" };

export default function Account() {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "out" | "in">("loading");

  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then(async (res) => (res.ok ? ((await res.json()) as Me) : null))
      .catch(() => null)
      .then((data) => { if (alive) { setMe(data); setState(data ? "in" : "out"); } });
    return () => { alive = false; };
  }, [tick]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null); setState("out");
  }

  if (state === "loading") return <p className="text-muted" role="status">Loading…</p>;
  if (state === "out") return <Login onDone={load} />;
  return <Home me={me!} reload={load} logout={logout} />;
}

export function Login({ onDone, title = "Log in", intro = "See your orders and refill in one tap. We send a 6-digit code to your phone.", footer = true }: { onDone: () => void; title?: string; intro?: string; footer?: boolean }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/otp/request", { method: "POST", headers: json, body: JSON.stringify({ phone }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      setSent(true); setHint(data.dev_code ?? "");
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", { method: "POST", headers: json, body: JSON.stringify({ phone, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      onDone();
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="title">{title}</h1>
      <p className="lead mt-2">{intro}</p>
      {!sent ? (
        <form onSubmit={send} className="mt-6 grid gap-3">
          <label htmlFor="acc-phone" className="small text-muted">Mobile number</label>
          <input id="acc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="10-digit number" className="field" />
          <button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 grid gap-3">
          <label htmlFor="acc-code" className="small text-muted">Code sent to {phone}</label>
          <input id="acc-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" placeholder="6-digit code" className="field font-mono tracking-widest" autoFocus />
          {hint && <p className="small text-muted">Local dev code: <span className="font-mono">{hint}</span></p>}
          <button disabled={busy || code.length !== 6} className="btn btn-primary">{busy ? "Checking…" : "Log in"}</button>
          <button type="button" onClick={() => { setSent(false); setCode(""); setError(""); }} className="small text-muted underline">Use a different number</button>
          <button type="button" onClick={() => send()} disabled={busy} className="small text-muted underline">Send the code again</button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      {footer && <p className="small mt-6 text-muted">New here? <Link href="/order" className="text-brand underline">Place your first order</Link>. No account needed.</p>}
    </div>
  );
}

function Home({ me, reload, logout }: { me: Me; reload: () => void; logout: () => void }) {
  const [jars, setJars] = useState(me.usual?.jars ?? 2);
  const [slot, setSlot] = useState("asap");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = me.active_order;
  const step = active ? STEPS.indexOf(active.status) : -1;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  async function refill() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/me/refill", { method: "POST", headers: json, body: JSON.stringify({ jars, slot }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errorMessage(data)); return; }
      reload();
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="title">{greeting}{me.name ? `, ${me.name.split(" ")[0]}` : ""}</h1>
          <p className="small mt-1 text-muted">+91 {me.phone}</p>
        </div>
        <button onClick={logout} className="btn border border-line !px-4 !py-2 text-sm">Log out</button>
      </div>

      {active && (
        <section className="card p-6" aria-label="Order in progress">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-lg font-semibold">{active.code}</h2>
            <span className="chip">{STATUS_LABEL[active.status]}</span>
          </div>
          <ol className="mt-5 grid">
            {STEPS.map((s, i) => (
              <li key={s} className={`tl-item ${i < step ? "done" : i === step ? "now" : ""}`}>
                <span className={i === step ? "font-semibold" : i < step ? "" : "text-muted"}>{STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted">{active.jars_now} × 20L to {active.society}{active.tower ? `, ${active.tower}` : ""}, {active.flat} · {active.slot}</p>
          <p className="mt-1 text-sm">Total ₹{active.total_due} <span className="text-muted">(incl. ₹{active.deposit} refundable deposit)</span></p>
        </section>
      )}

      {!active && me.address && (
        <section className="card p-6" aria-label="Refill">
          <h2 className="text-xl font-semibold">Refill</h2>
          <p className="small mt-1 text-muted">To {me.address.society}{me.address.tower ? `, ${me.address.tower}` : ""}, {me.address.flat}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="stepper" role="group" aria-label="Jars">
              <button onClick={() => setJars((j) => Math.max(1, j - 1))} aria-label="Fewer jars">−</button>
              <span aria-live="polite">{jars}</span>
              <button onClick={() => setJars((j) => Math.min(5, j + 1))} aria-label="More jars">+</button>
            </div>
            <label htmlFor="acc-slot" className="sr-only">Delivery time</label>
            <select id="acc-slot" value={slot} onChange={(e) => setSlot(e.target.value)} className="field !w-auto">
              {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hint}</option>)}
            </select>
            <button onClick={refill} disabled={busy} className="btn btn-primary">{busy ? "Placing…" : `Refill ${jars} jar${jars > 1 ? "s" : ""}`}</button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        </section>
      )}

      {!me.address && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">No orders yet</h2>
          <p className="mt-1 text-muted">Place your first order and your address is saved for next time.</p>
          <Link href="/order" className="btn btn-primary mt-4">Order water</Link>
        </section>
      )}

      {me.orders.length > 0 && (
        <section aria-label="Past orders">
          <h2 className="mb-3 text-lg font-semibold">Orders</h2>
          <ul className="grid gap-2">
            {me.orders.map((o) => (
              <li key={o.code} className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span><span className="font-mono">{o.code}</span> · {o.jars_now} × 20L</span>
                <span className="text-muted">{o.created_at.slice(0, 10)} · ₹{o.total_due} · {STATUS_LABEL[o.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
