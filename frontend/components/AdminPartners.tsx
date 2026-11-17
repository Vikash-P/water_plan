"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/orders";

type Lead = { id: number; name: string; phone: string; business_name: string | null; pincode: string | null; notes: string | null };
type Creds = { partner_id: string; setup_code: string; name: string };
type Partner = { id: number; phone: string; business_name: string; contact_name: string; status: string; password_set: boolean };
type Listing = { id: number; name: string; brand: string | null; size_litres: number; price: number; pincodes: string[]; status: string; partner: string };

export default function AdminPartners({ adminKey }: { adminKey: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<Creds | null>(null);
  const h = { "X-Admin-Key": adminKey, "Content-Type": "application/json" };
  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    const hd = { "X-Admin-Key": adminKey };
    Promise.all(["partner-leads", "partners", "listings"].map((p) => fetch(`/api/admin/${p}`, { headers: hd }).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then(([a, b, c]) => {
        if (!alive) return;
        if (a) setLeads(a.leads);
        if (b) setPartners(b.partners);
        if (c) setListings(c.listings);
      });
    return () => { alive = false; };
  }, [adminKey, tick]);

  async function approve(l: Lead) {
    setError("");
    const res = await fetch("/api/admin/partners", { method: "POST", headers: h, body: JSON.stringify({ phone: l.phone, business_name: l.business_name || l.name, contact_name: l.name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(errorMessage(data)); return; }
    setCreds({ partner_id: data.partner_id, setup_code: data.setup_code, name: l.business_name || l.name });
    load();
  }
  async function reset(p: Partner) {
    setError("");
    const res = await fetch(`/api/admin/partners/${p.id}/reset`, { method: "POST", headers: h });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(errorMessage(data)); return; }
    setCreds({ partner_id: data.partner_id, setup_code: data.setup_code, name: p.business_name });
    load();
  }
  async function review(l: Listing, status: string) {
    const note = status === "rejected" ? window.prompt("Reason for rejecting (shown to the partner)") ?? "" : "";
    const res = await fetch(`/api/admin/listings/${l.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ status, review_note: note }) });
    if (!res.ok) setError(errorMessage(await res.json().catch(() => ({})))); else load();
  }

  const have = new Set(partners.map((p) => p.phone));
  const pending = listings.filter((l) => l.status === "pending");
  return (
    <div className="grid gap-8">
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {creds && <CredsCard creds={creds} onClose={() => setCreds(null)} />}
      <section>
        <h2 className="mb-3 text-lg font-bold">Product listings to review ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">Nothing waiting.</p>}
        <div className="grid gap-3">
          {pending.map((l) => (
            <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div><p className="font-semibold">{l.name} · {l.size_litres}L · ₹{l.price}/jar</p><p className="text-muted">{l.partner}{l.brand ? ` · ${l.brand}` : ""} · {l.pincodes.join(", ") || "all areas"}</p></div>
              <div className="flex gap-2"><button onClick={() => review(l, "approved")} className="btn btn-primary !px-4 !py-1.5">Approve</button><button onClick={() => review(l, "rejected")} className="btn border border-line !px-4 !py-1.5">Reject</button></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Partner applications</h2>
        <div className="grid gap-3">
          {leads.map((l) => (
            <div key={l.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
              <div><p className="font-semibold">{l.business_name || l.name} · {l.name}</p><p className="text-muted">{l.phone}{l.pincode ? ` · ${l.pincode}` : ""}</p>{l.notes && <p className="italic">“{l.notes}”</p>}</div>
              {have.has(l.phone) ? <span className="chip">Partner</span> : <button onClick={() => approve(l)} className="btn btn-primary !px-4 !py-1.5">Make partner</button>}
            </div>
          ))}
          {leads.length === 0 && <p className="text-muted">No applications yet.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Partners ({partners.length})</h2>
        <div className="grid gap-2 text-sm">
          {partners.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
              <span>{p.business_name} · {p.phone}</span>
              <span className="flex items-center gap-2"><span className="chip">{p.password_set ? "Password set" : "Waiting for setup"}</span><button onClick={() => reset(p)} className="underline">New setup code</button></span>
            </div>
          ))}
          {partners.length === 0 && <p className="text-muted">No partners yet.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">All listings ({listings.length})</h2>
        <div className="grid gap-2 text-sm">
          {listings.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
              <span>{l.partner} · {l.name} · ₹{l.price}</span>
              <span className="flex items-center gap-2"><span className="chip">{l.status}</span>{l.status === "approved" && <button onClick={() => review(l, "rejected")} className="underline">Take down</button>}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CredsCard({ creds, onClose }: { creds: Creds; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Hi ${creds.name}, your WaterMart partner account is ready.\nPartner ID: ${creds.partner_id}\nSetup code: ${creds.setup_code}\nOpen ${typeof window !== "undefined" ? window.location.origin : ""}/partner/portal, tap "First time? Create your password", and choose your own password. The code works once and expires in 7 days.`;
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* user can select the text */ }
  }
  return (
    <div className="card border-brand p-5 ring-2 ring-brand" role="status">
      <h2 className="text-lg font-bold">Send these to {creds.name}</h2>
      <p className="mt-1 text-sm text-muted">The setup code is shown only now. Copy it and send it to the partner on WhatsApp.</p>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-brand-soft p-3 text-sm">{text}</pre>
      <div className="mt-3 flex gap-2"><button onClick={copy} className="btn btn-primary !px-4 !py-1.5 text-sm">{copied ? "Copied" : "Copy message"}</button><button onClick={onClose} className="btn border border-line !px-4 !py-1.5 text-sm">Done</button></div>
    </div>
  );
}
