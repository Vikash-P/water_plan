import { test } from "node:test";
import assert from "node:assert/strict";
import { celebrateFor } from "./celebrate.ts";

test("launching splashes", () => assert.equal(celebrateFor("launching"), "splash"));
test("waitlist, unserved, invalid shake", () => {
  for (const s of ["waitlist", "unserved", "invalid"] as const) assert.equal(celebrateFor(s), "shake");
});
test("error does nothing", () => assert.equal(celebrateFor("error"), "none"));
