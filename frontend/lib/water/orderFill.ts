export type OrderFillInput = {
  product: boolean; name: string; phone: string; pincode: string; society: string; flat: string; slot: boolean;
};

/** Ten digits; a leading 91 (as in +91) is stripped only when that leaves exactly 10. */
function phoneOk(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  return d.length === 10 || (d.length === 12 && d.startsWith("91"));
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
