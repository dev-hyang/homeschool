import test from "node:test";
import assert from "node:assert/strict";
import { REVIEW_SYSTEM, hasInput, parseReview, reviewInput, watchItems, worsened } from "../js/growth-review-lib.js";

const raw = {
  today: "2026-11-11", age_months: 52, stage: "prek", sex: "f", days: 14,
  metrics: [
    { key: "sleep", label: "夜间睡眠", unit: "小时", kind: "avg", cur: 9.1, prev: 10.4 },
    { key: "screen", label: "屏幕", unit: "分钟", kind: "sum", cur: 420, prev: 180 },
    { key: "tantrum", label: "发脾气 / 哭闹", unit: "次", kind: "sum", cur: 3, prev: 2 },     // small change: not flagged
    { key: "read", label: "阅读", unit: "分钟", kind: "sum", cur: 200, prev: 120 }           // better: not flagged
  ],
  flows: "睡前流程 9 晚…", low_moods: ["和朋友吵架"],
  body: { growth: [{ date: "2026-10-01", weight_kg: 17, height_cm: 104 }], visits: [{ date: "2025-09-01", kind: "checkup", notes: "ok" }],
    labs: [{ date: "2025-09-01", test: "Hemoglobin", value: 10.2, unit: "g/dL", ref_low: 11, ref_high: 14.5 }], allergies: "花生", history: "" },
  learning: { lessons_cur: 0, lessons_prev: 6 }, spirit: { devotion_days: 10 }
};

test("worsened picks real declines only", () => {
  assert.deepEqual(worsened(raw.metrics).map(x => x.metric), ["夜间睡眠", "屏幕"]);
});

test("watch items: trends, flagged lab, overdue checkup, allergies, low mood, stalled lessons", () => {
  const kinds = watchItems(raw).map(x => x.kind);
  for (const k of ["trend", "lab", "checkup_due", "allergies", "low_mood", "lessons_stalled"]) assert.ok(kinds.includes(k), k);
  const young = watchItems({ ...raw, age_months: 30 }).map(x => x.kind);
  assert.ok(!young.includes("checkup_due"));   // under 3: Little Moon's own checkup schedule covers it
});

test("inputs per scope", () => {
  const w = reviewInput("watch", raw); assert.ok(w.items.length >= 6); assert.equal(w.body, undefined);
  const r = reviewInput("recent", raw); assert.equal(r.body.visits.length, 0);   // the 2025 checkup is outside 60 days
  const a = reviewInput("whole", raw); assert.equal(a.body.labs.length, 1); assert.equal(a.daily.metrics[0].now, 9.1);
  assert.ok(hasInput("whole", a) && hasInput("watch", w));
  assert.ok(!hasInput("recent", reviewInput("recent", { today: "2026-11-11", metrics: [], body: {}, learning: {} })));
});

test("prompt and parsing respect the faith switch", () => {
  assert.match(REVIEW_SYSTEM("zh", "whole"), /"spirit":/);
  assert.doesNotMatch(REVIEW_SYSTEM("en", "watch", { spirit: false }), /spirit|Scripture/);
  const txt = JSON.stringify({ summary: "好", priorities: [{ area: "spirit", title: "敬拜", action: "每晚 5 分钟" }, { area: "x", title: "睡眠" }],
    body: { good: ["长得好"], improve: [], actions: ["多喝水", 3] }, mind: {}, spirit: { good: ["背了 3 节"] }, learning: { actions: ["每天读 20 分钟"] }, doctor: ["复查血红蛋白"], parents: ["1", "2", "3", "4"] });
  const o = parseReview(txt); assert.equal(o.priorities[1].area, "mind"); assert.deepEqual(o.body.actions, ["多喝水"]); assert.equal(o.parents.length, 3); assert.deepEqual(o.spirit.good, ["背了 3 节"]);
  const n = parseReview(txt, { spirit: false }); assert.equal(n.spirit, null); assert.equal(n.priorities[0].area, "mind");
  assert.equal(parseReview("nope"), null); assert.equal(parseReview("{}"), null);
});
