/* ============ 成长 · AI 身心灵分析：纯逻辑（tests/growth-review-lib.test.mjs 有单测） ============
   三种范围，和牧羊人的「AI 健康分析」同一个思路：
     whole  全盘：身体与健康的全部记录 + 近 30 天的日常（习惯、情绪、睡眠、陪伴…）和前 30 天对比 + 学习与培训 + 属灵；
     recent 最近：近 14 天和前 14 天比，加上最近 60 天的体检 / 就诊；
     watch  需要留意：只发挑出来的几项（变差的趋势、超出范围的化验、到期的体检、过敏病史、低落的情绪…），都没有就给保持的建议。
   发给 AI 的都是去掉姓名的摘要（年龄、性别、数字和医生原话）；目的不是吓人，而是给家长具体的下一步。 */

const AREAS = ["body", "mind", "spirit", "learning"];
/* 习惯与情绪 / 学习与培训的指标里，哪些变多不是好事、哪些变少要留意 */
const BAD_UP = new Set(["accident", "screen", "tantrum"]);
const GOOD = new Set(["sleep", "outdoor", "read", "companion", "mood", "dry", "potty", "class", "words", "meals"]);

/** 趋势变差的指标：变化 ≥ 30%，而且绝对值不是一两次的小波动 */
function worsened(metrics = []){
  const out = [];
  for (const m of metrics) {
    const c = m.cur, p = m.prev; if (c == null || p == null) continue;
    const d = c - p, rel = p ? Math.abs(d) / Math.abs(p) : (c ? 1 : 0), big = m.kind === "avg" ? Math.abs(d) >= (m.key === "mood" ? 0.7 : m.key === "sleep" ? 0.7 : 5) : Math.abs(d) >= (m.unit === "分钟" ? 30 : 3);
    if (rel < (m.kind === "avg" ? 0.1 : 0.3) || !big) continue;   // 平均值（睡眠、心情）变 10% 就算明显；次数、分钟要 30%
    if ((BAD_UP.has(m.key) && d > 0) || (GOOD.has(m.key) && d < 0)) out.push({ metric: m.label, unit: m.unit, now: round(c), before: round(p), change: d > 0 ? "up" : "down" });
  }
  return out;
}
const round = v => Math.round(v * 10) / 10;
const labFlag = x => (x.ref_high != null && +x.value > +x.ref_high ? "high" : x.ref_low != null && +x.value < +x.ref_low ? "low" : null);

/** 需要留意的几项（watch 用；也给面板上一行提示用） */
function watchItems(raw){
  const items = [], b = raw.body || {};
  for (const w of worsened(raw.metrics)) items.push({ area: "mind", kind: "trend", ...w });
  const latest = new Map(); for (const x of [...(b.labs || [])].sort((a, c) => String(a.date).localeCompare(String(c.date)))) latest.set(x.test, x);
  for (const x of latest.values()) { const f = labFlag(x); if (f) items.push({ area: "body", kind: "lab", test: x.test, value: x.value, unit: x.unit, date: x.date, flag: f }); }
  if (raw.age_months != null && raw.age_months >= 36) {
    const last = (b.visits || []).find(v => v.kind === "checkup");
    const months = last ? Math.floor((Date.parse(raw.today) - Date.parse(last.date)) / (30.44 * 864e5)) : null;
    if (months == null || months >= 12) items.push({ area: "body", kind: "checkup_due", last_checkup: last ? last.date : null, months_ago: months });
  }
  if (b.allergies) items.push({ area: "body", kind: "allergies", text: b.allergies });
  if (b.history) items.push({ area: "body", kind: "history", text: b.history });
  const low = (raw.low_moods || []).length; if (low) items.push({ area: "mind", kind: "low_mood", count: low, notes: raw.low_moods.slice(0, 5) });
  const L = raw.learning || {};
  if (L.lessons_cur === 0 && L.lessons_prev > 0) items.push({ area: "learning", kind: "lessons_stalled", before: L.lessons_prev });
  return items;
}

/** 按范围裁剪发给 AI 的内容 */
function reviewInput(mode, raw){
  const ctx = { mode, today: raw.today, age_months: raw.age_months, stage: raw.stage, sex: raw.sex || null, window_days: raw.days };
  const b = raw.body || {};
  if (mode === "watch") return { ...ctx, items: watchItems(raw), background: { history: b.history || "", allergies: b.allergies || "", long_term_meds: b.long_term_meds || "" } };
  const body = mode === "recent"
    ? { growth: (b.growth || []).slice(0, 3), visits: (b.visits || []).filter(v => Date.parse(raw.today) - Date.parse(v.date) <= 60 * 864e5), meds: b.meds || [], history: b.history || "", allergies: b.allergies || "" }
    : b;
  return { ...ctx, body, daily: { metrics: (raw.metrics || []).map(m => ({ metric: m.label, unit: m.unit, kind: m.kind, now: m.cur == null ? null : round(m.cur), before: m.prev == null ? null : round(m.prev) })), notes: String(raw.flows || "").slice(0, 3000), low_moods: (raw.low_moods || []).slice(0, 8) },
    learning: raw.learning || {}, spirit: raw.spirit || null };
}
const hasInput = (mode, input) => (mode === "watch" ? true : !!((input.body && ((input.body.growth || []).length || (input.body.visits || []).length)) || (input.daily.metrics || []).length || Object.keys(input.learning || {}).length));

const SCOPE = {
  whole: "Look at the whole picture: health history, the last 30 days of daily records against the 30 days before, learning and training, and faith life.",
  recent: "Focus on the last 14 days against the 14 days before, plus any checkup or visit in the last 60 days. What changed, and what to do in the next two weeks.",
  watch: "Focus only on the listed items that need attention. For each, say how much it matters for a child this age, what most likely helps, and when to see the pediatrician. If the list is empty, say so plainly and give a few things to keep doing."
};
const REVIEW_SYSTEM = (lang, mode, { spirit = true } = {}) => `You are a warm, practical family coach for a Christian homeschooling family (not a doctor). You look at one child's records as a whole person: body, mind (habits, emotions, sleep, relationships), ${spirit ? "spirit (family worship, prayer, memorizing Scripture), " : ""}and learning (lessons, reading, potty / night training, classes).
${SCOPE[mode] || SCOPE.whole}
The goal is NOT to alarm parents; it is to give concrete next steps: what to keep, what to strengthen, how to adjust routines, sleep, food, play, screen time, connection and discipline, and when to talk to the pediatrician.
Use age-appropriate norms (AAP / CDC milestones, AASM sleep hours for the age). Parenting advice should be grace-based: connection before correction, calm, consistent, never shaming.${spirit ? " Spiritual suggestions should be gentle and practical (short family worship, praying together, a verse to memorize), never guilt-driven." : ""}
Input: de-identified JSON. "now" vs "before" compare two equal windows. Labs use the lab's own reference ranges.
The parent may add "parent_notes" and attached photos or files (report cards, doctor notes, drawings, schedules): treat them as part of the picture, and say when a point comes from them.
Reply ONLY with JSON:
{"summary":"3-4 warm sentences: what is going well first, then the main thing to work on",
"priorities":[{"area":"${AREAS.filter(a => spirit || a !== "spirit").join("|")}","title":"short","why":"the data behind it","action":"one concrete thing this week"}],
"body":{"good":[],"improve":[],"actions":[]},
"mind":{"good":[],"improve":[],"actions":[]},
${spirit ? '"spirit":{"good":[],"improve":[],"actions":[]},\n' : ""}"learning":{"good":[],"improve":[],"actions":[]},
"doctor":["follow-up care or questions for the pediatrician, only if supported by the data"],
"parents":["up to 3 tips for how the parents can support the child"]}
Rules: 1-4 priorities, most impactful first. Each list at most 4 short items; [] when nothing useful. Never diagnose, never suggest medication or supplement doses, never talk about calories, dieting or weight loss for a child. Follow the doctor's advice in the data when it exists. If something needs prompt medical care, say so calmly in "doctor".
Write in ${lang === "en" ? "English" : "Simplified Chinese"}.`;

function parseReview(text, { spirit = true } = {}){
  let o; try { o = JSON.parse(String(text).replace(/^\s*```(json)?|```\s*$/g, "").trim()); } catch (e) { return null; }
  if (!o || typeof o !== "object") return null;
  const s = (v, n = 300) => String(v == null ? "" : v).trim().slice(0, n);
  const list = (v, n = 4) => (Array.isArray(v) ? v.map(x => (typeof x === "string" ? s(x) : "")).filter(Boolean).slice(0, n) : []);
  const area = x => ({ good: list(x && x.good), improve: list(x && x.improve), actions: list(x && x.actions) });
  const out = { summary: s(o.summary, 1200),
    priorities: (Array.isArray(o.priorities) ? o.priorities : []).filter(p => p && typeof p === "object" && (p.title || p.action)).slice(0, 4)
      .map(p => ({ area: AREAS.includes(p.area) && (spirit || p.area !== "spirit") ? p.area : "mind", title: s(p.title, 80), why: s(p.why), action: s(p.action) })),
    body: area(o.body), mind: area(o.mind), spirit: spirit ? area(o.spirit) : null, learning: area(o.learning), doctor: list(o.doctor), parents: list(o.parents, 3) };
  return out.summary || out.priorities.length ? out : null;
}

export { AREAS, worsened, watchItems, reviewInput, hasInput, REVIEW_SYSTEM, parseReview };
