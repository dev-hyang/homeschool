import { SB } from "./core/auth.js";
import { S } from "./core/state.js";
import { D, dayKey, newId, toast } from "./core/util.js";
import { PLANS, planById } from "./data/plans.js";
import { ROUTINE_TEMPLATES, SEED_SCRIPTURES } from "./data/seeds.js";

/* ============ 家庭学堂数据层（在线优先） ============
   进入家庭时一次性读取；每次写入直接到 Supabase，成功后更新内存并重绘。
   hs_* 表由 baby-log 仓库 supabase/migrations/003 建立；表不存在时 S.hs.error = "missing"，页面会提示。 */
S.hs = { loaded: false, error: null, day: null, settings: {}, scriptures: [], progress: [], routines: [], tasks: [], devotion: null };

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
  S.hs = { ...S.hs, loaded: true, error: null, day, settings: (fam && fam.settings) || {}, scriptures: scr || [], progress: prog || [], routines: rout || [], tasks: tasks || [], devotion: devo || null };
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
  const row = { family_id: fid(), id: t.id || newId(), child_id: t.child_id || null, date: t.date || today(), title: t.title || "", subject: t.subject || "bible", routine_id: t.routine_id || null, status: t.status || "todo", minutes: t.minutes == null || t.minutes === "" ? null : +t.minutes, note: t.note || "", done_at: t.done_at || null };
  return put(S.hs.tasks, await run(SB.client.from("hs_tasks").upsert(row).select().single()));
}
async function setTaskStatus(id, status){
  const t = S.hs.tasks.find(x => x.id === id); if (!t) return;
  const r = t.routine_id && routine(t.routine_id);
  await upsertTask({ ...t, status, done_at: status === "done" ? new Date().toISOString() : null, minutes: status === "done" && t.minutes == null && r ? r.minutes : t.minutes });
}
async function moveTask(id){ const t = S.hs.tasks.find(x => x.id === id); if (!t) return; await upsertTask({ ...t, id: t.routine_id ? `${t.routine_id}@${dayKey(Date.now() + D)}` : t.id, date: dayKey(Date.now() + D), status: "todo", done_at: null }); if (t.routine_id) await deleteTask(id); }
async function deleteTask(id){ await run(SB.client.from("hs_tasks").delete().eq("family_id", fid()).eq("id", id)); S.hs.tasks = S.hs.tasks.filter(x => x.id !== id); }

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
  upsertRoutine, deleteRoutine, applyTemplate, routine, ensureTodayTasks, tasksFor, upsertTask, setTaskStatus, moveTask, deleteTask, attachRealtime };
