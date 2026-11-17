import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = { title: "Water for business — WaterMart" };

const perks = [
  "Consolidated monthly GST invoice with input tax credit",
  "Guaranteed 2-hour delivery SLA",
  "Scheduled standing orders for clinics, salons, gyms and offices",
  "One account across multiple locations",
];

export default function B2B() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <h1 className="title">Reliable drinking water for your business</h1>
        <p className="lead mt-4">Stop chasing local vendors. One supplier, one invoice, delivered on time.</p>
        <ul className="mt-6 space-y-3">
          {perks.map((p) => <li key={p} className="flex gap-2"><span className="text-brand">✓</span>{p}</li>)}
        </ul>
      </div>
      <div className="card p-6">
        <h2 className="mb-4 text-xl font-semibold">Request a quote</h2>
        <LeadForm kind="b2b" cta="Request a quote" showBusiness showVolume notesLabel="Anything we should know? (locations, GST, timing)" />
      </div>
    </div>
  );
}
