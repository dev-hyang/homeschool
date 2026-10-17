import { t, tc } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { ROUTINE_TEMPLATES } from "./data/seeds.js";
import { WEEKDAYS, subject, weekdayLabel } from "./data/subjects.js";
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
    const ts = md ? md.tasks.filter(x => x.date === date && (x.child_id == null || x.child_id === cid)) : [];
    const done = ts.filter(x => x.status === "done").length, devo = md && md.devotions.find(x => x.date === date && x.done);
    cells.push(`<button class="cell ${date === today ? "today" : ""} ${off.has(date) ? "off" : ""} ${S.calDay === date ? "sel" : ""}" data-act="cal-day" data-date="${date}" aria-label="${date}${devo ? `，${t("敬拜")}` : ""}${ts.length ? `，${t("任务")} ${done}/${ts.length}` : ""}${off.has(date) ? `，${t("休息日")}` : ""}">
      <span class="d">${d}</span>${devo ? `<span class="devo-dot" aria-hidden="true"></span>` : ""}${ts.length ? `<span class="n">${done}/${ts.length}</span>` : ""}</button>`);
  }
  const sel = S.calDay && md ? md.tasks.filter(x => x.date === S.calDay && (x.child_id == null || x.child_id === cid)) : [];
  const status = x => x.status === "done" ? `${t("完成")}${x.minutes ? ` ${t("{n} 分钟", { n: x.minutes })}` : ""}` : x.status === "skip" ? t("跳过") : t("待做");
  return `<h2>${t("日历")} · ${esc(childName())}</h2>
  <div class="daynav"><button class="iconbtn" data-act="cal-prev" aria-label="${t("上个月")}">‹</button><b>${t("{y} 年 {m} 月", { y, m })}</b><button class="iconbtn" data-act="cal-next" aria-label="${t("下个月")}">›</button></div>
  <div class="chips" style="margin:0 0 6px;justify-content:flex-end"><span class="small muted" style="align-self:center">${t("打印")}</span><button class="chip" data-act="print-week">${t("本周")}</button><button class="chip" data-act="print-month" data-ym="${ym}">${t("{y} 年 {m} 月", { y, m })}</button></div>
  <div class="panel" style="padding:10px">
    <div class="month">${WEEKDAYS.map(w => `<span class="wd">${t("周" + w).replace(/^周/, "")}</span>`).join("")}${cells.join("")}</div>
    ${md ? "" : `<p class="small muted">${t("正在读取…")}</p>`}
    <div class="legend"><span style="--c:var(--sage)">${t("敬拜")}</span><span style="--c:var(--line)">${t("休息日")}</span></div>
    ${S.calDay ? `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><b>${S.calDay}</b> <span class="small muted">${off.has(S.calDay) ? t("休息日") : ""}</span>
      ${sel.length ? sel.map(x => `<div class="small" style="margin-top:4px"><span class="dotc" style="background:${subject(x.subject).color}"></span>${esc(x.title)} <span class="muted">· ${status(x)}</span></div>`).join("") : `<p class="small muted" style="margin-top:4px">${t("这一天没有任务。")}</p>`}
      <div class="btns" style="margin-top:8px"><button class="chip" data-act="dayoff-toggle" data-date="${S.calDay}">${off.has(S.calDay) ? t("取消休息日") : t("设为休息日（不生成任务）")}</button></div></div>` : `<p class="small muted" style="margin-top:8px">${t("点一天看任务，或把它设为休息日。教会年历预留在这里，暂未启用。")}</p>`}
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
  return `<h2>${t("周例行")} · ${esc(childName())}</h2>
  <p class="small muted">${t("每天早上按这张表自动生成今日任务（休息日除外）。全家项（如家庭敬拜）对每个孩子都显示。")}</p>
  ${mine.length ? order.map(d => { const rs = byDay(d); return `<h3 class="small muted" style="margin-top:14px">${esc(weekdayLabel(d))}${rs.length ? "" : ` · ${t("休息")}`}</h3>${rs.length ? `<div class="panel" style="padding:4px 8px">${rs.map(row).join("")}</div>` : ""}`; }).join("")
    : `<div class="empty">${t("还没有例行安排。套用一个模板最快，之后再按自家情况改。")}</div>`}
  <div class="btns"><button class="btn primary" data-act="routine-add">＋ ${t("添加例行")}</button>${Object.entries(ROUTINE_TEMPLATES).map(([k, tp]) => `<button class="btn" data-act="template-apply" data-tpl="${k}">${t("套用：")}${tc(tp.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">${t("模板套用到当前孩子（{name}），全家项只加一次，重复套用不会重复。", { name: esc(childName()) })}</p>`;
}

export { viewRoutines };
