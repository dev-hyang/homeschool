import { loadChildren, sbAuth, sbFamily, sbLogout } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { S, childName, setChild } from "./core/state.js";
import { $, dayKey, toast } from "./core/util.js";
import { parsePlan } from "./data/plans.js";
import * as hs from "./hs.js";
import { setLawState } from "./law.js";
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

      /* 表单 */
      case "form-save": { readForm(); const f = getForm(); await f.onSave(f.draft); break; }
      case "form-delete": { const f = getForm(); if (f.onDelete) await f.onDelete(); break; }
    }
  } catch (e) { /* run() already toasted; keep the page usable */ }
});
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
