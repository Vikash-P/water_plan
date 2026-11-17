import type { Metadata } from "next";
import Jar from "@/components/Jar";
import OrderForm from "@/components/OrderForm";
import { getCatalog, getListings } from "@/lib/api";

export const metadata: Metadata = { title: "Order water — WaterMart", description: "Request 20L water jars delivered to your door in Mumbai." };

export default async function OrderPage() {
  const [catalog, listings] = await Promise.all([getCatalog(), getListings()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center gap-5">
        <Jar className="hidden w-16 shrink-0 sm:block" />
        <div>
          <h1 className="title mb-2">Order 20L water jars</h1>
          <p className="lead">Tell us what and where. We confirm on WhatsApp and deliver in about 2 hours.</p>
          <p className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">No signup needed. Order as a guest.</p>
        </div>
      </div>
      <OrderForm catalog={catalog} listings={listings} />
    </div>
  );
}
