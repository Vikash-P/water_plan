/**
 * Pricing cards: which card sits forward, whether the side cards tilt (only for exactly three), and whether the
 * forward card may wear the "Most popular" pill (only when it is a pass, so a single jar never claims it).
 */
export function pricingLayout(kinds: ("pass" | "jar")[]): { featured: number | null; tilted: boolean; popular: boolean } {
  if (kinds.length === 0) return { featured: null, tilted: false, popular: false };
  const tilted = kinds.length === 3;
  const pass = kinds.indexOf("pass");
  const featured = tilted ? 1 : pass >= 0 ? pass : 0;
  return { featured, tilted, popular: kinds[featured] === "pass" };
}

/** Area map blocks: live zones first (original order kept within each group), at most four. */
export function zoneBlocks(zones: { name: string; status: string }[]): { name: string; live: boolean }[] {
  const blocks = zones.map((z) => ({ name: z.name, live: z.status === "launching" }));
  return [...blocks.filter((b) => b.live), ...blocks.filter((b) => !b.live)].slice(0, 4);
}

/** Jar water level for a jar count of 1–5, as in the order mockup. */
export function jarFill(jars: number): string {
  return `${40 + Math.min(5, Math.max(1, jars)) * 10}%`;
}
