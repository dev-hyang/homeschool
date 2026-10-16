import { loadChildren, sbAuth, sbFamily, sbLogout } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { S, childName, setChild } from "./core/state.js";
import { $, dayKey, toast } from "./core/util.js";
import { parsePlan } from "./data/plans.js";
import * as hs from "./hs.js";
import { setLawState } from "./law.js";
import { download, reportCSV, shiftMonth } from "./reports.js";
import { RES_LANGS, RES_TYPES } from "./resources.js";
import { childOpts, closeSheet, drawForm, getForm, openForm, openScriptures, openSettings, readForm, scriptureFields, subjectOpts, weekdayOpts } from "./sheet.js";
import { render, toggleKids } from "./views.js";

/* ============ 事件分发 ============ */
const close = () => closeSheet();
const back = (fn) => { close(); fn && fn(); };

document.addEventListener("click", async ev => {
  if (!$("#kids").hidden && !ev.target.closest("#bname")) toggleKids(false);
  const t = ev.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (t.id === "bname") { if (S.children.length) toggleKids(); else openSettings(); return; }
  if (d.tab) { close(); S.tab = d.tab; render(); window.scrollTo(0, 0); return; }
  if (d.kidsel) { setChild(d.kidsel); render(); $("#bname").focus(); return; }
  if (d.copy) { try { await navigator.clipboard.writeText(d.copy); toast("已复制：" + d.copy); } catch (e) { toast("请手动复制：" + d.copy); } return; }
  if (d.themeSet !== undefined) { if (d.themeSet) document.documentElement.dataset.theme = d.themeSet; else delete document.documentElement.dataset.theme; try { localStorage.setItem(LS_PREFIX + ".theme", d.themeSet); } catch (e) {} openSettings(); return; }
  // generic form controls
  if (d.seg) { readForm(); getForm().draft[d.seg] = d.v; drawForm(); return; }
  if (d.multi) { readForm(); const f = getForm().draft, cur = (f[d.multi] || []).map(String); f[d.multi] = cur.includes(d.v) ? cur.filter(x => x !== d.v) : [...cur, d.v]; drawForm(); return; }
  // devotion participants
  if (d.devochild) { const dv = hs.devotionDraft(), set = new Set(dv.children || []); set.has(d.devochild) ? set.delete(d.devochild) : set.add(d.devochild); await hs.saveDevotion({ children: [...set] }); render(); return; }
  if (d.plan) { await hs.choosePlan(d.plan); openSettings(); toast("已切换读经计划"); return; }
  if (d.state) { setLawState(d.state); render(); return; }
  if (d.subject) { S.courseSubject = d.subject; render(); return; }
  if (d.rf) { S.resFilter[d.rf] = d.v; render(); return; }

  try {
    switch (d.act) {
      case "settings": openSettings(); break;
      case "close": close(); break;
      case "sb-login": await sbAuth("login"); break;
      case "sb-signup": await sbAuth("signup"); break;
      case "sb-create": await sbFamily("create"); break;
      case "sb-join": await sbFamily("join"); break;
      case "sb-logout": await sbLogout(); break;

      /* 敬拜 */
      case "devo-done": await hs.saveDevotion({ done: true }); render(); toast("今日敬拜已记录"); break;
      case "devo-undo": await hs.saveDevotion({ done: false }); render(); break;
      case "devo-passage": openForm("今日读经", [{ k: "passage", label: "段落", type: "text", ph: "创世记 1" }, { k: "note", label: "备注", type: "text" }], { passage: hs.devotionDraft().passage, note: hs.devotionDraft().note }, async f => { await hs.saveDevotion({ passage: f.passage, note: f.note }); back(); }); break;
      case "devo-prayer": openForm("今天的祷告", [{ k: "prayer", label: "为谁、为什么祷告", type: "area", rows: 4 }], { prayer: hs.devotionDraft().prayer }, async f => { await hs.saveDevotion({ prayer: f.prayer }); back(); }); break;
      case "devo-hymn": openForm("本月诗歌", [{ k: "hymn", label: "诗歌名（可加链接或页码）", type: "text", ph: "耶稣爱我 Jesus Loves Me" }], { hymn: S.hs.settings.hymn || "" }, async f => { await hs.saveSettings({ hymn: f.hymn }); back(); }); break;
      case "devo-verse": openScriptures(); break;

      /* 背诵 */
      case "review-remember": await hs.setProgress(d.sid, S.childId, "remember"); render(); toast("下次复习已排好"); break;
      case "review-again": await hs.setProgress(d.sid, S.childId, "again"); render(); break;
      case "learn-done": await hs.setProgress(d.sid, S.childId, "learned"); render(); toast(`${childName()}会背了，3 天后复习`); break;
      case "scriptures": openScriptures(); break;
      case "seed-scriptures": { const n = await hs.importSeedScriptures(); toast(n ? `已导入 ${n} 张经文卡` : "起步经文卡都已经在库里了"); openScriptures(); break; }
      case "scr-start": await hs.setProgress(d.sid, S.childId, "start"); openScriptures(); break;
      case "scr-reset": await hs.setProgress(d.sid, S.childId, "reset"); openScriptures(); break;
      case "scr-week": await hs.saveSettings({ weekVerse: S.hs.settings.weekVerse === d.sid ? null : d.sid }); openScriptures(); break;
      case "scr-add": openForm("新经文卡", scriptureFields, { kind: "verse", source: "和合本 / ESV" }, async f => { if (!f.ref) { toast("请填出处"); return; } await hs.upsertScripture(f); openScriptures(); }); break;
      case "scr-edit": { const s = hs.scripture(d.sid); openForm("编辑经文卡", scriptureFields, s, async f => { await hs.upsertScripture({ ...s, ...f }); openScriptures(); }, async () => { if (confirm("删除这张经文卡？所有孩子的进度一起删除。")) { await hs.deleteScripture(s.id); openScriptures(); } }); break; }

      /* 读经计划 */
      case "plan-import": openForm("导入读经计划", [{ k: "name", label: "计划名称", type: "text", ph: "教会 2027 年读经计划" }, { k: "text", label: "每行一段：出处，备注（可选）。也可粘贴 JSON", type: "area", rows: 10, ph: "创世记 1，神创造天地\n创世记 2，伊甸园" }], { name: "", text: "" }, async f => { const items = parsePlan(f.text); if (!items.length) { toast("没有读到任何段落"); return; } await hs.importPlan(f.name, items); toast(`已导入 ${items.length} 段并切换到该计划`); openSettings(); }); break;
      case "plan-restart": { const st = hs.planState(), p = hs.currentPlan(); await hs.saveSettings({ plan: { id: st.id, progress: { ...st.progress, [p.id]: 0 } } }); openSettings(); break; }

      /* 任务 */
      case "task-done": await hs.setTaskStatus(d.tid, "done"); render(); break;
      case "task-skip": await hs.setTaskStatus(d.tid, "skip"); render(); break;
      case "task-undo": await hs.setTaskStatus(d.tid, "todo"); render(); break;
      case "task-move": await hs.moveTask(d.tid); render(); toast("已顺延到明天"); break;
      case "task-add": openForm("临时任务", [
          { k: "title", label: "做什么", type: "text", ph: "读一本关于秋天的绘本" }, { k: "subject", label: "领域", type: "seg", opts: subjectOpts },
          { k: "child_id", label: "给谁", type: "seg", opts: childOpts(true) }, { k: "minutes", label: "大约几分钟", type: "num" }, { k: "date", label: "哪一天", type: "date" }],
        { title: "", subject: "language", child_id: S.childId, minutes: null, date: dayKey(Date.now()) },
        async f => { if (!f.title) { toast("请填内容"); return; } await hs.upsertTask(f); back(); }); break;
      case "task-edit": { const tk = S.hs.tasks.find(x => x.id === d.tid); if (!tk) break;
        openForm("任务", [{ k: "title", label: "做什么", type: "text" }, { k: "subject", label: "领域", type: "seg", opts: subjectOpts }, { k: "minutes", label: "实际几分钟", type: "num" }, { k: "note", label: "一句记录（学了什么、表现如何）", type: "area" }],
          tk, async f => { await hs.upsertTask({ ...tk, ...f }); back(); }, async () => { await hs.deleteTask(tk.id); back(); }); break; }

      /* 周例行 */
      case "routine-add": openForm("添加例行", routineFields(), { title: "", subject: "bible", child_id: S.childId, weekdays: [1, 2, 3, 4, 5], start: "", minutes: 15, active: true }, async f => { if (!f.title) { toast("请填内容"); return; } await hs.upsertRoutine(f); back(); }); break;
      case "routine-edit": { const r = hs.routine(d.rid); if (!r) break;
        openForm("编辑例行", routineFields(), { ...r, child_id: r.child_id || "" }, async f => { await hs.upsertRoutine({ ...r, ...f }); back(); }, async () => { if (confirm("删除这条例行？今天还没做的对应任务一起删除。")) { await hs.deleteRoutine(r.id); back(); } }); break; }
      case "template-apply": { const n = await hs.applyTemplate(d.tpl, S.childId); render(); toast(n ? `已套用 ${n} 条例行到${childName()}` : "模板里的内容都已经有了"); break; }

      /* 课程 */
      case "course-template": { const n = await hs.applyCourseTemplate(d.tpl, S.childId); render(); toast(n ? `已套用 ${n} 个单元` : "起步课程都已经有了"); break; }
      case "unit-add": openForm("新单元", unitFields(), { subject: S.courseSubject, title: "", note: "", child_id: S.childId, active: true }, async f => { if (!f.title) { toast("请填单元名"); return; } await hs.upsertUnit(f); S.courseSubject = f.subject; back(); }); break;
      case "unit-edit": { const u = hs.unit(d.uid); if (!u) break;
        openForm("编辑单元", unitFields(), { ...u, child_id: u.child_id || "" }, async f => { await hs.upsertUnit({ ...u, ...f }); S.courseSubject = f.subject; back(); }, async () => { if (confirm("删除这个单元和它的全部课时？")) { await hs.deleteUnit(u.id); back(); } }); break; }
      case "lesson-add": openForm("新课时", lessonFields(), { unit_id: d.uid, title: "", faith_note: "", verse_ref: "", note: "" }, async f => { if (!f.title) { toast("请填课时名"); return; } await hs.upsertLesson(f); back(); }); break;
      case "lesson-edit": { const l = hs.lesson(d.lid); if (!l) break;
        openForm("编辑课时", [...lessonFields(), { k: "minutes", label: "用时（分钟）", type: "num" }], l, async f => { await hs.upsertLesson({ ...l, ...f }); back(); }, async () => { await hs.deleteLesson(l.id); back(); }); break; }
      case "lesson-schedule": { const t = await hs.scheduleLesson(d.lid); render(); toast(t ? "已排进今天的任务" : "没能排进去"); break; }
      case "lesson-done": await hs.setLessonStatus(d.lid, "done"); render(); break;
      case "lesson-undo": await hs.setLessonStatus(d.lid, "planned"); render(); break;

      /* 目标 */
      case "goal-template": { const n = await hs.applyGoalTemplate(d.tpl, S.childId); render(); toast(n ? `已添加 ${n} 个目标` : "这些目标都已经在了"); break; }
      case "goal-add": openForm("新目标", goalFields(), { area: "bible", title: "", target_on: "", evidence: "" }, async f => { if (!f.title) { toast("请填目标"); return; } await hs.upsertGoal(f); back(); }); break;
      case "goal-edit": { const g = S.hs.goals.find(x => x.id === d.gid); if (!g) break;
        openForm("编辑目标", [...goalFields(), { k: "achieved_on", label: "达成日期（空 = 未达成）", type: "date" }], g, async f => { await hs.upsertGoal({ ...g, ...f }); back(); }, async () => { await hs.deleteGoal(g.id); back(); }); break; }
      case "goal-toggle": await hs.toggleGoal(d.gid); render(); break;

      /* 资源 */
      case "seed-resources": { const n = await hs.importSeedResources(); render(); toast(n ? `已导入 ${n} 条资源` : "起步资源都已经在库里了"); break; }
      case "res-add": openForm("新资源", resourceFields(), { type: "link", lang: "zh", subject: "", title: "", url: "", source: "", tags: "", note: "" }, async f => { if (!f.title) { toast("请填名称"); return; } await hs.upsertResource(f); back(); }); break;
      case "res-edit": { const r = S.hs.resources.find(x => x.id === d.rid); if (!r) break;
        openForm("编辑资源", resourceFields(), { ...r, tags: (r.tags || []).join(", ") }, async f => { await hs.upsertResource({ ...r, ...f }); back(); }, async () => { await hs.deleteResource(r.id); back(); }); break; }

      /* 日历与报告 */
      case "cal-prev": S.calMonth = shiftMonth(S.calMonth, -1); S.calDay = null; render(); break;
      case "cal-next": S.calMonth = shiftMonth(S.calMonth, 1); S.calDay = null; render(); break;
      case "cal-day": S.calDay = S.calDay === d.date ? null : d.date; render(); break;
      case "dayoff-toggle": await hs.toggleDayOff(d.date); render(); break;
      case "report-prev": S.reportMonth = shiftMonth(S.reportMonth, -1); render(); break;
      case "report-next": S.reportMonth = shiftMonth(S.reportMonth, 1); render(); break;
      case "report-csv": { const csv = reportCSV(S.reportMonth, S.childId); if (csv) download(`家庭学堂-${childName()}-${S.reportMonth}.csv`, csv); break; }
      case "mirror-toggle": await hs.saveSettings({ mirror: !S.hs.settings.mirror }); openSettings(); break;

      /* 表单 */
      case "form-save": { readForm(); const f = getForm(); await f.onSave(f.draft); break; }
      case "form-delete": { const f = getForm(); if (f.onDelete) await f.onDelete(); break; }
    }
  } catch (e) { /* run() already toasted; keep the page usable */ }
});
const unitFields = () => [
  { k: "title", label: "单元名", type: "text", ph: "数到 10" }, { k: "subject", label: "领域", type: "seg", opts: subjectOpts },
  { k: "child_id", label: "给谁", type: "seg", opts: childOpts(true) }, { k: "note", label: "说明（可空）", type: "text" }, { k: "active", label: "进行中", type: "check" }];
const lessonFields = () => [
  { k: "title", label: "课时", type: "text", ph: "认识 1、2、3" }, { k: "faith_note", label: "信仰连接（一句话）", type: "text", ph: "一位神，三个位格" },
  { k: "verse_ref", label: "关联经文", type: "text", ph: "申命记 6:4" }, { k: "note", label: "备注", type: "area" }];
const goalFields = () => [
  { k: "title", label: "目标", type: "text", ph: "能数到 20" }, { k: "area", label: "领域", type: "seg", opts: subjectOpts },
  { k: "target_on", label: "希望何时达成（可空）", type: "date" }, { k: "evidence", label: "证据 / 备注", type: "text", ph: "10 月 16 日数给外婆听" }];
const resourceFields = () => [
  { k: "title", label: "名称", type: "text" }, { k: "url", label: "链接", type: "text", ph: "https://" },
  { k: "type", label: "类型", type: "seg", opts: Object.entries(RES_TYPES) }, { k: "lang", label: "语言", type: "seg", opts: Object.entries(RES_LANGS) },
  { k: "subject", label: "领域（可不选）", type: "seg", opts: [["", "跨领域"], ...subjectOpts] },
  { k: "age_min", label: "适合年龄从（岁）", type: "num" }, { k: "age_max", label: "到（岁）", type: "num" },
  { k: "source", label: "推荐来源", type: "text", ph: "吹号者 / AmblesideOnline" }, { k: "tags", label: "标签（逗号分隔）", type: "text" }, { k: "note", label: "一句备注", type: "area" }];
function routineFields(){
  return [
    { k: "title", label: "做什么", type: "text", ph: "英文拼读" }, { k: "subject", label: "领域", type: "seg", opts: subjectOpts },
    { k: "child_id", label: "给谁", type: "seg", opts: childOpts(true) }, { k: "weekdays", label: "哪几天", type: "multi", opts: weekdayOpts },
    { k: "start", label: "开始时间（可空）", type: "time" }, { k: "minutes", label: "大约几分钟", type: "num" }, { k: "active", label: "启用", type: "check" }
  ];
}
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#kids").hidden) { toggleKids(false); $("#bname").focus(); }
  else if ($("#sheet").open) closeSheet();
});
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && S.cloud === "ready") { await loadChildren(); await hs.refreshIfNewDay(); render(); }
});
