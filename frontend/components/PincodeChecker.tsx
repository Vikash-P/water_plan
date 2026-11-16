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
    <div>
      <form onSubmit={check} className="flex gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Enter your pincode"
          aria-label="Pincode"
          className="field !rounded-full !px-5"
        />
        <button disabled={loading || pin.length !== 6} className="btn btn-accent">
          {loading ? "…" : "Check"}
        </button>
      </form>
      {result && (
        <p className="mt-3 text-sm" role="status">
          {messages[result.status](result.zone)}{" "}
          {result.status === "launching" && <Link href="/order" className="font-semibold text-brand underline">Order now →</Link>}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
