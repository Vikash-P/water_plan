import { cacheLife } from "next/cache";

export type Product = {
  id: string; name: string; jars: number; price: number; per_jar: number;
  validity_days: number | null; tagline: string; highlight: boolean;
};
export type Zone = { id: string; name: string; areas: string[]; pincodes: string[]; status: string };
export type Catalog = { deposit_per_jar: number; products: Product[]; zones: Zone[] };

// Server-only: absolute URL needed. Browser calls go through the /api rewrite.
const API = process.env.API_URL ?? "http://127.0.0.1:8000";

// Used if the API is unreachable (e.g. at build time) so the site never breaks.
const FALLBACK: Catalog = {
  deposit_per_jar: 350,
  products: [
    { id: "single", name: "Single jar", jars: 1, price: 65, per_jar: 65, validity_days: null, tagline: "Try us once", highlight: false },
    { id: "pass10", name: "10-Jar Pass", jars: 10, price: 600, per_jar: 60, validity_days: 60, tagline: "Most popular", highlight: true },
    { id: "pass20", name: "20-Jar Pass", jars: 20, price: 1140, per_jar: 57, validity_days: 90, tagline: "Best value", highlight: false },
  ],
  zones: [
    { id: "andheri-w", name: "Andheri West", areas: ["Lokhandwala", "Four Bungalows"], pincodes: ["400053", "400058"], status: "launching" },
    { id: "powai", name: "Powai", areas: ["Hiranandani", "Chandivali"], pincodes: ["400076"], status: "waitlist" },
    { id: "malad-w", name: "Malad West", areas: ["Mindspace belt"], pincodes: ["400064"], status: "waitlist" },
    { id: "thane", name: "Thane", areas: ["Ghodbunder Road"], pincodes: ["400607", "400615"], status: "waitlist" },
  ],
};

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("minutes");
  try {
    const res = await fetch(`${API}/api/catalog`);
    if (!res.ok) return FALLBACK;
    return await res.json();
  } catch {
    return FALLBACK;
  }
}
