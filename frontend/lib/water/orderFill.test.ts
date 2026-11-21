import { test } from "node:test";
import assert from "node:assert/strict";
import { orderFill } from "./orderFill.ts";

const empty = { product: true, name: "", phone: "", pincode: "", society: "", flat: "", slot: true };
const full = { ...empty, name: "Asha", phone: "98765 43210", pincode: "560001", society: "Palm Grove", flat: "A-101" };

test("empty form: product and slot defaults count", () => {
  const r = orderFill(empty);
  assert.equal(r.done, 2);
  assert.equal(r.total, 7);
  assert.equal(r.missing, "your name");
});
test("name needs 2+ chars", () => {
  assert.equal(orderFill({ ...empty, name: "A" }).done, 2);
  assert.equal(orderFill({ ...empty, name: "Al" }).done, 3);
});
test("phone: 9 digits no, 10 yes (spaces ignored)", () => {
  assert.equal(orderFill({ ...empty, name: "Al", phone: "987654321" }).done, 3);
  assert.equal(orderFill({ ...empty, name: "Al", phone: "98765 43210" }).done, 4);
});
test("phone: +91 / 91 prefix stripped only when it leaves exactly 10 digits", () => {
  assert.equal(orderFill({ ...empty, phone: "+91 98765 43210" }).done, 3);
  assert.equal(orderFill({ ...empty, phone: "919876543210" }).done, 3);
  assert.equal(orderFill({ ...empty, phone: "91987654321" }).done, 2); // 11 digits
});
test("pincode must be 6 digits", () => {
  assert.equal(orderFill({ ...empty, pincode: "56000" }).done, 2);
  assert.equal(orderFill({ ...empty, pincode: "560001" }).done, 3);
  assert.equal(orderFill({ ...empty, pincode: "56000a" }).done, 2);
});
test("missing label follows field order", () => {
  assert.equal(orderFill({ ...empty, name: "Al" }).missing, "your WhatsApp number");
  assert.equal(orderFill({ ...empty, name: "Al", phone: "9876543210" }).missing, "your pincode");
  assert.equal(orderFill({ ...empty, name: "Al", phone: "9876543210", pincode: "560001" }).missing, "your building");
  assert.equal(orderFill({ ...empty, name: "Al", phone: "9876543210", pincode: "560001", society: "X" }).missing, "your flat number");
});
test("complete form: level 0.9, nothing missing", () => {
  const r = orderFill(full);
  assert.equal(r.done, 7);
  assert.equal(r.level, 0.9);
  assert.equal(r.missing, null);
});
test("level starts at 0.1 + 2/7*0.8 for empty", () => {
  assert.ok(Math.abs(orderFill(empty).level - (0.1 + (2 / 7) * 0.8)) < 1e-9);
});
