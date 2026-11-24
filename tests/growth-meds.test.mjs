// node --test tests/growth-meds.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { medTrend } from "../js/growth-meds-lib.js";

const D = 86400e3, NOW = new Date(2026, 10, 24, 15, 0).getTime();
const m = (ts, name = "退烧药") => ({ type: "bmed", ts, name });

test("daily bars for 14 days, today last, counts land on the right day", () => {
  const r = medTrend([m(NOW - 1 * H()), m(NOW - 2 * H()), m(NOW - 3 * D), m(NOW - 20 * D)], 14, NOW);
  assert.equal(r.bars.length, 14); assert.equal(r.bars[13].n, 2); assert.equal(r.bars[10].n, 1);
  assert.equal(r.total, 3); assert.ok(Math.abs(r.perDay - 3 / 14) < 1e-9);
});

test("weekly bars for 90 days", () => {
  const r = medTrend([m(NOW - 1 * H()), m(NOW - 80 * D)], 90, NOW);
  assert.equal(r.bars.length, Math.ceil(90 / 7)); assert.equal(r.bars[r.bars.length - 1].n, 1); assert.equal(r.bars.reduce((s, b) => s + b.n, 0), 2);
});

test("byName: most doses first, then most recent; unnamed rows fall back to the category", () => {
  const r = medTrend([m(NOW - H()), m(NOW - 2 * H(), "益生菌"), m(NOW - 3 * H(), "益生菌"), { type: "bmed", ts: NOW - 4 * H(), cat: "维生素D" }], 14, NOW);
  assert.deepEqual(r.byName.map(x => [x.name, x.n]), [["益生菌", 2], ["退烧药", 1], ["维生素D", 1]]);
  assert.equal(r.byName[0].last, NOW - 2 * H());
});

test("empty input", () => { const r = medTrend([], 30, NOW); assert.equal(r.total, 0); assert.equal(r.bars.length, 30); assert.deepEqual(r.byName, []); });

function H(){ return 3600e3; }
