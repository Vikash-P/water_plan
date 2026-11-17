import type { Metadata } from "next";
import Account from "@/components/Account";

export const metadata: Metadata = { title: "My account — WaterMart" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Account />
    </div>
  );
}
