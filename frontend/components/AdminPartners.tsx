"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/orders";

type Lead = { id: number; name: string; phone: string; business_name: string | null; pincode: string | null; notes: string | null };
type Partner = { id: number; phone: string; business_name: string; contact_name: string; status: string };
type Listing = { id: number; name: string; brand: string | null; size_litres: number; price: number; pincodes: string[]; status: string; partner: string };

export default function AdminPartners({ adminKey }: { adminKey: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
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
    if (!res.ok) setError(errorMessage(await res.json().catch(() => ({})))); else load();
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
