import type { Metadata } from "next";
import OrderForm from "@/components/OrderForm";
import { getCatalog } from "@/lib/api";

export const metadata: Metadata = { title: "Order water — JalDrop", description: "Request 20L water jars delivered to your door in Mumbai." };

export default async function OrderPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="title mb-2">Order 20L water jars</h1>
      <p className="lead mb-8">Tell us what and where. We confirm on WhatsApp and deliver in about 2 hours.</p>
      <OrderForm catalog={catalog} />
    </div>
  );
}
