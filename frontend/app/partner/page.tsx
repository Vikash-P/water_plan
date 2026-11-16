import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = { title: "Become a delivery partner — JalDrop" };

export default function Partner() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <h1 className="title">Grow your RO plant with guaranteed weekly payouts</h1>
        <p className="lead mt-4">We bring the customers and the payments. You bottle and deliver.</p>
        <ul className="mt-6 space-y-3">
          <li>✓ Fixed per-jar rate, settled every Monday by UPI</li>
          <li>✓ Orders sent to your riders in a Hindi/Marathi app</li>
          <li>✓ No cash collection, no chasing customers</li>
          <li>✓ Requirement: valid FSSAI licence and BIS (ISI) certificate</li>
        </ul>
      </div>
      <div className="card p-6">
        <h2 className="mb-4 text-xl font-semibold">Apply to partner</h2>
        <LeadForm kind="partner" cta="Apply" showBusiness showVolume notesLabel="Plant location, daily capacity, FSSAI/BIS numbers" />
      </div>
    </div>
  );
}
