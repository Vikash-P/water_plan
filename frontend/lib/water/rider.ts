const PROGRESS: Record<string, number> = {
  requested: 0,
  confirmed: 0.15,
  out_for_delivery: 0.6,
  delivered: 1,
};

/** How far along the route the rider is for an order status; null when there is no route to show. */
export function riderProgress(status: string): number | null {
  return Object.hasOwn(PROGRESS, status) ? PROGRESS[status] : null;
}
