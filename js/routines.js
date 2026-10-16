import { S, childName } from "./core/state.js";
import { esc } from "./core/util.js";
import { ROUTINE_TEMPLATES } from "./data/seeds.js";
import { WEEKDAYS, subject } from "./data/subjects.js";

/* ============ 日历页（阶段 1 先放周例行；月历在阶段 3） ============ */
function viewRoutines(){
  const cid = S.childId;
  const mine = S.hs.routines.filter(r => r.child_id == null || r.child_id === cid);
  const byDay = d => mine.filter(r => (r.weekdays || []).includes(d)).sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || a.sort - b.sort);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const row = r => `<button class="routine ${r.active ? "" : "off"}" data-act="routine-edit" data-rid="${esc(r.id)}">
    <span class="t num">${esc(r.start || "—")}</span><span class="bar" style="background:${subject(r.subject).color}"></span>
    <span><span class="title">${esc(r.title)}</span><span class="meta">${subject(r.subject).short} · ${r.minutes} 分钟${r.child_id == null ? " · 全家" : ""}${r.active ? "" : " · 已停用"}</span></span></button>`;
  return `<h2>周例行 · ${esc(childName())}</h2>
  <p class="small muted">每天早上按这张表自动生成今日任务。全家项（如家庭敬拜）对每个孩子都显示。</p>
  ${mine.length ? order.map(d => { const rs = byDay(d); return `<h3 class="small muted" style="margin-top:14px">周${WEEKDAYS[d]}${rs.length ? "" : " · 休息"}</h3>${rs.length ? `<div class="panel" style="padding:4px 8px">${rs.map(row).join("")}</div>` : ""}`; }).join("")
    : `<div class="empty">还没有例行安排。套用一个模板最快，之后再按自家情况改。</div>`}
  <div class="btns"><button class="btn primary" data-act="routine-add">＋ 添加例行</button>${Object.entries(ROUTINE_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="template-apply" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">模板套用到当前孩子（${esc(childName())}），全家项只加一次。月历和教会年历在阶段 3 加入。</p>`;
}

export { viewRoutines };
