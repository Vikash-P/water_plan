import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import OrderForm from "@/components/OrderForm";
import { getCatalog, getListings } from "@/lib/api";

export const metadata: Metadata = { title: "Order water — WaterMart", description: "Request 20L water jars delivered to your door in Mumbai." };

// The heading renders instantly; only the form waits for API data, read per request (the build can't reach the API
// and would bake in an empty partner list).
export default function OrderPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-8 lg:py-12">
      <div className="mb-6">
        <h1 className="title m-0">Order water</h1>
        <p className="m-0 mt-1 text-sm text-muted">About 2 hours for ASAP orders · No signup needed</p>
      </div>
      <Suspense fallback={<div aria-hidden="true" className="h-[36rem] animate-pulse rounded-3xl bg-line/60 motion-reduce:animate-none" />}>
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
