"use client";
import { useState } from "react";

type Kind = "waitlist" | "b2b" | "partner";

export default function LeadForm({ kind, cta, showBusiness = false, showVolume = false, showDeposit = false, notesLabel, variant = "default" }: {
  kind: Kind; cta: string; showBusiness?: boolean; showVolume?: boolean; showDeposit?: boolean; notesLabel?: string;
  /** "banner": white fields and a white raised button, for the blue waitlist banner. */
  variant?: "default" | "banner";
}) {
  const banner = variant === "banner";
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { kind };
    for (const [k, v] of f.entries()) if (String(v).trim() !== "") body[k] = String(v).trim();
    if (body.jars_per_month) body.jars_per_month = Number(body.jars_per_month);
    if (body.deposit) body.deposit = Number(body.deposit);
    setState("sending"); setError("");
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 422) {
        const data = await res.json();
        const first = data.detail?.[0];
        setError(first ? `${String(first.loc?.slice(-1))}: ${first.msg.replace("Value error, ", "")}` : "Please check your details.");
        setState("idle"); return;
      }
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setError("Something went wrong. Please try again."); setState("idle");
    }
  }

  if (state === "done") {
    return <p className={banner ? "rounded-2xl bg-white p-5 font-semibold text-brand-dark" : "card p-5 text-brand-dark"} role="status">Thank you! We&apos;ll reach out on WhatsApp shortly.</p>;
  }

  const input = banner ? "field !border-0 !rounded-[14px] !p-4 text-base" : "field";
  return (
    <form onSubmit={submit} className={banner ? "grid gap-2.5 sm:grid-cols-2" : "grid gap-3"}>
      <input name="name" required minLength={2} placeholder="Your name" className={input} />
      {showBusiness && <input name="business_name" placeholder="Business / plant name" className={input} />}
      <input name="phone" required inputMode="tel" placeholder="WhatsApp number (10 digits)" className={input} />
      <input name="email" type="email" placeholder="Email (optional)" className={input} />
      <input name="pincode" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="Pincode" className={input} />
      {showVolume && <input name="jars_per_month" type="number" min={1} placeholder="Jars needed per month" className={input} />}
      {showDeposit && (
        <label className="grid gap-1 text-sm text-muted">Refundable deposit you charge per jar (₹)
          <input name="deposit" type="number" min={0} max={5000} required inputMode="numeric" placeholder="e.g. 350" className={input} />
        </label>
      )}
      {notesLabel && <textarea name="notes" rows={3} placeholder={notesLabel} className={input} />}
      <button
        disabled={state === "sending"}
        className={banner ? "btn wm-press bg-white !rounded-[14px] !py-4 text-[#0047B3] shadow-[0_4px_0_#A9C6F0] sm:col-span-2" : "btn btn-primary"}
      >
        {state === "sending" ? "Sending…" : cta}
      </button>
      {error && <p className={banner ? "text-sm font-semibold text-white sm:col-span-2" : "text-sm text-red-700"} role="alert">{error}</p>}
    </form>
  );
}
