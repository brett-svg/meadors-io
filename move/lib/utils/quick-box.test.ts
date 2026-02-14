import test from "node:test";
import assert from "node:assert/strict";
import { buildQuickBoxPayload } from "./quick-box";

test("buildQuickBoxPayload returns one-tap defaults", () => {
  const payload = buildQuickBoxPayload("Kitchen");
  assert.equal(payload.house, "Main House");
  assert.equal(payload.floor, "Main");
  assert.equal(payload.room, "Kitchen");
  assert.equal(payload.roomCode, "KIT");
  assert.equal(payload.priority, "medium");
  assert.equal(payload.status, "draft");
  assert.equal(payload.fragile, false);
});

test("buildQuickBoxPayload supports custom defaults", () => {
  const payload = buildQuickBoxPayload("Garage", {
    house: "Storage",
    floor: "Lower",
    fragile: true,
    priority: "high"
  });
  assert.equal(payload.house, "Storage");
  assert.equal(payload.floor, "Lower");
  assert.equal(payload.roomCode, "GAR");
  assert.equal(payload.priority, "high");
  assert.equal(payload.fragile, true);
});
