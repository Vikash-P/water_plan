"use client";
import { useState } from "react";

type Kind = "waitlist" | "b2b" | "partner";

export default function LeadForm({ kind, cta, showBusiness = false, showVolume = false, notesLabel }: {
  kind: Kind; cta: string; showBusiness?: boolean; showVolume?: boolean; notesLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { kind };
    for (const [k, v] of f.entries()) if (String(v).trim() !== "") body[k] = String(v).trim();
    if (body.jars_per_month) body.jars_per_month = Number(body.jars_per_month);
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
    return <p className="card p-5 text-brand-dark" role="status">Thank you! We'll reach out on WhatsApp shortly.</p>;
  }

  const input = "field";
  return (
    <form onSubmit={submit} className="grid gap-3">
      <input name="name" required minLength={2} placeholder="Your name" className={input} />
      {showBusiness && <input name="business_name" placeholder="Business / plant name" className={input} />}
      <input name="phone" required inputMode="tel" placeholder="WhatsApp number (10 digits)" className={input} />
      <input name="email" type="email" placeholder="Email (optional)" className={input} />
      <input name="pincode" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="Pincode" className={input} />
      {showVolume && <input name="jars_per_month" type="number" min={1} placeholder="Jars needed per month" className={input} />}
      {notesLabel && <textarea name="notes" rows={3} placeholder={notesLabel} className={input} />}
      <button disabled={state === "sending"} className="btn btn-primary">
        {state === "sending" ? "Sending…" : cta}
      </button>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </form>
  );
}
