import { SB } from "./core/auth.js";
import { S } from "./core/state.js";
import { D, dayKey, newId, toast } from "./core/util.js";
import { PLANS, planById } from "./data/plans.js";
import { COURSE_TEMPLATES, GOAL_TEMPLATES, ROUTINE_TEMPLATES, SEED_RESOURCES, SEED_SCRIPTURES } from "./data/seeds.js";

/* ============ 家庭学堂数据层（在线优先） ============
   进入家庭时一次性读取；每次写入直接到 Supabase，成功后更新内存并重绘。
   hs_* 表由 baby-log 仓库 supabase/migrations/003 建立；表不存在时 S.hs.error = "missing"，页面会提示。 */
S.hs = { loaded: false, error: null, day: null, settings: {}, scriptures: [], progress: [], routines: [], tasks: [], devotion: null,
  phase2: false, units: [], lessons: [], goals: [], resources: [], ranges: {} };

const fid = () => S.family.id;
const today = () => dayKey(Date.now());
const missingTable = err => err && (err.code === "42P01" || err.code === "PGRST205" || /schema cache|does not exist/i.test(err.message || ""));
async function run(p, msg){ const { data, error } = await p; if (error) { console.error(error); toast(msg || "云端保存失败，请稍后再试"); throw error; } return data; }
const put = (list, row, key = "id") => { const i = list.findIndex(x => x[key] === row[key]); if (i >= 0) list[i] = row; else list.push(row); return row; };

async function loadAll(){
  const f = fid(), day = today(), from = dayKey(Date.now() - 7 * D);
  const rs = await Promise.all([
    SB.client.from("hs_family").select("settings").eq("family_id", f).maybeSingle(),
    SB.client.from("hs_scriptures").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_scripture_progress").select("*").eq("family_id", f),
    SB.client.from("hs_routines").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_tasks").select("*").eq("family_id", f).gte("date", from).order("date"),
    SB.client.from("hs_devotions").select("*").eq("family_id", f).eq("date", day).maybeSingle()
  ]);
  const bad = rs.find(r => r.error);
  if (bad) { console.error(bad.error); S.hs.loaded = false; S.hs.error = missingTable(bad.error) ? "missing" : "error"; return; }
  const [fam, scr, prog, rout, tasks, devo] = rs.map(r => r.data);
  S.hs = { ...S.hs, loaded: true, error: null, day, settings: (fam && fam.settings) || {}, scriptures: scr || [], progress: prog || [], routines: rout || [], tasks: tasks || [], devotion: devo || null, ranges: {} };
  // 阶段 2–4 的表（迁移 004）；还没建时这些页面单独提示，不影响今天页
  const rs2 = await Promise.all([
    SB.client.from("hs_units").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_lessons").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_goals").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_resources").select("*").eq("family_id", f).order("sort")
  ]);
  if (rs2.some(r => r.error)) { S.hs.phase2 = false; }
  else { const [u, l, g, r] = rs2.map(x => x.data || []); S.hs = { ...S.hs, phase2: true, units: u, lessons: l, goals: g, resources: r }; }
  await ensureTodayTasks();
}
// day rolled over while the page stayed open → reload today's rows
async function refreshIfNewDay(){ if (S.hs.loaded && S.hs.day !== today()) await loadAll(); }

/* ---- 家庭级设置 ---- */
async function saveSettings(patch){
  S.hs.settings = { ...S.hs.settings, ...patch };
  await run(SB.client.from("hs_family").upsert({ family_id: fid(), settings: S.hs.settings }));
}

/* ---- 读经计划 ---- */
function planState(){ const s = S.hs.settings.plan || {}; return { id: s.id || "story", progress: s.progress || {} }; }
function currentPlan(){
  const { id } = planState();
  if (id === "custom") { const c = S.hs.settings.customPlan; if (c && c.items && c.items.length) return { id: "custom", name: c.name || "自定义计划", desc: `${c.items.length} 段`, items: c.items }; }
  return planById(id) || PLANS[0];
}
function todayPassage(){
  const p = currentPlan(); if (!p.items.length) return null;
  const i = (planState().progress[p.id] || 0) % p.items.length;
  return { ref: p.items[i][0], note: p.items[i][1] || "", index: i, total: p.items.length, plan: p };
}
async function bumpPlan(delta){ const { id, progress } = planState(), p = currentPlan(); await saveSettings({ plan: { id, progress: { ...progress, [p.id]: Math.max(0, (progress[p.id] || 0) + delta) } } }); }
async function choosePlan(id){ await saveSettings({ plan: { id, progress: planState().progress } }); }
async function importPlan(name, items){ await saveSettings({ customPlan: { name: name || "自定义计划", items }, plan: { id: "custom", progress: { ...planState().progress, custom: 0 } } }); }

/* ---- 每日敬拜 ---- */
function devotionDraft(){
  if (S.hs.devotion) return S.hs.devotion;
  const tp = todayPassage();
  return { family_id: fid(), date: today(), passage: tp ? tp.ref : "", plan_id: currentPlan().id, prayer: "", note: "", done: false, children: S.children.map(c => c.id) };
}
async function saveDevotion(patch){
  const d = { ...devotionDraft(), ...patch }; delete d.updated_at; delete d.updated_by;
  const wasDone = !!(S.hs.devotion && S.hs.devotion.done);
  S.hs.devotion = await run(SB.client.from("hs_devotions").upsert(d).select().single());
  if (S.hs.devotion.done && !wasDone) await bumpPlan(1);      // 读经计划前进一格
  if (!S.hs.devotion.done && wasDone) await bumpPlan(-1);     // 撤销完成则退回
}

/* ---- 经文卡 ---- */
async function upsertScripture(s){
  const row = { family_id: fid(), id: s.id || newId(), kind: s.kind || "verse", ref: s.ref || "", text_zh: s.text_zh || "", text_en: s.text_en || "", source: s.source || "", sort: s.sort ?? S.hs.scriptures.length };
  return put(S.hs.scriptures, await run(SB.client.from("hs_scriptures").upsert(row).select().single()));
}
async function deleteScripture(id){
  await run(SB.client.from("hs_scriptures").delete().eq("family_id", fid()).eq("id", id));
  S.hs.scriptures = S.hs.scriptures.filter(x => x.id !== id); S.hs.progress = S.hs.progress.filter(p => p.scripture_id !== id);
  if (S.hs.settings.weekVerse === id) await saveSettings({ weekVerse: null });
}
async function importSeedScriptures(){
  const have = new Set(S.hs.scriptures.map(s => s.ref));
  const rows = SEED_SCRIPTURES.filter(s => !have.has(s.ref)).map((s, i) => ({ family_id: fid(), id: newId() + i.toString(36), kind: s.kind, ref: s.ref, text_zh: s.zh, text_en: s.en, source: s.source, sort: S.hs.scriptures.length + i }));
  if (!rows.length) return 0;
  const data = await run(SB.client.from("hs_scriptures").insert(rows).select());
  S.hs.scriptures.push(...data); return data.length;
}
const scripture = id => S.hs.scriptures.find(s => s.id === id) || null;

/* ---- 背诵进度：在学 → 会背了 → 3 天、7 天、30 天、90 天复习 ---- */
const INTERVALS = [3, 7, 30, 90];
const progressOf = (sid, cid) => S.hs.progress.find(p => p.scripture_id === sid && p.child_id === cid) || null;
async function setProgress(sid, cid, action){
  const cur = progressOf(sid, cid), t = today(), plus = n => dayKey(Date.now() + n * D);
  if (action === "reset") {
    await run(SB.client.from("hs_scripture_progress").delete().eq("family_id", fid()).eq("scripture_id", sid).eq("child_id", cid));
    S.hs.progress = S.hs.progress.filter(p => !(p.scripture_id === sid && p.child_id === cid)); return;
  }
  let row;
  if (action === "start") row = { status: "learning", learned_on: null, next_review: null, reviews: 0 };
  else if (action === "learned") row = { status: "learned", learned_on: t, next_review: plus(INTERVALS[0]), reviews: 0 };
  else if (action === "remember") { const n = ((cur && cur.reviews) || 0) + 1; row = { status: "learned", learned_on: (cur && cur.learned_on) || t, next_review: plus(INTERVALS[Math.min(n, INTERVALS.length - 1)]), reviews: n }; }
  else if (action === "again") row = { status: "learned", learned_on: (cur && cur.learned_on) || t, next_review: plus(1), reviews: (cur && cur.reviews) || 0 };
  else return;
  const data = await run(SB.client.from("hs_scripture_progress").upsert({ family_id: fid(), scripture_id: sid, child_id: cid, ...row }).select().single());
  const i = S.hs.progress.findIndex(p => p.scripture_id === sid && p.child_id === cid); if (i >= 0) S.hs.progress[i] = data; else S.hs.progress.push(data);
}
const withCard = list => list.map(p => ({ p, s: scripture(p.scripture_id) })).filter(x => x.s);
const dueReviews = cid => withCard(S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.next_review && p.next_review <= today()));
const learningCards = cid => withCard(S.hs.progress.filter(p => p.child_id === cid && p.status === "learning"));
const learnedCount = cid => S.hs.progress.filter(p => p.child_id === cid && p.status === "learned").length;

/* ---- 周例行 ---- */
async function upsertRoutine(r){
  const weekdays = [...new Set((r.weekdays || [1, 2, 3, 4, 5]).map(Number))].filter(d => d >= 0 && d <= 6).sort(); // form controls hand back strings
  const row = { family_id: fid(), id: r.id || newId(), child_id: r.child_id || null, title: r.title || "", subject: r.subject || "bible", weekdays, start: r.start || null, minutes: +r.minutes || 15, sort: r.sort ?? S.hs.routines.length, active: r.active ?? true };
  const data = put(S.hs.routines, await run(SB.client.from("hs_routines").upsert(row).select().single()));
  await ensureTodayTasks(); return data;
}
async function deleteRoutine(id){
  await run(SB.client.from("hs_routines").delete().eq("family_id", fid()).eq("id", id));
  S.hs.routines = S.hs.routines.filter(x => x.id !== id);
  // today's not-yet-done tasks generated from it go too
  const gone = S.hs.tasks.filter(t => t.routine_id === id && t.date === today() && t.status === "todo");
  for (const t of gone) await deleteTask(t.id);
}
async function applyTemplate(key, childId){
  const tpl = ROUTINE_TEMPLATES[key]; if (!tpl) return 0;
  // re-applying never duplicates: same title for the same child (or for the family) is skipped
  const have = new Set(S.hs.routines.map(r => `${r.child_id || ""}|${r.title}`));
  const rows = tpl.rows.filter(r => !have.has(`${r.family ? "" : childId}|${r.title}`)).map((r, i) => ({ family_id: fid(), id: newId() + i.toString(36), child_id: r.family ? null : childId, title: r.title, subject: r.subject, weekdays: r.weekdays, start: r.start || null, minutes: r.minutes, sort: S.hs.routines.length + i, active: true }));
  if (!rows.length) return 0;
  const data = await run(SB.client.from("hs_routines").insert(rows).select());
  S.hs.routines.push(...data); await ensureTodayTasks(); return data.length;
}
const routine = id => S.hs.routines.find(r => r.id === id) || null;

/* ---- 每日任务 ---- */
// one task per active routine per day; the id is deterministic so two devices never double-generate
async function ensureTodayTasks(){
  const day = today(), wd = new Date().getDay();
  if ((S.hs.settings.daysOff || []).includes(day)) return 0; // 休息日不生成
  const rows = S.hs.routines
    .filter(r => r.active && (r.weekdays || []).includes(wd) && !S.hs.tasks.some(t => t.routine_id === r.id && t.date === day))
    .map(r => ({ family_id: fid(), id: `${r.id}@${day}`, child_id: r.child_id, date: day, title: r.title, subject: r.subject, routine_id: r.id, status: "todo", minutes: null, note: "" }));
  if (!rows.length) return 0;
  const { data, error } = await SB.client.from("hs_tasks").upsert(rows, { onConflict: "family_id,id", ignoreDuplicates: true }).select();
  if (error) { console.error(error); return 0; }
  (data || []).forEach(t => put(S.hs.tasks, t)); return (data || []).length;
}
function tasksFor(day, cid){
  const startOf = t => { const r = t.routine_id && routine(t.routine_id); return (r && r.start) || "99:99"; };
  return S.hs.tasks.filter(t => t.date === day && (t.child_id == null || t.child_id === cid)).sort((a, b) => startOf(a).localeCompare(startOf(b)) || a.title.localeCompare(b.title));
}
async function upsertTask(t){
  const row = withLesson({ family_id: fid(), id: t.id || newId(), child_id: t.child_id || null, date: t.date || today(), title: t.title || "", subject: t.subject || "bible", routine_id: t.routine_id || null, status: t.status || "todo", minutes: t.minutes == null || t.minutes === "" ? null : +t.minutes, note: t.note || "", done_at: t.done_at || null }, t);
  return put(S.hs.tasks, await run(SB.client.from("hs_tasks").upsert(row).select().single()));
}
async function setTaskStatus(id, status){
  const t = S.hs.tasks.find(x => x.id === id); if (!t) return;
  const r = t.routine_id && routine(t.routine_id);
  const saved = await upsertTask({ ...t, status, done_at: status === "done" ? new Date().toISOString() : null, minutes: status === "done" && t.minutes == null && r ? r.minutes : t.minutes });
  if (t.lesson_id && lesson(t.lesson_id)) await setLessonStatus(t.lesson_id, status === "done" ? "done" : "planned", { minutes: saved.minutes });
  if (status === "done") await mirrorToBabyLog(saved);
}
// upsertTask keeps lesson_id when present
const withLesson = (row, t) => (t.lesson_id ? { ...row, lesson_id: t.lesson_id } : row);
async function moveTask(id){ const t = S.hs.tasks.find(x => x.id === id); if (!t) return; await upsertTask({ ...t, id: t.routine_id ? `${t.routine_id}@${dayKey(Date.now() + D)}` : t.id, date: dayKey(Date.now() + D), status: "todo", done_at: null }); if (t.routine_id) await deleteTask(id); }
async function deleteTask(id){ await run(SB.client.from("hs_tasks").delete().eq("family_id", fid()).eq("id", id)); S.hs.tasks = S.hs.tasks.filter(x => x.id !== id); }

/* ---- 课程树：单元 → 课时 ---- */
const unit = id => S.hs.units.find(u => u.id === id) || null;
const lesson = id => S.hs.lessons.find(l => l.id === id) || null;
const unitLessons = uid => S.hs.lessons.filter(l => l.unit_id === uid).sort((a, b) => a.sort - b.sort);
function unitProgress(uid){ const ls = unitLessons(uid); return { done: ls.filter(l => l.status === "done").length, total: ls.length }; }
async function upsertUnit(u){
  const row = { family_id: fid(), id: u.id || newId(), child_id: u.child_id || null, subject: u.subject || "bible", title: u.title || "", note: u.note || "", sort: u.sort ?? S.hs.units.length, active: u.active ?? true };
  return put(S.hs.units, await run(SB.client.from("hs_units").upsert(row).select().single()));
}
async function deleteUnit(id){
  await run(SB.client.from("hs_units").delete().eq("family_id", fid()).eq("id", id));
  S.hs.units = S.hs.units.filter(u => u.id !== id); S.hs.lessons = S.hs.lessons.filter(l => l.unit_id !== id);
}
async function upsertLesson(l){
  const row = { family_id: fid(), id: l.id || newId(), unit_id: l.unit_id, title: l.title || "", faith_note: l.faith_note || "", verse_ref: l.verse_ref || "", status: l.status || "planned", done_on: l.done_on || null, minutes: l.minutes == null || l.minutes === "" ? null : +l.minutes, note: l.note || "", sort: l.sort ?? unitLessons(l.unit_id).length };
  return put(S.hs.lessons, await run(SB.client.from("hs_lessons").upsert(row).select().single()));
}
async function deleteLesson(id){ await run(SB.client.from("hs_lessons").delete().eq("family_id", fid()).eq("id", id)); S.hs.lessons = S.hs.lessons.filter(l => l.id !== id); }
async function setLessonStatus(id, status, extra = {}){
  const l = lesson(id); if (!l) return;
  await upsertLesson({ ...l, status, done_on: status === "done" ? (l.done_on || today()) : null, minutes: extra.minutes ?? l.minutes });
}
// 把课时排进某一天：生成一条挂着 lesson_id 的任务；任务完成即课时完成
async function scheduleLesson(id, date = today()){
  const l = lesson(id), u = l && unit(l.unit_id); if (!l || !u) return null;
  return upsertTask({ id: `${l.id}@${date}`, child_id: u.child_id || S.childId, date, title: l.title, subject: u.subject, lesson_id: l.id, status: "todo", note: l.verse_ref ? `经文 ${l.verse_ref}` : "" });
}
async function applyCourseTemplate(key, childId){
  const tpl = COURSE_TEMPLATES[key]; if (!tpl) return 0;
  const have = new Set(S.hs.units.filter(u => u.child_id === childId || !u.child_id).map(u => u.title));
  let n = 0;
  for (const u of tpl.units) {
    if (have.has(u.title)) continue;
    const unitRow = await upsertUnit({ child_id: childId, subject: u.subject, title: u.title });
    const rows = u.lessons.map(([title, faith_note, verse_ref], i) => ({ family_id: fid(), id: newId() + i.toString(36), unit_id: unitRow.id, title, faith_note: faith_note || "", verse_ref: verse_ref || "", status: "planned", sort: i, note: "" }));
    const data = await run(SB.client.from("hs_lessons").insert(rows).select()); S.hs.lessons.push(...data); n++;
  }
  return n;
}

/* ---- 学习目标 ---- */
async function upsertGoal(g){
  const row = { family_id: fid(), id: g.id || newId(), child_id: g.child_id || S.childId, area: g.area || "bible", title: g.title || "", target_on: g.target_on || null, achieved_on: g.achieved_on || null, evidence: g.evidence || "", sort: g.sort ?? S.hs.goals.length };
  return put(S.hs.goals, await run(SB.client.from("hs_goals").upsert(row).select().single()));
}
async function deleteGoal(id){ await run(SB.client.from("hs_goals").delete().eq("family_id", fid()).eq("id", id)); S.hs.goals = S.hs.goals.filter(g => g.id !== id); }
async function toggleGoal(id){ const g = S.hs.goals.find(x => x.id === id); if (g) await upsertGoal({ ...g, achieved_on: g.achieved_on ? null : today() }); }
async function applyGoalTemplate(key, childId){
  const tpl = GOAL_TEMPLATES[key]; if (!tpl) return 0;
  const have = new Set(S.hs.goals.filter(g => g.child_id === childId).map(g => g.title));
  const rows = tpl.goals.filter(([, t]) => !have.has(t)).map(([area, title], i) => ({ family_id: fid(), id: newId() + i.toString(36), child_id: childId, area, title, evidence: "", sort: S.hs.goals.length + i }));
  if (!rows.length) return 0;
  const data = await run(SB.client.from("hs_goals").insert(rows).select()); S.hs.goals.push(...data); return data.length;
}

/* ---- 资源库 ---- */
async function upsertResource(r){
  const row = { family_id: fid(), id: r.id || newId(), title: r.title || "", url: r.url || "", type: r.type || "link", subject: r.subject || "", lang: r.lang || "zh", age_min: r.age_min == null || r.age_min === "" ? null : +r.age_min, age_max: r.age_max == null || r.age_max === "" ? null : +r.age_max, source: r.source || "", tags: typeof r.tags === "string" ? r.tags.split(/[,，\s]+/).filter(Boolean) : (r.tags || []), note: r.note || "", sort: r.sort ?? S.hs.resources.length };
  return put(S.hs.resources, await run(SB.client.from("hs_resources").upsert(row).select().single()));
}
async function deleteResource(id){ await run(SB.client.from("hs_resources").delete().eq("family_id", fid()).eq("id", id)); S.hs.resources = S.hs.resources.filter(r => r.id !== id); }
async function importSeedResources(){
  const have = new Set(S.hs.resources.map(r => r.url));
  const rows = SEED_RESOURCES.filter(r => !have.has(r.url)).map((r, i) => ({ family_id: fid(), id: newId() + i.toString(36), title: r.title, url: r.url, type: r.type || "link", subject: r.subject || "", lang: r.lang || "zh", age_min: r.age_min ?? null, age_max: r.age_max ?? null, source: r.source || "", tags: r.tags || [], note: r.note || "", sort: S.hs.resources.length + i }));
  if (!rows.length) return 0;
  const data = await run(SB.client.from("hs_resources").insert(rows).select()); S.hs.resources.push(...data); return data.length;
}

/* ---- 日历与报告：按月读取任务与敬拜 ---- */
function monthRange(ym){ const [y, m] = ym.split("-").map(Number); const a = new Date(y, m - 1, 1), b = new Date(y, m, 0); return { from: dayKey(a.getTime()), to: dayKey(b.getTime()), days: b.getDate() }; }
async function ensureMonth(ym){
  const cur = S.hs.ranges[ym]; if (cur && (cur.loaded || cur.loading)) return cur;
  S.hs.ranges[ym] = { loading: true, loaded: false, tasks: [], devotions: [] };
  const { from, to } = monthRange(ym), f = fid();
  const [t, d] = await Promise.all([
    SB.client.from("hs_tasks").select("*").eq("family_id", f).gte("date", from).lte("date", to),
    SB.client.from("hs_devotions").select("*").eq("family_id", f).gte("date", from).lte("date", to)
  ]);
  S.hs.ranges[ym] = { loading: false, loaded: true, tasks: t.data || [], devotions: d.data || [] };
  // keep today's in-memory tasks authoritative
  return S.hs.ranges[ym];
}
function monthData(ym){ const r = S.hs.ranges[ym]; if (!r || !r.loaded) return null; const ids = new Set(S.hs.tasks.map(t => t.id)); return { tasks: [...r.tasks.filter(t => !ids.has(t.id)), ...S.hs.tasks.filter(t => t.date >= monthRange(ym).from && t.date <= monthRange(ym).to)], devotions: r.devotions.map(d => (S.hs.devotion && d.date === S.hs.devotion.date) ? S.hs.devotion : d).concat(S.hs.devotion && !r.devotions.some(d => d.date === S.hs.devotion.date) && S.hs.devotion.date >= monthRange(ym).from && S.hs.devotion.date <= monthRange(ym).to ? [S.hs.devotion] : []) }; }
async function toggleDayOff(date){
  const cur = new Set(S.hs.settings.daysOff || []); cur.has(date) ? cur.delete(date) : cur.add(date);
  await saveSettings({ daysOff: [...cur].sort() });
  if (date === today()) { if (cur.has(date)) { for (const t of S.hs.tasks.filter(x => x.date === date && x.routine_id && x.status === "todo")) await deleteTask(t.id); } else await ensureTodayTasks(); }
}

/* ---- 回写小月亮：完成带分钟数的任务时写一条活动记录（阅读 / 户外 / 音乐运动）---- */
function mirrorKind(t){
  if (!t.child_id) return null;
  if (t.subject === "language") return "阅读";
  if (t.subject === "arts") return "音乐运动";
  if (/户外|outdoor/i.test(t.title)) return "户外";
  return null;
}
async function mirrorToBabyLog(t){
  if (!S.hs.settings.mirror) return;
  const kind = mirrorKind(t); if (!kind || !t.minutes) return;
  const ts = t.done_at ? new Date(t.done_at).getTime() : Date.now(), id = "hs-" + t.id.replace(/[^a-z0-9]/gi, "");
  const data = { id, type: "activity", ts, updated: Date.now(), child: t.child_id, kind, minutes: +t.minutes, what: t.title, note: "来自家庭学堂" };
  const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: "activity", ts, updated: data.updated, deleted: false, data }, { onConflict: "family_id,id" });
  if (error) console.error(error);
}

/* ---- 实时：另一位家长勾了任务或敬拜，这边几秒内更新 ---- */
function attachRealtime(channel, onChange){
  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "hs_tasks", filter: "family_id=eq." + fid() }, payload => {
      if (payload.eventType === "DELETE") { const id = payload.old && payload.old.id; if (id) S.hs.tasks = S.hs.tasks.filter(t => t.id !== id); }
      else if (payload.new && payload.new.id) put(S.hs.tasks, payload.new);
      onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "hs_devotions", filter: "family_id=eq." + fid() }, payload => {
      if (payload.new && payload.new.date === today()) { S.hs.devotion = payload.new; onChange(); }
    });
}

export { loadAll, refreshIfNewDay, saveSettings, planState, currentPlan, todayPassage, choosePlan, importPlan, devotionDraft, saveDevotion,
  upsertScripture, deleteScripture, importSeedScriptures, scripture, progressOf, setProgress, dueReviews, learningCards, learnedCount,
  upsertRoutine, deleteRoutine, applyTemplate, routine, ensureTodayTasks, tasksFor, upsertTask, setTaskStatus, moveTask, deleteTask, attachRealtime,
  unit, lesson, unitLessons, unitProgress, upsertUnit, deleteUnit, upsertLesson, deleteLesson, setLessonStatus, scheduleLesson, applyCourseTemplate,
  upsertGoal, deleteGoal, toggleGoal, applyGoalTemplate, upsertResource, deleteResource, importSeedResources,
  monthRange, ensureMonth, monthData, toggleDayOff, mirrorKind };
