import test from "node:test";
import assert from "node:assert/strict";
import { cubicSeg, xAtY, streamTip } from "./stream.ts";

test("tip clamps to top", () => assert.equal(streamTip(0, 800, 900, 3000), 900));
test("tip clamps to bottom when reloaded far down", () => assert.equal(streamTip(5000, 800, 900, 3000), 3000));
test("tip follows 60% of viewport", () => assert.equal(streamTip(1000, 800, 900, 3000), 1480));
test("xAtY interpolates an S-curve endpoint", () => { const s = cubicSeg(100,0,300,400); assert.equal(Math.round(xAtY(s,400)), 300); assert.equal(Math.round(xAtY(s,0)), 100); });
