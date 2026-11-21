export type PincodeStatus = "launching" | "waitlist" | "unserved" | "invalid" | "error";

/** What the UI should do for a pincode check outcome. */
export function celebrateFor(status: PincodeStatus): "splash" | "shake" | "none" {
  if (status === "launching") return "splash";
  if (status === "waitlist" || status === "unserved" || status === "invalid") return "shake";
  return "none";
}
