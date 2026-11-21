export type OrderFillInput = {
  product: boolean; name: string; phone: string; pincode: string; society: string; flat: string; slot: boolean;
};

/** Mirrors backend/app/validators.py normalize_phone: strip spaces/hyphens, then a leading +91 / 91 / 0 only when 10 digits remain, then ^[6-9]\d{9}$. */
function phoneOk(raw: string): boolean {
  const v = raw.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(v);
}

/** How complete the order form is, as a jar level. Product and slot have defaults, so an empty form is 2/7. */
export function orderFill(f: OrderFillInput): { done: number; total: 7; level: number; missing: string | null } {
  const checks: [boolean, string | null][] = [
    [f.product, null],
    [f.slot, null],
    [f.name.trim().length >= 2, "your name"],
    [phoneOk(f.phone), "your WhatsApp number"],
    [/^\d{6}$/.test(f.pincode), "your pincode"],
    [f.society.trim().length > 0, "your building"],
    [f.flat.trim().length > 0, "your flat number"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  const gap = checks.find(([ok, label]) => !ok && label);
  return { done, total: 7, level: 0.1 + (done / 7) * 0.8, missing: gap ? gap[1] : null };
}
