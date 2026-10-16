import { S, childName } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { ROUTINE_TEMPLATES } from "./data/seeds.js";
import { WEEKDAYS, subject } from "./data/subjects.js";
import { ensureMonth, monthData, monthRange, routine } from "./hs.js";
import { render } from "./views.js";

/* ============ 日历页：月历（敬拜与任务完成情况、休息日）+ 周例行 ============ */
S.calMonth = S.calMonth || dayKey(Date.now()).slice(0, 7);
S.calDay = S.calDay || null;

function viewRoutines(){ return monthHTML() + routinesHTML(); }

function monthHTML(){
  const ym = S.calMonth, cid = S.childId, today = dayKey(Date.now());
  const [y, m] = ym.split("-").map(Number), { days } = monthRange(ym), first = new Date(y, m - 1, 1).getDay();
  const md = monthData(ym); if (!md) ensureMonth(ym).then(render);
  const off = new Set(S.hs.settings.daysOff || []);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<span class="cell pad"></span>`);
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const ts = md ? md.tasks.filter(t => t.date === date && (t.child_id == null || t.child_id === cid)) : [];
    const done = ts.filter(t => t.status === "done").length, devo = md && md.devotions.find(x => x.date === date && x.done);
    cells.push(`<button class="cell ${date === today ? "today" : ""} ${off.has(date) ? "off" : ""} ${S.calDay === date ? "sel" : ""}" data-act="cal-day" data-date="${date}" aria-label="${date}${devo ? "，敬拜" : ""}${ts.length ? `，任务 ${done}/${ts.length}` : ""}${off.has(date) ? "，休息日" : ""}">
      <span class="d">${d}</span>${devo ? `<span class="devo-dot" aria-hidden="true"></span>` : ""}${ts.length ? `<span class="n">${done}/${ts.length}</span>` : ""}</button>`);
  }
  const sel = S.calDay && md ? md.tasks.filter(t => t.date === S.calDay && (t.child_id == null || t.child_id === cid)) : [];
  return `<h2>日历 · ${esc(childName())}</h2>
  <div class="daynav"><button class="iconbtn" data-act="cal-prev" aria-label="上个月">‹</button><b>${y} 年 ${m} 月</b><button class="iconbtn" data-act="cal-next" aria-label="下个月">›</button></div>
  <div class="panel" style="padding:10px">
    <div class="month"><span class="wd">日</span><span class="wd">一</span><span class="wd">二</span><span class="wd">三</span><span class="wd">四</span><span class="wd">五</span><span class="wd">六</span>${cells.join("")}</div>
    ${md ? "" : `<p class="small muted">正在读取…</p>`}
    <div class="legend"><span style="--c:var(--sage)">敬拜</span><span style="--c:var(--line)">休息日</span></div>
    ${S.calDay ? `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><b>${S.calDay}</b> <span class="small muted">${off.has(S.calDay) ? "休息日" : ""}</span>
      ${sel.length ? sel.map(t => `<div class="small" style="margin-top:4px"><span class="dotc" style="background:${subject(t.subject).color}"></span>${esc(t.title)} <span class="muted">· ${t.status === "done" ? `完成${t.minutes ? ` ${t.minutes} 分钟` : ""}` : t.status === "skip" ? "跳过" : "待做"}</span></div>`).join("") : `<p class="small muted" style="margin-top:4px">这一天没有任务。</p>`}
      <div class="btns" style="margin-top:8px"><button class="chip" data-act="dayoff-toggle" data-date="${S.calDay}">${off.has(S.calDay) ? "取消休息日" : "设为休息日（不生成任务）"}</button></div></div>` : `<p class="small muted" style="margin-top:8px">点一天看任务，或把它设为休息日。教会年历预留在这里，暂未启用。</p>`}
  </div>`;
}

function routinesHTML(){
  const cid = S.childId;
  const mine = S.hs.routines.filter(r => r.child_id == null || r.child_id === cid);
  const byDay = d => mine.filter(r => (r.weekdays || []).includes(d)).sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || a.sort - b.sort);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const row = r => `<button class="routine ${r.active ? "" : "off"}" data-act="routine-edit" data-rid="${esc(r.id)}">
    <span class="t num">${esc(r.start || "—")}</span><span class="bar" style="background:${subject(r.subject).color}"></span>
    <span><span class="title">${esc(r.title)}</span><span class="meta">${subject(r.subject).short} · ${r.minutes} 分钟${r.child_id == null ? " · 全家" : ""}${r.active ? "" : " · 已停用"}</span></span></button>`;
  return `<h2>周例行 · ${esc(childName())}</h2>
  <p class="small muted">每天早上按这张表自动生成今日任务（休息日除外）。全家项（如家庭敬拜）对每个孩子都显示。</p>
  ${mine.length ? order.map(d => { const rs = byDay(d); return `<h3 class="small muted" style="margin-top:14px">周${WEEKDAYS[d]}${rs.length ? "" : " · 休息"}</h3>${rs.length ? `<div class="panel" style="padding:4px 8px">${rs.map(row).join("")}</div>` : ""}`; }).join("")
    : `<div class="empty">还没有例行安排。套用一个模板最快，之后再按自家情况改。</div>`}
  <div class="btns"><button class="btn primary" data-act="routine-add">＋ 添加例行</button>${Object.entries(ROUTINE_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="template-apply" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">模板套用到当前孩子（${esc(childName())}），全家项只加一次，重复套用不会重复。</p>`;
}

export { viewRoutines };
