import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ — WaterMart" };

const faqs = [
  ["Is the water safe?", "We only work with plants holding valid FSSAI and BIS (ISI) certificates. Jars are sealed with a tamper-proof tag."],
  ["What is the jar deposit?", "A refundable ₹350 per jar. Request a pickup in the app or on WhatsApp and the deposit is refunded when the jar is returned."],
  ["Can I pay cash on delivery?", "No. Everything is prepaid by UPI, so there's nothing to pay at the door."],
  ["How fast is delivery?", "About 2 hours for ASAP orders, or choose a morning/evening slot for tomorrow."],
  ["What if I don't use all my pass jars?", "Passes are valid for 60 days (10-jar) or 90 days (20-jar). We remind you before they expire."],
  ["Is my phone number shared?", "No. Calls with the rider go through a masked number."],
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="title">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-line">
        {faqs.map(([q, a]) => (
          <details key={q} className="py-4">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
