// node --test tests/kidmed-lib.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { kidRules, cleanRules, medsOf, heroOn, recentMeds, weekCounts, nameChoices } from "../js/kidmed-lib.js";

const H = 3600e3, D = 24 * H, NOW = new Date(2026, 10, 24, 12, 0).getTime();
const m = (id, ts, o = {}) => ({ id, type: "bmed", ts, child: "c1", name: "退烧药", ...o });

test("medsOf filters by child (legacy rows belong to the legacy child) and sorts newest first", () => {
  const rows = [m("a", 1), m("b", 3), m("c", 2, { child: "c2" }), m("d", 5, { child: undefined }), { id: "x", type: "baby", ts: 9, child: "c1" }];
  assert.deepEqual(medsOf(rows, "c1", "c1").map(e => e.id), ["d", "b", "a"]);
  assert.deepEqual(medsOf(rows, "c2", "c1").map(e => e.id), ["c"]);
});

test("heroOn: explicit setting wins; otherwise on only with a dose in the last 14 days", () => {
  const recent = [m("a", NOW - 3 * D)], old = [m("b", NOW - 30 * D)];
  assert.equal(heroOn({}, "c1", recent, NOW), true);
  assert.equal(heroOn({}, "c1", old, NOW), false);
  assert.equal(heroOn({ kidMeds: { hero: { c1: false } } }, "c1", recent, NOW), false);
  assert.equal(heroOn({ kidMeds: { hero: { c1: true } } }, "c1", [], NOW), true);
});

test("recentMeds merges by name and attaches the next-dose info", () => {
  const rules = [{ name: "退烧药", hours: "6", timing: "饭后", mins: "30", note: "发烧超过 38.5℃ 再吃" }];
  const meds = [m("a", NOW - 2 * H), m("b", NOW - 8 * H), m("c", NOW - 1 * H, { name: "益生菌" })].sort((x, y) => y.ts - x.ts);
  const r = recentMeds(meds, rules, NOW);
  assert.deepEqual(r.map(x => x.name), ["益生菌", "退烧药"]);
  assert.equal(r[1].count24, 2);
  assert.equal(r[1].info.next, NOW - 2 * H + 6 * H);
  assert.equal(r[1].info.tm.timing, "饭后");
  assert.equal(r[0].info.next, null);
  assert.equal(recentMeds(meds, rules, NOW, 1).length, 1);
});

test("weekCounts counts the last seven days, today last", () => {
  const w = weekCounts([m("a", NOW - H), m("b", NOW - 2 * H), m("c", NOW - 3 * D), m("d", NOW - 9 * D)], NOW);
  assert.equal(w.length, 7); assert.equal(w[6], 2); assert.equal(w[3], 1); assert.equal(w.reduce((a, b) => a + b, 0), 3);
});

test("rules: clean empty rows; names from rules and history", () => {
  assert.deepEqual(cleanRules([{ name: " 布洛芬 ", hours: 6, timing: "饭后", mins: 30, note: " x " }, { name: "" }, null]), [{ name: "布洛芬", hours: "6", timing: "饭后", mins: "30", note: "x", hero: "" }]);
  assert.equal(cleanRules([{ name: "A", hero: "off" }])[0].hero, "off");
  assert.deepEqual(kidRules({}), []);
  assert.deepEqual(nameChoices([{ name: "A" }], [m("a", 1, { name: "B" }), m("b", 2, { name: "A" })]), ["A", "B"]);
});
