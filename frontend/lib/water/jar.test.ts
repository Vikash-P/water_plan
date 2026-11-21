import test from "node:test";
import assert from "node:assert/strict";
import { stepJar, surfaceY, waterPath } from "./jar.ts";

test("level eases toward target", () => { const s = stepJar({level:0,target:1,phi:0,v:0}, 0, 0.1); assert.ok(s.level > 0 && s.level < 1); });
test("full jar surface near y=80 when still", () => assert.ok(Math.abs(surfaceY({level:1,target:1,phi:0,v:0}, 80, 0) - 80) < 3));
test("water stays level in world: tilting jar +9deg drives phi negative", () => { let s={level:.5,target:.5,phi:0,v:0}; for(let i=0;i<300;i++) s=stepJar(s,9,1/60); assert.ok(Math.abs(s.phi + 9*Math.PI/180) < 0.01); });
test("waterPath closes the fill", () => assert.match(waterPath({level:.5,target:.5,phi:0,v:0},0).fill, /L170 270L-10 270Z$/));
