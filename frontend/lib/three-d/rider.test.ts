import { test } from "node:test";
import assert from "node:assert/strict";
import { riderProgress } from "./rider.ts";
import { STEPS } from "../orders.ts";

test("every step maps to its progress", () => {
  const want = [0, 0.15, 0.6, 1];
  assert.equal(STEPS.length, want.length);
  STEPS.forEach((s, i) => assert.equal(riderProgress(s), want[i]));
});
test("cancelled and unknown are null", () => {
  assert.equal(riderProgress("cancelled"), null);
  assert.equal(riderProgress("bogus"), null);
  assert.equal(riderProgress(""), null);
});
