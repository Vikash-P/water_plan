"use client";
import { useSearchParams } from "next/navigation";
import TrackLookup from "@/components/TrackLookup";

export default function TrackWithCode() {
  const code = useSearchParams().get("code") ?? "";
  return <TrackLookup initialCode={code.toUpperCase().slice(0, 12)} />;
}
