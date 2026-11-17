import type { Metadata } from "next";
import AdminBoard from "@/components/AdminBoard";

export const metadata: Metadata = { title: "Orders (ops) — WaterMart", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="title mb-6">Orders</h1>
      <AdminBoard />
    </div>
  );
}
