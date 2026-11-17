import type { Metadata } from "next";
import PartnerPortal from "@/components/PartnerPortal";

export const metadata: Metadata = { title: "Partner portal — JalDrop", robots: { index: false, follow: false } };

export default function PortalPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PartnerPortal />
    </div>
  );
}
