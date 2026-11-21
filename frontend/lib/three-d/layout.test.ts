import { test } from "node:test";
import assert from "node:assert/strict";
import { pricingLayout, zoneBlocks, jarFill } from "./layout.ts";

test("pricing: empty", () => assert.deepEqual(pricingLayout([]), { featured: null, tilted: false, popular: false }));
test("pricing: one", () => assert.deepEqual(pricingLayout(["jar"]), { featured: 0, tilted: false, popular: false }));
test("pricing: two prefers pass", () => assert.deepEqual(pricingLayout(["jar", "pass"]), { featured: 1, tilted: false, popular: true }));
test("pricing: three tilts middle", () => assert.deepEqual(pricingLayout(["jar", "pass", "pass"]), { featured: 1, tilted: true, popular: true }));
test("pricing: five no pass", () => assert.deepEqual(pricingLayout(["jar", "jar", "jar", "jar", "jar"]), { featured: 0, tilted: false, popular: false }));
test("pricing: three jars tilt but claim nothing", () => assert.deepEqual(pricingLayout(["jar", "jar", "jar"]), { featured: 1, tilted: true, popular: false }));

test("zones: none", () => assert.deepEqual(zoneBlocks([]), []));
test("zones: live first, max 4", () => assert.deepEqual(
  zoneBlocks([{ name: "A", status: "waitlist" }, { name: "B", status: "launching" }, { name: "C", status: "waitlist" }, { name: "D", status: "waitlist" }, { name: "E", status: "launching" }]).map((z) => z.name),
  ["B", "E", "A", "C"]));
test("zones: no live", () => assert.ok(zoneBlocks([{ name: "A", status: "waitlist" }]).every((z) => !z.live)));
test("zones: marks live", () => assert.deepEqual(zoneBlocks([{ name: "A", status: "launching" }]), [{ name: "A", live: true }]));

test("jarFill", () => {
  assert.equal(jarFill(1), "50%");
  assert.equal(jarFill(5), "90%");
  assert.equal(jarFill(9), "90%");
  assert.equal(jarFill(0), "50%");
});
