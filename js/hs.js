import { SB } from "./core/auth.js";
import { S } from "./core/state.js";
import { D, dayKey, newId, toast } from "./core/util.js";
import { PLANS, planById } from "./data/plans.js";
import { GOAL_TEMPLATES, ROUTINE_TEMPLATES, SEED_RESOURCES, SEED_SCRIPTURES } from "./data/seeds.js";
import { CURRICULUM, chainStage } from "./data/curriculum.js";
import { SUBJECTS } from "./data/subjects.js";
import { stageOf } from "./core/state.js";
import { startOfDay } from "./core/util.js";
import { DEFAULT_EN, DEFAULT_ZH } from "./data/versions.js";
import { t, t as tr } from "./core/i18n.js";
import { biRef, canFetch, fetchPassage, parseRef, refKey } from "./data/bible.js";
import { CC_PARTS, VERSE_SETS, fetchChildrensCatechism, parseCatechism } from "./data/verse-sets.js";
import { CC_ZH, CC_ZH_PENDING, CC_ZH_REVIEWED } from "./data/cc-zh.js";

/* ============ 家庭学堂数据层（在线优先） ============
   进入家庭时一次性读取；每次写入直接到 Supabase，成功后更新内存并重绘。
   hs_* 表由 baby-log 仓库 supabase/migrations/003 建立；表不存在时 S.hs.error = "missing"，页面会提示。 */
S.hs = { loaded: false, error: null, day: null, settings: {}, scriptures: [], progress: [], routines: [], tasks: [], devotion: null,
  phase2: false, units: [], lessons: [], goals: [], resources: [], ranges: {} };

const fid = () => S.family.id;
const today = () => dayKey(Date.now());
const missingTable = err => err && (err.code === "42P01" || err.code === "PGRST205" || /schema cache|does not exist/i.test(err.message || ""));
// 失败时把数据库的原话带上，方便排查（例如缺列、权限）
async function run(p, msg){ const { data, error } = await p; if (error) { console.error(error); toast(t(msg || "云端保存失败") + (error.message ? "：" + String(error.message).slice(0, 80) : "")); throw error; } return data; }
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
  // 迁移 005 加的译本列：任一行带该字段即视为已迁移；没有卡时写一次探测
  const versions = (scr && scr.length) ? ("version_zh" in scr[0]) : await probeVersions(f);
  // 迁移 011 加的背诵记录列：同样的探测方式
  const reviewLog = (prog && prog.length) ? ("last_on" in prog[0]) : !(await SB.client.from("hs_scripture_progress").select("last_on").eq("family_id", f).limit(1)).error;
  S.hs = { ...S.hs, loaded: true, error: null, day, versions, reviewLog, settings: (fam && fam.settings) || {}, scriptures: scr || [], progress: prog || [], routines: rout || [], tasks: tasks || [], devotion: devo || null, ranges: {} };
  // 阶段 2–4 的表（迁移 004）；还没建时这些页面单独提示，不影响今天页
  const rs2 = await Promise.all([
    SB.client.from("hs_units").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_lessons").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_goals").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_resources").select("*").eq("family_id", f).order("sort")
  ]);
  if (rs2.some(r => r.error)) { S.hs.phase2 = false; }
  else {
    const [u, l, g, r] = rs2.map(x => x.data || []);
    // 迁移 006 加的节奏列：任一单元带该字段即视为已迁移；没有单元时探测一次
    const pacing = u.length ? ("weeks" in u[0]) : !(await SB.client.from("hs_units").select("weeks").eq("family_id", f).limit(1)).error;
    const tplCol = u.length ? ("tpl" in u[0]) : !(await SB.client.from("hs_units").select("tpl").eq("family_id", f).limit(1)).error; // 迁移 008
    S.hs = { ...S.hs, phase2: true, pacing, tplCol, units: u, lessons: l, goals: g, resources: r };
  }
  await ensureTodayTasks();
  await autoAssignVerses();
}

/* ---- 学年：开学日、周数、学期长度、假期（settings.year）---- */
function yearInfo(){
  const y = S.hs.settings.year || {}; if (!y.start) return null;
  const start = new Date(y.start + "T00:00:00").getTime(), weeks = +y.weeks || 36, termWeeks = +y.termWeeks || 12;
  const week = Math.floor((startOfDay(Date.now()) - start) / (7 * D)) + 1;
  return { start: y.start, weeks, termWeeks, terms: Math.ceil(weeks / termWeeks), week, term: Math.min(Math.ceil(weeks / termWeeks), Math.max(1, Math.ceil(week / termWeeks))), before: week < 1, ended: week > weeks, breaks: y.breaks || [], endOn: dayKey(start + weeks * 7 * D) };
}
const inBreak = date => ((S.hs.settings.year || {}).breaks || []).some(b => b.from && b.to && date >= b.from && date <= b.to);
const isOffDay = date => (S.hs.settings.daysOff || []).includes(date) || inBreak(date);
async function saveYear(patch){ await saveSettings({ year: { ...(S.hs.settings.year || {}), ...patch } }); }

/* ---- 单元节奏：按预计周数算“应完成多少” ---- */
function unitPace(u){
  if (!u || !u.weeks || !u.start_on) return null;
  const ls = unitLessons(u.id), total = ls.length; if (!total) return null;
  const done = ls.filter(l => l.status === "done").length;
  const start = new Date(u.start_on + "T00:00:00").getTime();
  const elapsed = Math.max(0, (startOfDay(Date.now()) - start) / (7 * D));
  const expected = Math.min(total, Math.round(total * elapsed / u.weeks));
  // 最近 4 周的完成速度 → 预计还要几周
  const since = dayKey(Date.now() - 28 * D), recent = ls.filter(l => l.status === "done" && l.done_on && l.done_on >= since).length;
  const rate = recent / 4, remaining = total - done;
  const projectWeeks = remaining === 0 ? 0 : rate > 0 ? Math.ceil(remaining / rate) : null;
  return { total, done, expected, diff: done - expected, elapsedWeeks: elapsed, endOn: dayKey(start + u.weeks * 7 * D), overdue: elapsed > u.weeks && done < total, projectWeeks, projectOn: projectWeeks == null ? null : dayKey(Date.now() + projectWeeks * 7 * D) };
}
// 一个单元第一次被排课或完成课时时，把开始日期记下来
async function touchUnitStart(uid){ const u = unit(uid); if (u && S.hs.pacing && !u.start_on) await upsertUnit({ ...u, start_on: today() }); }
async function probeVersions(f){ const { error } = await SB.client.from("hs_scriptures").select("version_zh").eq("family_id", f).limit(1); return !error; }
// day rolled over while the page stayed open → reload today's rows
// 页面回到前台 / 每分钟：过了午夜就整体重读；到了 8 点就补经文
async function refreshIfNewDay(){ if (S.hs.loaded && S.hs.day !== today()) await loadAll(); else if (S.hs.loaded) await autoAssignVerses(); }

/* ---- 家庭级设置 ---- */
async function saveSettings(patch){
  S.hs.settings = { ...S.hs.settings, ...patch };
  await run(SB.client.from("hs_family").upsert({ family_id: fid(), settings: S.hs.settings }));
}

/* ---- 读经计划 ---- */
function planState(){ const s = S.hs.settings.plan || {}; return { id: s.id || "story", progress: s.progress || {} }; }
function currentPlan(){
  const { id } = planState();
  if (id === "custom") { const c = S.hs.settings.customPlan; if (c && c.items && c.items.length) return { id: "custom", name: c.name || t("自定义计划"), desc: t("{n} 段", { n: c.items.length }), items: c.items }; }
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
// 家庭默认译本（设置里改），新卡和导入都用它
const defaultVersions = () => ({ zh: S.hs.settings.versionZh || DEFAULT_ZH, en: S.hs.settings.versionEn || DEFAULT_EN });
async function upsertScripture(s){
  const dv = defaultVersions();
  const row = { family_id: fid(), id: s.id || newId(), kind: s.kind || "verse", ref: s.ref || "", text_zh: s.text_zh || "", text_en: s.text_en || "", version_zh: s.version_zh ?? (s.text_zh ? dv.zh : ""), version_en: s.version_en ?? (s.text_en ? dv.en : ""), source: s.source || "", sort: s.sort ?? S.hs.scriptures.length };
  if (!S.hs.versions) { delete row.version_zh; delete row.version_en; } // 迁移 005 还没跑：先不写这两列
  return put(S.hs.scriptures, await run(SB.client.from("hs_scriptures").upsert(row).select().single()));
}
async function deleteScripture(id){
  await run(SB.client.from("hs_scriptures").delete().eq("family_id", fid()).eq("id", id));
  S.hs.scriptures = S.hs.scriptures.filter(x => x.id !== id); S.hs.progress = S.hs.progress.filter(p => p.scripture_id !== id);
  if (S.hs.settings.weekVerse === id) await saveSettings({ weekVerse: null });
}
async function importSeedScriptures(){
  const have = new Set(S.hs.scriptures.map(s => s.ref));
  const rows = SEED_SCRIPTURES.filter(s => !have.has(s.ref)).map((s, i) => { const r = { family_id: fid(), id: newId() + i.toString(36), kind: s.kind, ref: s.ref, text_zh: s.zh, text_en: s.en, version_zh: s.version_zh, version_en: s.version_en, source: s.source, sort: S.hs.scriptures.length + i }; if (!S.hs.versions) { delete r.version_zh; delete r.version_en; } return r; });
  if (!rows.length) return 0;
  const data = await run(SB.client.from("hs_scriptures").insert(rows).select());
  S.hs.scriptures.push(...data); return data.length;
}
const scripture = id => S.hs.scriptures.find(s => s.id === id) || null;

/* ---- 自动抓取经文：按出处生成卡 ---- */
// 抓取用的译本：优先设置里的“抓取译本”，否则用默认译本；取不到的译本（如没配代理的 ESV / NASB / NIV）回退：中文和合本，英文 BSB（公有领域的现代英语）
function fetchVersions(){
  const s = S.hs.settings, esv = s.esvProxy || "";
  let zh = s.fetchZh || defaultVersions().zh, en = s.fetchEn || defaultVersions().en;
  const zhFallback = !canFetch(zh, esv), enFallback = !canFetch(en, esv), wanted = { zh, en };
  if (zhFallback) zh = "和合本"; if (enFallback) en = "BSB";
  return { zh, en, esv, zhFallback, enFallback, wanted };
}
async function fetchBoth(ref){
  const p = parseRef(ref); if (!p) return { error: t("看不懂出处") };
  const v = fetchVersions(); const out = { ref: biRef(p), text_zh: "", text_en: "", version_zh: "", version_en: "", errors: [] };
  const [a, b] = await Promise.allSettled([fetchPassage(p, v.zh, v.esv), fetchPassage(p, v.en, v.esv)]);
  if (a.status === "fulfilled") { out.text_zh = a.value.text; out.version_zh = a.value.version; } else out.errors.push(t("中文：") + (a.reason && a.reason.message));
  if (b.status === "fulfilled") { out.text_en = b.value.text; out.version_en = b.value.version; } else out.errors.push(t("英文：") + (b.reason && b.reason.message));
  return out;
}
// refs：出处数组；已有同出处的卡跳过。返回 { added, skipped, failed: [ref, 原因] }
async function generateCards(refs, kind = "verse"){
  const have = new Set(S.hs.scriptures.map(s => refKey(s.ref)));
  const res = { added: 0, skipped: 0, failed: [] };
  for (const raw of refs) {
    const p = parseRef(raw); if (!p) { res.failed.push([raw, t("看不懂出处")]); continue; }
    if (have.has(refKey(p.label))) { res.skipped++; continue; }
    const f = await fetchBoth(p.label);
    if (!f.text_zh && !f.text_en) { res.failed.push([raw, f.errors.join("；")]); continue; }
    await upsertScripture({ kind, ref: f.ref, text_zh: f.text_zh, text_en: f.text_en, version_zh: f.version_zh, version_en: f.version_en, source: "自动抓取（getBible）" });
    have.add(refKey(f.ref)); res.added++;
  }
  return res;
}
const verseSet = id => VERSE_SETS.find(s => s.id === id) || null;
// 粘贴新城要理问答官方全文（中文或英文）→ 52 张问答卡；同一问已存在则补上另一种语言
async function importCatechism(text, lang){
  const items = parseCatechism(text); if (!items.length) return { added: 0, updated: 0 };
  let added = 0, updated = 0;
  for (const it of items) {
    const ref = `新城要理问答 问 ${it.n} - New City Catechism Q${it.n}`;
    const body = `问：${it.q}${it.a ? ` 答：${it.a}` : ""}`;
    const cur = S.hs.scriptures.find(s => s.ref === ref || s.ref === `新城要理问答 问 ${it.n}`);
    const patch = lang === "en" ? { text_en: body, version_en: "New City Catechism" } : { text_zh: body, version_zh: "新城要理问答官方简体" };
    if (cur) { await upsertScripture({ ...cur, ref, ...patch }); updated++; }
    else { await upsertScripture({ kind: "catechism", ref, text_zh: "", text_en: "", version_zh: "", version_en: "", ...patch, source: "newcitycatechism.com", sort: 1000 + it.n }); added++; }
  }
  return { added, updated, total: items.length };
}

// 儿童要理问答一键导入：part = CC_PARTS 里的一段（或 { from, to }）。英文抓取、中文用内置译文（标“待核对”）。
// 已有的问跳过；上一版只导过英文的卡，这次会补上中文。返回 { added, filled, skipped, total }
async function importChildrensCatechism(part){
  const all = await fetchChildrensCatechism(), items = all.filter(x => x.n >= part.from && x.n <= part.to);
  let added = 0, filled = 0, skipped = 0;
  for (const it of items) {
    const ref = ccRef(it.n), zh = CC_ZH[it.n], cur = S.hs.scriptures.find(s => s.ref === ref);
    const zhPatch = zh ? { text_zh: `问：${zh[0]} 答：${zh[1]}`, version_zh: CC_ZH_PENDING } : {};
    if (cur) { if (!cur.text_zh && zh) { await upsertScripture({ ...cur, ...zhPatch }); filled++; } else skipped++; continue; }
    await upsertScripture({ kind: "catechism", ref, text_en: `Q: ${it.q} A: ${it.a}`, version_en: "Catechism for Young Children", ...(zh ? zhPatch : { text_zh: "", version_zh: "" }), source: "reformed.org · childrens-catechism（公有领域）；中文为 AI 辅助翻译", sort: 2000 + it.n });
    added++;
  }
  return { added, filled, skipped, total: items.length };
}
const ccRef = n => `儿童要理问答 问 ${n} - Catechism for Young Children Q${n}`;
const ccCards = part => { const out = []; for (let i = part.from; i <= part.to; i++) { const s = S.hs.scriptures.find(x => x.ref === ccRef(i)); if (s) out.push(s); } return out; };
// 这一段里还要导入（没有这张卡，或有卡但缺中文）的问数
const ccMissing = part => { let n = 0; for (let i = part.from; i <= part.to; i++) { const s = S.hs.scriptures.find(x => x.ref === ccRef(i)); if (!s || (!s.text_zh && CC_ZH[i])) n++; } return n; };
// 译文还没人核对的张数；核对完在这一段标“已核对”，卡片上的译本名跟着改
const ccPending = part => ccCards(part).filter(s => s.version_zh === CC_ZH_PENDING).length;
async function markCatechismReviewed(part){
  let n = 0;
  for (const s of ccCards(part)) if (s.version_zh === CC_ZH_PENDING) { await upsertScripture({ ...s, version_zh: CC_ZH_REVIEWED }); n++; }
  return n;
}
/* ---- 背诵进度：在学 → 会背了 → 3 天、7 天、30 天、90 天复习，之后一直 90 天一次 ----
   reviews 是已通过的复习次数，决定下一档间隔。“再练练”不是失败：记一次，明天再来，并退一档间隔重新巩固。
   迁移 011 加了 last_on / last_result / again_streak / undo_to 和 paused 状态；今天页据此把做过的卡留在原位，并支持撤销。 */
// 通过第 5 次复习后拉长到 180 天：稳定期复习量减半，积压不再随背诵量线性增长（已在 90 天档的卡下次通过后才升档）
const INTERVALS = [3, 7, 30, 90, 180];
const tier = n => INTERVALS[Math.min(n, INTERVALS.length - 1)];
const progressOf = (sid, cid) => S.hs.progress.find(p => p.scripture_id === sid && p.child_id === cid) || null;
const snapshot = p => p ? { status: p.status, learned_on: p.learned_on, next_review: p.next_review, reviews: p.reviews || 0, again_streak: p.again_streak || 0, last_on: p.last_on || null, last_result: p.last_result || null } : null;
// on：补记某一天（YYYY-MM-DD，默认今天）。复习间隔从那一天起算，所以补记不会把下次复习排歪
async function setProgress(sid, cid, action, on){
  const cur = progressOf(sid, cid), t = on || today(), plus = n => dayKey(new Date(t + "T12:00:00").getTime() + n * D);   // 注意：这里的 t 是日期串，翻译用 tr
  if (action === "reset") {
    await run(SB.client.from("hs_scripture_progress").delete().eq("family_id", fid()).eq("scripture_id", sid).eq("child_id", cid));
    S.hs.progress = S.hs.progress.filter(p => !(p.scripture_id === sid && p.child_id === cid)); return;
  }
  const base = { ...snapshot(cur), undo_to: null }, reviews = (cur && cur.reviews) || 0, streak = (cur && cur.again_streak) || 0;
  const wasAgain = cur && cur.last_result === "again";
  let row;
  if (action === "start") row = { status: "learning", learned_on: null, next_review: null, reviews: 0, again_streak: 0, last_on: null, last_result: null };
  // 在学卡今天练过了，还没到会背：只记日期，卡留在今天页
  else if (action === "practice") row = { ...base, status: "learning", last_on: t, last_result: "practice", undo_to: snapshot(cur) };
  else if (action === "learned") row = { status: "learned", learned_on: t, next_review: plus(tier(0)), reviews: 0, again_streak: 0, last_on: t, last_result: "ok", undo_to: snapshot(cur) };
  // 上次是“再练练”的话，这次记得只是把退掉的那一档重新挣回来，不再往前跳
  else if (action === "remember") { const n = wasAgain ? reviews : reviews + 1; row = { ...base, status: "learned", learned_on: (cur && cur.learned_on) || t, next_review: plus(tier(n)), reviews: n, again_streak: 0, last_on: t, last_result: "ok", undo_to: snapshot(cur) }; }
  // 退一档：刚过的那一档是 tier(min(reviews,3))，明天记得后落到它的前一档；连续再练不重复退
  else if (action === "again") row = { ...base, status: "learned", learned_on: (cur && cur.learned_on) || t, next_review: plus(1), reviews: wasAgain ? reviews : Math.max(0, Math.min(reviews, INTERVALS.length - 1) - 1), again_streak: streak + 1, last_on: t, last_result: "again", undo_to: snapshot(cur) };
  else if (action === "pause") row = { ...base, status: "paused", next_review: null, again_streak: 0, last_on: null, last_result: null, undo_to: null };
  else if (action === "resume") row = { ...base, status: cur && cur.learned_on ? "learned" : "learning", next_review: cur && cur.learned_on ? t : null, again_streak: 0, last_on: null, last_result: null, undo_to: null };
  else if (action === "undo") { if (!cur || !cur.undo_to) return; row = { ...cur.undo_to, undo_to: null }; }
  else return;
  // 迁移 011 还没跑：老的四个动作退回旧写法（只写旧列），新动作提示先跑迁移
  if (!S.hs.reviewLog) {
    if (!["start", "learned", "remember", "again"].includes(action)) { toast(tr("背诵记录的新字段还没建：请先执行迁移 011")); return; }
    row = { status: row.status, learned_on: row.learned_on, next_review: row.next_review, reviews: row.reviews };
  }
  let data;
  try { data = await run(SB.client.from("hs_scripture_progress").upsert({ family_id: fid(), scripture_id: sid, child_id: cid, ...row }).select().single()); }
  catch (e) { if (/last_on|last_result|again_streak|undo_to|paused|status_check/.test(e.message || "")) toast(tr("背诵记录的新字段还没建：请先执行迁移 011")); throw e; }
  const i = S.hs.progress.findIndex(p => p.scripture_id === sid && p.child_id === cid); if (i >= 0) S.hs.progress[i] = data; else S.hs.progress.push(data);
}
const withCard = list => list.map(p => ({ p, s: scripture(p.scripture_id) })).filter(x => x.s);
const dueReviews = cid => withCard(S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.next_review && p.next_review <= today()));
const learningCards = cid => withCard(S.hs.progress.filter(p => p.child_id === cid && p.status === "learning"));
const learnedCount = cid => S.hs.progress.filter(p => p.child_id === cid && p.status === "learned").length;
/* 今日背诵清单：按阶段封顶（幼儿 1+1、学前 1+2、学龄 2+3），今天做过的卡留在原位并计入封顶；超出的自动排到明天。
   写死不做设置项；两岁前按幼儿算。 */
const DAILY_CAP = { baby: { learn: 1, review: 1 }, toddler: { learn: 1, review: 1 }, prek: { learn: 1, review: 2 }, school: { learn: 2, review: 3 } };
function todayPlan(cid){
  const d = today(), base = DAILY_CAP[stageOf(cid).key] || DAILY_CAP.prek, order = new Map(S.hs.scriptures.map((s, i) => [s.id, i]));
  // 家长点了“今天多复习”：只放宽当天的复习配额，次日恢复
  const extra = S.hs.extraReview && S.hs.extraReview.day === d ? S.hs.extraReview.n : 0, cap = { ...base, review: base.review + extra };
  const mine = withCard(S.hs.progress.filter(p => p.child_id === cid && p.status !== "paused"));
  const isLearn = x => x.p.status === "learning" || (x.p.last_result === "ok" && x.p.learned_on === d && !x.p.reviews);
  const done = mine.filter(x => x.p.last_on === d).map(x => ({ ...x, kind: isLearn(x) ? "learn" : "review", done: true }));
  const dueAll = mine.filter(x => x.p.last_on !== d && x.p.status === "learned" && x.p.next_review && x.p.next_review <= d).sort((a, b) => a.p.next_review < b.p.next_review ? -1 : 1);
  const learnAll = mine.filter(x => x.p.last_on !== d && x.p.status === "learning").sort((a, b) => (order.get(a.s.id) || 0) - (order.get(b.s.id) || 0));
  const roomR = Math.max(0, cap.review - done.filter(x => x.kind === "review").length), roomL = Math.max(0, cap.learn - done.filter(x => x.kind === "learn").length);
  const due = dueAll.slice(0, roomR).map(x => ({ ...x, kind: "review", done: false })), learn = learnAll.slice(0, roomL).map(x => ({ ...x, kind: "learn", done: false }));
  const rows = [...due, ...done.filter(x => x.kind === "review"), ...learn, ...done.filter(x => x.kind === "learn")];
  // 复习积压：到期但排不进今天的节数，和最久拖了几天。超过配额两倍或有拖满一周的，今天页提示家长
  const queued = dueAll.length - due.length, firstQueued = dueAll[due.length], oldest = firstQueued ? Math.round((new Date(d) - new Date(firstQueued.p.next_review)) / D) : 0;
  const backlog = queued > 0 && (queued >= base.review * 2 || oldest >= 7) ? { queued, oldest } : null;
  return { rows, done: done.length, total: rows.length, later: queued + (learnAll.length - learn.length), cap, backlog };
}
const addExtraReview = (n = 3) => { const d = today(), cur = S.hs.extraReview && S.hs.extraReview.day === d ? S.hs.extraReview.n : 0; S.hs.extraReview = { day: d, n: cur + n }; };
// 当前孩子还没开始背的第一张卡（卡库顺序），用于“开始下一节”
const nextToStart = cid => S.hs.scriptures.find(s => !progressOf(s.id, cid)) || null;
const unstarted = (cid, except) => S.hs.scriptures.filter(s => s.id !== except && !progressOf(s.id, cid));

/* ---- 8 点自动安排：在学为空的孩子（本批会背完了），拉下一批（见下面“本批”，pickRandom 只用于单张“换一个”）；
   卡库都背过了，就从成套经文里抓下一批（每次 5 节，按套的顺序，已有的跳过），再挑。
   家长手动点了“开始背”就不会再加；设置里可以关（settings.autoVerse = false）。两岁前不安排。 ---- */
const AUTO_HOUR = 8, AUTO_BATCH = 5;
async function fetchNextBatch(){
  const have = new Set(S.hs.scriptures.map(s => refKey(s.ref)));
  for (const set of VERSE_SETS) {
    const refs = set.refs.filter(r => { const p = parseRef(r); return p && !have.has(refKey(p.label)); }).slice(0, AUTO_BATCH);
    if (!refs.length) continue;
    const r = await generateCards(refs);
    if (r.added) { toast(t("卡库背完了，已从「{set}」自动抓来 {n} 节", { set: set.name, n: r.added })); return r.added; }
  }
  return 0;
}
async function pickRandom(cid, except){
  let pool = unstarted(cid, except);
  if (!pool.length) { if (!(await fetchNextBatch())) return null; pool = unstarted(cid, except); }
  if (!pool.length) return null;
  const s = pool[Math.floor(Math.random() * pool.length)];
  await setProgress(s.id, cid, "start"); return s;
}
async function autoAssignVerses(){
  if (!S.hs.loaded || !S.hs.reviewLog || S.hs.settings.autoVerse === false || !S.hs.scriptures.length) return 0;
  const day = today();
  if (new Date().getHours() < AUTO_HOUR || S.hs.autoDay === day || isOffDay(day)) return 0;
  S.hs.autoDay = day; let n = 0;
  for (const c of S.children) {
    if (stageOf(c.id).key === "baby") continue;
    try { n += (await topUpPool(c.id)).length; } catch (e) { /* run() 已提示 */ }   // 本批还有在学的就不动；会背完了才拉下一批
  }
  return n;
}
// 觉得这节不合适：清掉它，再随机换一节
async function swapVerse(sid, cid){
  await setProgress(sid, cid, "reset");
  return pickRandom(cid, sid);
}

/* ---- 本批（pool）：在学的卡 = 本批。本批全部会背后自动拉下一批；每批几节、问答占几成都能调。
   settings.verseBatch（每批节数，默认 5）、settings.catShare（问答占比 %，默认 20；问答按卡库顺序，经文随机）、
   settings.pool[孩子id] = { ids, on }（本批有哪些卡，用来显示“本批 2/5”）。今天页的“今日 N 节”仍按年龄封顶，本批是排队的池子。 ---- */
const POOL_DEFAULT = { batch: 5, catShare: 20 };
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const poolCfg = () => ({ batch: clampN(+S.hs.settings.verseBatch || POOL_DEFAULT.batch, 1, 12), catShare: clampN(S.hs.settings.catShare == null ? POOL_DEFAULT.catShare : +S.hs.settings.catShare, 0, 100) });
const isCatechism = s => s.kind === "catechism";
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
/** 本批的进度：ids 里已经会背的 / 总数（卡被删、清除进度的不算） */
function poolOf(cid){
  const rec = (S.hs.settings.pool || {})[cid]; if (!rec || !rec.ids) return null;
  const cards = rec.ids.map(id => ({ id, p: progressOf(id, cid) })).filter(x => x.p && scripture(x.id));
  if (!cards.length) return null;
  return { total: cards.length, done: cards.filter(x => x.p.status === "learned").length, ids: cards.map(x => x.id) };
}
async function savePool(cid, ids){ await saveSettings({ pool: { ...(S.hs.settings.pool || {}), [cid]: { ids, on: today() } } }); }
/** 拉一批开始背：问答 / 经文按占比，经文不够先抓下一套，再不够用另一类补；返回拉到的卡 */
async function pullBatch(cid, want, except = new Set()){
  const cfg = poolCfg(); want = want == null ? cfg.batch : want; if (want <= 0) return [];
  const free = () => unstarted(cid).filter(s => !except.has(s.id));
  const nCatWant = Math.round(want * cfg.catShare / 100);
  let verses = free().filter(s => !isCatechism(s));
  if (verses.length < want - nCatWant && cfg.catShare < 100 && await fetchNextBatch()) verses = free().filter(s => !isCatechism(s));
  const cats = free().filter(isCatechism);
  const nVerse = Math.min(want - Math.min(nCatWant, cats.length), verses.length), nCat = Math.min(cats.length, want - nVerse);
  const picked = [...shuffle(verses).slice(0, nVerse), ...cats.slice(0, nCat)];
  for (const s of picked) await setProgress(s.id, cid, "start");
  return picked;
}
/** 本批会背完了（没有在学的卡）就拉下一批；今天页勾“会背了”之后、每天 8 点都会调用 */
async function topUpPool(cid){
  if (!S.hs.loaded || !S.hs.reviewLog || S.hs.settings.autoVerse === false || !S.hs.scriptures.length || stageOf(cid).key === "baby") return [];
  if (learningCards(cid).length) return [];
  const picked = await pullBatch(cid);
  if (picked.length) await savePool(cid, picked.map(s => s.id));
  return picked;
}
/** 一键换一批：还没碰过的在学卡整批换掉（练过的留着）。先拉到新的才清旧的，卡库没有别的可换就什么都不动 */
async function swapBatch(cid){
  const untouched = learningCards(cid).filter(x => !x.p.last_on), keep = learningCards(cid).filter(x => x.p.last_on);
  const cfg = poolCfg(), want = Math.max(untouched.length, cfg.batch - keep.length);
  const picked = await pullBatch(cid, want, new Set(untouched.map(x => x.s.id)));
  if (!picked.length) return 0;
  for (const x of untouched) await setProgress(x.s.id, cid, "reset");
  await savePool(cid, [...keep.map(x => x.s.id), ...picked.map(s => s.id)]);
  return picked.length;
}

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
  if (isOffDay(day)) return 0; // 休息日、假期不生成
  const rows = S.hs.routines
    .filter(r => r.active && (r.weekdays || []).includes(wd) && !S.hs.tasks.some(t => t.routine_id === r.id && t.date === day))
    .map(r => ({ family_id: fid(), id: `${r.id}@${day}`, child_id: r.child_id, date: day, title: r.title, subject: r.subject, routine_id: r.id, status: "todo", minutes: null, note: "" }));
  if (!rows.length) return 0;
  const { data, error } = await SB.client.from("hs_tasks").upsert(rows, { onConflict: "family_id,id", ignoreDuplicates: true }).select();
  if (error) { console.error(error); return 0; }
  (data || []).forEach(t => put(S.hs.tasks, t)); return (data || []).length;
}
/** 补记：把过去某一天按周例行该有的任务补出来（忘了开 app 那几天没有生成）。id 是固定的，已有的不会重复；休息日不补；返回新增条数 */
async function ensureTasksForDay(day){
  if (isOffDay(day)) return 0;
  const wd = new Date(day + "T12:00:00").getDay();
  const rows = S.hs.routines.filter(r => r.active && (r.weekdays || []).includes(wd))
    .map(r => ({ family_id: fid(), id: `${r.id}@${day}`, child_id: r.child_id, date: day, title: r.title, subject: r.subject, routine_id: r.id, status: "todo", minutes: null, note: "" }));
  if (!rows.length) return 0;
  const { data, error } = await SB.client.from("hs_tasks").upsert(rows, { onConflict: "family_id,id", ignoreDuplicates: true }).select();
  if (error) { console.error(error); toast(tr("补出任务失败")); return 0; }
  delete S.hs.ranges[day.slice(0, 7)];   // 日历按月缓存：丢掉让它重新读
  (data || []).forEach(x => put(S.hs.tasks, x));
  return (data || []).length;
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
  const t = S.hs.tasks.find(x => x.id === id) || Object.values(S.hs.ranges).flatMap(r => r.tasks || []).find(x => x.id === id); if (!t) return;   // 超过 7 天的任务只在日历的月数据里
  const r = t.routine_id && routine(t.routine_id);
  // 补记过去某天的任务：完成时间记成那天中午，回写小月亮和报告都落在那一天
  const doneAt = t.date && t.date < today() ? new Date(t.date + "T12:00:00").toISOString() : new Date().toISOString();
  const saved = await upsertTask({ ...t, status, done_at: status === "done" ? doneAt : null, minutes: status === "done" && t.minutes == null && r ? r.minutes : t.minutes });
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
  if (S.hs.pacing) { row.weeks = u.weeks == null || u.weeks === "" ? null : +u.weeks; row.start_on = u.start_on || null; row.term = u.term == null || u.term === "" ? null : +u.term; }
  if (S.hs.tplCol) row.tpl = u.tpl || null;
  return put(S.hs.units, await run(SB.client.from("hs_units").upsert(row).select().single()));
}

/* ---- 课程库：按阶段、领域的单元链，生成下一单元 ---- */
const tplKey = (stage, subject, i) => `${stage}/${subject}/${i}`;
const unitsOfChild = cid => S.hs.units.filter(u => u.child_id === cid || !u.child_id);
const unitDone = u => { const p = unitProgress(u.id); return p.total > 0 && p.done === p.total; };
// 一个领域可以有几条并行轨道（如语言的英文、中文），各自有“下一单元”
function nextInChain(subject, cid){
  const stage = chainStage(stageOf(cid).key), chain = ((CURRICULUM[stage] || {}).subjects || {})[subject] || [];
  const mine = unitsOfChild(cid), trackOf = i => chain[i][3] || "";
  const applied = i => mine.some(u => u.tpl === tplKey(stage, subject, i) || u.title === chain[i][0]);
  const tracks = [...new Set(chain.map((_, i) => trackOf(i)))].map(track => {
    const idx = chain.findIndex((_, i) => trackOf(i) === track && !applied(i));
    const total = chain.filter((_, i) => trackOf(i) === track).length, done = chain.filter((_, i) => trackOf(i) === track && applied(i)).length;
    return idx < 0 ? { track, total, applied: done, next: null } : { track, total, applied: done, next: { index: idx, title: chain[idx][0], weeks: chain[idx][1], lessons: chain[idx][2] } };
  });
  const first = tracks.find(t => t.next);
  return { stage, stageName: (CURRICULUM[stage] || {}).name, total: chain.length, applied: chain.filter((_, i) => applied(i)).length, tracks, next: first ? first.next : null };
}
// 这条轨道上有没有还没做完的单元（tpl 为空的手写单元算在默认轨道）
function trackBusy(subject, cid, track, stage){
  const chain = ((CURRICULUM[stage] || {}).subjects || {})[subject] || [];
  return unitsOfChild(cid).some(u => { if (u.subject !== subject || !u.active || unitDone(u)) return false; const m = u.tpl && u.tpl.match(/\/(\d+)$/); const tr = m && chain[+m[1]] ? (chain[+m[1]][3] || "") : ""; return tr === track; });
}
async function insertLessons(unitId, lessons){
  if (!lessons.length) return [];
  const rows = lessons.map(([title, faith_note, verse_ref], i) => ({ family_id: fid(), id: newId() + i.toString(36), unit_id: unitId, title, faith_note: faith_note || "", verse_ref: verse_ref || "", status: "planned", sort: i, note: "" }));
  const data = await run(SB.client.from("hs_lessons").insert(rows).select()); S.hs.lessons.push(...data); return data;
}
async function generateNext(subject, cid, track){
  const c = nextInChain(subject, cid);
  const t = (track != null ? c.tracks.find(x => x.track === track) : c.tracks.find(x => x.next)); if (!t || !t.next) return null;
  const yi = yearInfo();
  const u = await upsertUnit({ child_id: cid, subject, title: t.next.title, weeks: t.next.weeks, start_on: today(), term: yi ? yi.term : null, tpl: tplKey(c.stage, subject, t.next.index) });
  await insertLessons(u.id, t.next.lessons);
  return u;
}
// 每个领域的每条轨道：没有进行中的单元就生成下一单元
async function generateRound(cid){
  let n = 0;
  for (const subject of Object.keys(SUBJECTS)) {
    const c = nextInChain(subject, cid);
    for (const t of c.tracks) { if (!t.next || trackBusy(subject, cid, t.track, c.stage)) continue; if (await generateNext(subject, cid, t.track)) n++; }
  }
  return n;
}
// 粘贴教材目录：一行一课，“标题 | 经文” 或 Tab 分隔
async function importOutline({ subject, title, weeks, text, child_id }){
  const lessons = (text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = l.split(/\t|\|/); return [m[0].trim(), (m[2] || "").trim(), (m[1] || "").trim()]; });
  if (!title || !lessons.length) return null;
  const yi = yearInfo();
  const u = await upsertUnit({ child_id: child_id || cid0(), subject, title, weeks: weeks || null, start_on: today(), term: yi ? yi.term : null });
  await insertLessons(u.id, lessons);
  return { unit: u, count: lessons.length };
}
const cid0 = () => S.childId;
// 年度范围表里的一行 → 一个空单元（课时之后按自家教材填）
async function addScopeUnit(subject, title, weeks, term, childId){
  if (S.hs.units.some(u => u.title === title && (u.child_id === childId || !u.child_id))) return null;
  const yi = yearInfo();
  return upsertUnit({ subject, title, weeks, term, child_id: childId, start_on: yi && yi.term === term ? today() : null });
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
  if (status === "done") await touchUnitStart(l.unit_id);
}
// 把课时排进某一天：生成一条挂着 lesson_id 的任务；任务完成即课时完成
async function scheduleLesson(id, date = today()){
  const l = lesson(id), u = l && unit(l.unit_id); if (!l || !u) return null;
  await touchUnitStart(u.id);
  return upsertTask({ id: `${l.id}@${date}`, child_id: u.child_id || S.childId, date, title: l.title, subject: u.subject, lesson_id: l.id, status: "todo", note: l.verse_ref ? `经文 ${l.verse_ref}` : "" });
}
// 旧名字保留：套用起步课程 = 生成本阶段第一轮
const applyCourseTemplate = (_key, childId) => generateRound(childId);

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

export { INTERVALS, ensureTasksForDay, loadAll, refreshIfNewDay, saveSettings, planState, currentPlan, todayPassage, choosePlan, importPlan, devotionDraft, saveDevotion,
  upsertScripture, deleteScripture, importSeedScriptures, scripture, defaultVersions, fetchVersions, fetchBoth, generateCards, verseSet, importCatechism, importChildrensCatechism, ccMissing, ccPending, markCatechismReviewed, progressOf, setProgress, dueReviews, learningCards, learnedCount, todayPlan, nextToStart, autoAssignVerses, swapVerse, swapBatch, topUpPool, poolOf, poolCfg, addExtraReview,
  upsertRoutine, deleteRoutine, applyTemplate, routine, ensureTodayTasks, tasksFor, upsertTask, setTaskStatus, moveTask, deleteTask, attachRealtime,
  unit, lesson, unitLessons, unitProgress, upsertUnit, deleteUnit, upsertLesson, deleteLesson, setLessonStatus, scheduleLesson, applyCourseTemplate,
  upsertGoal, deleteGoal, toggleGoal, applyGoalTemplate, upsertResource, deleteResource, importSeedResources,
  monthRange, ensureMonth, monthData, toggleDayOff, mirrorKind,
  yearInfo, inBreak, isOffDay, saveYear, unitPace, addScopeUnit,
  nextInChain, generateNext, generateRound, importOutline, unitDone };
