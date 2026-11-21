"use client";
import Link from "next/link";
import { useState } from "react";

type Result = { valid: boolean; status: string; zone: string | null };

const messages: Record<string, (z: string | null) => string> = {
  launching: (z) => `Great news — we deliver in ${z}!`,
  waitlist: (z) => `${z} is coming soon. Join the waitlist and you'll be first in line.`,
  unserved: () => "We're not in your area yet — join the waitlist and we'll tell you when we are.",
  invalid: () => "Please enter a valid 6-digit pincode.",
};

export default function PincodeChecker() {
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`/api/serviceability/${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Couldn't check right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[540px]">
      <form
        onSubmit={check}
        className="flex flex-wrap gap-2.5 rounded-[18px] border border-[#D3E1EE] bg-white p-2"
        style={{ boxShadow: "0 2px 0 #D3E1EE, 0 18px 40px rgba(11,31,51,0.08)" }}
      >
        <label htmlFor="hero-pin" className="sr-only">Pincode</label>
        <input
          id="hero-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Enter your pincode"
          className="min-w-0 flex-[1_1_220px] bg-transparent px-3 py-3.5 text-base text-foreground outline-none"
        />
        <button disabled={loading || pin.length !== 6} className="btn btn-primary wm-press flex-none !px-[22px] !py-3.5">
          {loading ? "Checking…" : "Check delivery"}
        </button>
      </form>
      {result && (
        <p className="mt-3 text-sm" role="status">
          {messages[result.status](result.zone)}{" "}
          {result.status === "launching" && <Link href="/order" className="font-semibold text-brand underline">Order now →</Link>}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
