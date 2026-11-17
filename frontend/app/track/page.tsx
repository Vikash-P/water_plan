import type { Metadata } from "next";
import { Suspense } from "react";
import TrackWithCode from "./TrackWithCode";

export const metadata: Metadata = { title: "Track your order — WaterMart" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title mb-2">Track your order</h1>
      <p className="lead mb-8">Enter the order code and the phone number you ordered with.</p>
      <Suspense><TrackWithCode /></Suspense>
    </div>
  );
}
