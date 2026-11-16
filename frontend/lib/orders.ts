export type Order = {
  code: string; status: string; name: string; zone: string; society: string; tower: string | null; flat: string;
  product: string; jars_now: number; amount: number; deposit: number; total_due: number; slot: string;
  created_at: string; updated_at: string;
};
export type AdminOrder = Order & {
  id: number; phone: string; pincode: string; notes: string | null; has_jars: boolean; slot_id: string; next_statuses: string[];
};

export const SLOTS = [
  { id: "asap", label: "ASAP", hint: "Within ~2 hours" },
  { id: "tomorrow_morning", label: "Tomorrow morning", hint: "8 am – 12 pm" },
  { id: "tomorrow_evening", label: "Tomorrow evening", hint: "4 pm – 8 pm" },
];

export const STATUS_LABEL: Record<string, string> = {
  requested: "Request received",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STEPS = ["requested", "confirmed", "out_for_delivery", "delivered"];

/** Turn a FastAPI error body into one readable sentence. */
export function errorMessage(data: unknown, fallback = "Something went wrong. Please try again."): string {
  const detail = (data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]) {
    const f = detail[0] as { loc?: string[]; msg?: string };
    const field = f.loc?.[f.loc.length - 1];
    return `${field ? field + ": " : ""}${(f.msg ?? "").replace("Value error, ", "")}`;
  }
  return fallback;
}
