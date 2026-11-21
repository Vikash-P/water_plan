import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Jar from "@/components/Jar";
import OrderForm from "@/components/OrderForm";
import { getCatalog, getListings } from "@/lib/api";

export const metadata: Metadata = { title: "Order water — WaterMart", description: "Request 20L water jars delivered to your door in Mumbai." };

// The heading renders instantly; only the form waits for API data, read per request (the build can't reach the API
// and would bake in an empty partner list).
export default function OrderPage() {
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
      <Suspense fallback={<div aria-hidden="true" className="h-[36rem] animate-pulse rounded-2xl bg-line/60 motion-reduce:animate-none" />}>
        <OrderContent />
      </Suspense>
    </div>
  );
}

async function OrderContent() {
  await connection();
  const [catalog, listings] = await Promise.all([getCatalog(), getListings()]);
  return <OrderForm catalog={catalog} listings={listings} />;
}
