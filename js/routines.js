import { t, tc } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { ROUTINE_TEMPLATES } from "./data/seeds.js";
import { WEEKDAYS, subject, weekdayLabel } from "./data/subjects.js";
import { ensureMonth, monthData, monthRange, routine, scripture } from "./hs.js";
import { render } from "./views.js";
import { mrow } from "./me.js";

/* ============ 日历：入口页 = 月历（敬拜与任务完成情况、休息日）+ 周例行入口；子页 = 周例行 ============ */
S.calMonth = S.calMonth || dayKey(Date.now()).slice(0, 7);
S.calDay = S.calDay || null;

function viewRoutines(){
  const cid = S.childId, mine = S.hs.routines.filter(r => r.child_id == null || r.child_id === cid), on = mine.filter(r => r.active);
  const wd = new Date().getDay(), todayN = on.filter(r => (r.weekdays || []).includes(wd)).length;
  return monthHTML() + `<div class="panel mlist" style="margin-top:12px">${mrow('data-tab="cal-routines"', t("周例行"), on.length ? t("{a} 项启用 · 今天 {b} 项", { a: on.length, b: todayN }) + (mine.length > on.length ? ` · ${t("停用 {n}", { n: mine.length - on.length })}` : "") : t("还没有例行安排，进去套用一个模板"), "▦")}</div>`;
}
function viewCalRoutines(){ return routinesHTML(); }

function monthHTML(){
  const ym = S.calMonth, cid = S.childId, today = dayKey(Date.now());
  const [y, m] = ym.split("-").map(Number), { days } = monthRange(ym), first = new Date(y, m - 1, 1).getDay();
  const md = monthData(ym); if (!md) ensureMonth(ym).then(render);
  const off = new Set(S.hs.settings.daysOff || []);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<span class="cell pad"></span>`);
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const ts = md ? md.tasks.filter(x => x.date === date && (x.child_id == null || x.child_id === cid)) : [];
    const done = ts.filter(x => x.status === "done").length, devo = md && md.devotions.find(x => x.date === date && x.done);
    cells.push(`<button class="cell ${date === today ? "today" : ""} ${off.has(date) ? "off" : ""} ${S.calDay === date ? "sel" : ""}" data-act="cal-day" data-date="${date}" aria-label="${date}${devo ? `，${t("敬拜")}` : ""}${ts.length ? `，${t("任务")} ${done}/${ts.length}` : ""}${off.has(date) ? `，${t("休息日")}` : ""}">
      <span class="d">${d}</span>${devo ? `<span class="devo-dot" aria-hidden="true"></span>` : ""}${ts.length ? `<span class="n">${done}/${ts.length}</span>` : ""}</button>`);
  }
  const sel = S.calDay && md ? md.tasks.filter(x => x.date === S.calDay && (x.child_id == null || x.child_id === cid)) : [];
  // 补记：今天和过去的日子可以直接勾 / 补出任务 / 补记背诵；未来的只看
  const canFix = !!S.calDay && S.calDay <= today && !off.has(S.calDay);
  const wdSel = S.calDay ? new Date(S.calDay + "T12:00:00").getDay() : 0;
  const missing = canFix && md ? S.hs.routines.filter(r => r.active && (r.weekdays || []).includes(wdSel) && (r.child_id == null || r.child_id === cid) && !md.tasks.some(x => x.routine_id === r.id && x.date === S.calDay)).length : 0;
  const verseDone = S.calDay ? S.hs.progress.filter(p => p.child_id === cid && p.last_on === S.calDay).map(p => ({ p, s: scripture(p.scripture_id) })).filter(x => x.s) : [];
  const status = x => x.status === "done" ? `${t("完成")}${x.minutes ? ` ${t("{n} 分钟", { n: x.minutes })}` : ""}` : x.status === "skip" ? t("跳过") : t("待做");
  return `<h2>${t("日历")} · ${esc(childName())}</h2>
  <div class="daynav"><button class="iconbtn" data-act="cal-prev" aria-label="${t("上个月")}">‹</button><b>${t("{y} 年 {m} 月", { y, m })}</b><button class="iconbtn" data-act="cal-next" aria-label="${t("下个月")}">›</button></div>
  <div class="chips" style="margin:0 0 6px;justify-content:flex-end"><span class="small muted" style="align-self:center">${t("打印")}</span><button class="chip" data-act="print-week">${t("本周")}</button><button class="chip" data-act="print-month" data-ym="${ym}">${t("{y} 年 {m} 月", { y, m })}</button></div>
  <div class="panel" style="padding:10px">
    <div class="month">${WEEKDAYS.map(w => `<span class="wd">${t("周" + w).replace(/^周/, "")}</span>`).join("")}${cells.join("")}</div>
    ${md ? "" : `<p class="small muted">${t("正在读取…")}</p>`}
    <div class="legend"><span style="--c:var(--sage)">${t("敬拜")}</span><span style="--c:var(--line)">${t("休息日")}</span></div>
    ${S.calDay ? `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><b>${S.calDay}</b> <span class="small muted">${off.has(S.calDay) ? t("休息日") : ""}</span>
      ${sel.length ? sel.map(x => `<div class="small cal-task" style="margin-top:4px"><span class="dotc" style="background:${subject(x.subject).color}"></span>${esc(x.title)} <span class="muted">· ${status(x)}</span>${canFix ? (x.status === "todo"
        ? `<span class="cal-acts"><button class="chip" data-act="task-done" data-tid="${esc(x.id)}">${t("补记完成")}</button><button class="chip" data-act="task-skip" data-tid="${esc(x.id)}">${t("跳过")}</button></span>`
        : `<span class="cal-acts"><button class="chip" data-act="task-undo" data-tid="${esc(x.id)}">${t("撤销")}</button></span>`) : ""}</div>`).join("") : `<p class="small muted" style="margin-top:4px">${t("这一天没有任务。")}</p>`}
      ${verseDone.length ? `<div class="small" style="margin-top:8px"><b>${t("背诵")}</b> ${verseDone.map(v => `${esc(v.s.ref)} ${v.p.last_result === "ok" ? "✓" : "↻"}`).join("、")}</div>` : ""}
      <div class="btns" style="margin-top:8px">${canFix && missing ? `<button class="chip" data-act="cal-gen" data-date="${S.calDay}">${t("按周例行补出这天的任务（{n} 条）", { n: missing })}</button>` : ""}${canFix ? `<button class="chip" data-act="bf-open" data-date="${S.calDay}">${t("补记背诵")}</button>` : ""}<button class="chip" data-act="dayoff-toggle" data-date="${S.calDay}">${off.has(S.calDay) ? t("取消休息日") : t("设为休息日（不生成任务）")}</button></div></div>` : `<p class="small muted" style="margin-top:8px">${t("点一天看任务，或把它设为休息日。教会年历预留在这里，暂未启用。")}</p>`}
  </div>`;
}

function routinesHTML(){
  const cid = S.childId;
  const mine = S.hs.routines.filter(r => r.child_id == null || r.child_id === cid);
  const byDay = d => mine.filter(r => (r.weekdays || []).includes(d)).sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || a.sort - b.sort);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const row = r => `<button class="routine ${r.active ? "" : "off"}" data-act="routine-edit" data-rid="${esc(r.id)}">
    <span class="t num">${esc(r.start || "—")}</span><span class="bar" style="background:${subject(r.subject).color}"></span>
    <span><span class="title">${esc(r.title)}</span><span class="meta">${esc(subject(r.subject).short)} · ${t("{n} 分钟", { n: r.minutes })}${r.child_id == null ? ` · ${t("全家")}` : ""}${r.active ? "" : ` · ${t("已停用")}`}</span></span></button>`;
  // 一次看一天：默认今天，‹ › 翻到前后一天，七个星期片直接跳（带条数），“整周”才把七天都铺开
  const today = new Date().getDay(), sel = S.routineDay == null ? today : S.routineDay, week = sel === "week";
  const idx = order.indexOf(week ? today : sel), prev = order[(idx + 6) % 7], next = order[(idx + 1) % 7];
  const dayBlock = d => { const rs = byDay(d); return rs.length ? `<div class="panel" style="padding:4px 8px">${rs.map(row).join("")}</div>` : `<div class="panel"><p class="muted" style="margin:0">${t("这天没有安排，休息。")}</p></div>`; };
  const total = rs => rs.reduce((a, r) => a + (r.active ? +r.minutes || 0 : 0), 0);
  // 操作置顶：添加 / 套用放底下的话要滚过整周才看得到
  return `<h2>${t("周例行")} · ${esc(childName())}</h2>
  <div class="btns" style="margin-top:0"><button class="btn primary" data-act="routine-add">＋ ${t("添加例行")}</button>${Object.entries(ROUTINE_TEMPLATES).map(([k, tp]) => `<button class="btn" data-act="template-apply" data-tpl="${k}">${t("套用：")}${tc(tp.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">${t("每天早上按这张表自动生成今日任务（休息日除外）。全家项（如家庭敬拜）对每个孩子都显示。")}${t("模板套用到当前孩子（{name}），全家项只加一次，重复套用不会重复。", { name: esc(childName()) })}</p>
  ${mine.length ? `
  <div class="chips wdstrip" role="group" aria-label="${t("星期")}">${order.map(d => { const n = byDay(d).length; return `<button class="chip" data-rday="${d}" aria-pressed="${!week && d === sel}" aria-label="${esc(weekdayLabel(d))}${n ? `，${t("{n} 项", { n })}` : ""}${d === today ? `，${t("今天")}` : ""}"><span>${esc(weekdayLabel(d).replace(/^周/, ""))}</span><small>${n || "·"}</small>${d === today ? `<i aria-hidden="true"></i>` : ""}</button>`; }).join("")}<button class="chip" data-rday="week" aria-pressed="${week}">${t("整周")}</button></div>
  ${week
    ? order.map(d => { const rs = byDay(d); return `<h3 class="small muted" style="margin-top:14px">${esc(weekdayLabel(d))}${d === today ? ` · ${t("今天")}` : ""}${rs.length ? ` · ${t("约 {n} 分钟", { n: total(rs) })}` : ` · ${t("休息")}`}</h3>${rs.length ? `<div class="panel" style="padding:4px 8px">${rs.map(row).join("")}</div>` : ""}`; }).join("")
    : `<div class="daynav" style="margin-top:4px"><button class="iconbtn" data-rday="${prev}" aria-label="${t("前一天")}">‹</button><b>${esc(weekdayLabel(sel))}${sel === today ? ` <span class="small muted">${t("今天")}</span>` : ""}${byDay(sel).length ? ` <span class="small muted">· ${t("{n} 项 · 约 {m} 分钟", { n: byDay(sel).length, m: total(byDay(sel)) })}</span>` : ""}</b><button class="iconbtn" data-rday="${next}" aria-label="${t("后一天")}">›</button></div>${dayBlock(sel)}`}`
    : `<div class="empty">${t("还没有例行安排。套用一个模板最快，之后再按自家情况改。")}</div>`}`;
}

export { viewRoutines, viewCalRoutines };
