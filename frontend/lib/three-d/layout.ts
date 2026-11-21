/** Pricing cards: which card sits forward, and whether the side cards tilt (only for exactly three). */
export function pricingLayout(kinds: ("pass" | "jar")[]): { featured: number | null; tilted: boolean } {
  if (kinds.length === 0) return { featured: null, tilted: false };
  if (kinds.length === 3) return { featured: 1, tilted: true };
  const pass = kinds.indexOf("pass");
  return { featured: pass >= 0 ? pass : 0, tilted: false };
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
