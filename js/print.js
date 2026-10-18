import { t, tc } from "./core/i18n.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { D, dayKey, esc } from "./core/util.js";
import { WEEKDAYS, subject, weekdayLabel } from "./data/subjects.js";
import { ve, vz } from "./data/versions.js";
import { currentPlan, devotionDraft, isOffDay, monthRange, planState, scripture, tasksFor, todayPlan, yearInfo } from "./hs.js";
import { render } from "./views.js";

/* ============ 打印：日 / 周 / 月 ============
   目的：不想一直看手机的家庭，早上打一张贴在冰箱上，晚上再把勾补回手机（或周末一起补）。
   做法：把一张纸的 HTML 放进 #print，给 body 加 printing，调 window.print()；打印样式只显示 #print。
   日页竖版一页；周表横版一页；月历竖版一页。字用黑色，不依赖主题色。 */
const box = () => `<span class="pbox" aria-hidden="true"></span>`;
const lines = n => Array.from({ length: n }, () => `<div class="pline"></div>`).join("");
const mondayOf = ts => { const d = new Date(ts); const wd = (d.getDay() + 6) % 7; return startDay(ts) - wd * D; };
const startDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const breakName = date => (((S.hs.settings.year || {}).breaks || []).find(b => b.from && b.to && date >= b.from && date <= b.to) || {}).name || "";
const dueOn = (cid, date) => S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.next_review === date).length;
// 读经计划往后推：今天是第 i 段，之后每做一天前进一格（休息日也照读，所以按自然日推）
function passageAt(offsetDays){
  const p = currentPlan(); if (!p.items.length) return "";
  const i = ((planState().progress[p.id] || 0) + offsetDays) % p.items.length;
  return p.items[i][0];
}
function header(title, sub){
  const yi = yearInfo();
  return `<div class="phead"><div><div class="ptitle">${title}</div><div class="psub">${sub}</div></div>
    <div class="pright">${t("家庭学堂")}${yi && !yi.before && !yi.ended ? ` · ${t("第 {w} 周 · 第 {term} 学期", { w: yi.week, term: yi.term })}` : ""}</div></div>`;
}

function dayPage(){
  const cid = S.childId, day = dayKey(Date.now()), dv = devotionDraft(), wv = S.hs.settings.weekVerse ? scripture(S.hs.settings.weekVerse) : null;
  const plan = todayPlan(cid), tasks = tasksFor(day, cid), off = isOffDay(day);
  const verse = s => `<div class="pverse"><b>${esc(s.ref)}</b><div>${esc(s.text_zh)} <span class="pmuted">${esc(vz(s))}</span></div><div class="pmuted">${esc(s.text_en)}${esc(ve(s))}</div></div>`;
  return `<section class="ppage pday">
  ${header(`${day} · ${esc(weekdayLabel(new Date().getDay()))}`, `${esc(childName())} · ${esc(ageText())} · ${esc(stageOf().name)}${off ? ` · ${t("休息日")}` : ""}`)}
  <h3>${t("今日敬拜")}</h3>
  <table class="pkv">
    <tr><th>${t("读经")}</th><td>${esc(dv.passage || passageAt(0) || t("还没选读经计划"))}</td></tr>
    <tr><th>${t("经文")}</th><td>${wv ? verse(wv) : `<span class="pmuted">${t("本周还没选经文")}</span>`}</td></tr>
    <tr><th>${t("诗歌")}</th><td>${esc(S.hs.settings.hymn || "")}</td></tr>
    <tr><th>${t("祷告")}</th><td>${lines(2)}</td></tr>
    <tr><th>${t("参加")}</th><td>${S.children.map(c => `${box()} ${esc(c.name || t("宝宝"))}`).join("　")}</td></tr>
  </table>
  <h3>${t("经文背诵")} <span class="pmuted">${plan.rows.length ? t("今天 {n} 节", { n: plan.rows.length }) : ""}</span></h3>
  ${plan.rows.length ? plan.rows.map(({ s, p, kind }) => `<div class="prow">${box()}<div>${verse(s)}<div class="pmuted">${kind === "learn" ? t("在学") : t("复习 · 第 {n} 次", { n: (p.reviews || 0) + 1 })}</div></div></div>`).join("")
    : `<p class="pmuted">${t("今天没有到期的复习。")}</p>`}
  <h3>${t("今日任务")}</h3>
  ${tasks.length ? tasks.map(x => `<div class="prow">${box()}<div><b>${esc(x.title)}</b> <span class="pmuted">${esc(subject(x.subject).short)}${x.minutes ? ` · ${t("{n} 分钟", { n: x.minutes })}` : ""}${x.child_id == null ? ` · ${t("全家")}` : ""}</span></div></div>`).join("") : `<p class="pmuted">${off ? t("休息日不生成任务。") : t("今天没有任务。")}</p>`}
  <div class="prow">${box()}<div class="pline" style="flex:1"></div></div>
  <div class="prow">${box()}<div class="pline" style="flex:1"></div></div>
  <h3>${t("备注")}</h3>${lines(3)}
  <p class="pfoot">${t("打勾后晚上在手机上补一下，或者周末一起补；复习间隔是按手机里的记录排的。")}</p>
  </section>`;
}

function weekPage(){
  const cid = S.childId, mon = mondayOf(Date.now()), todayKey = dayKey(Date.now()), todayTs = startDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => { const ts = mon + i * D, date = dayKey(ts); return { ts, date, wd: new Date(ts).getDay(), off: isOffDay(date), brk: breakName(date), offset: Math.round((ts - todayTs) / D) }; });
  const mine = S.hs.routines.filter(r => r.active && (r.child_id == null || r.child_id === cid)).sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || a.sort - b.sort);
  const wv = S.hs.settings.weekVerse ? scripture(S.hs.settings.weekVerse) : null;
  const cell = (r, d) => d.off ? `<td class="off"></td>` : (r.weekdays || []).includes(d.wd) ? `<td class="c">${box()}</td>` : `<td class="na"></td>`;
  return `<section class="ppage pweek">
  ${header(t("本周安排 {a} – {b}", { a: days[0].date, b: days[6].date }), `${esc(childName())}${wv ? ` · ${t("本周经文")}：${esc(wv.ref)}` : ""}${S.hs.settings.hymn ? ` · ${t("诗歌")}：${esc(S.hs.settings.hymn)}` : ""}`)}
  <table class="pgrid">
    <thead><tr><th class="first"></th>${days.map(d => `<th class="${d.date === todayKey ? "today" : ""}">${esc(weekdayLabel(d.wd))}<br><span class="pmuted">${d.date.slice(5)}</span>${d.off ? `<br><span class="pmuted">${esc(d.brk || t("休息日"))}</span>` : ""}</th>`).join("")}</tr></thead>
    <tbody>
      <tr><th class="first">${t("读经")}</th>${days.map(d => `<td class="small">${d.off ? "" : d.offset < 0 ? "" : esc(passageAt(d.offset))}</td>`).join("")}</tr>
      <tr><th class="first">${t("敬拜")}</th>${days.map(d => d.off ? `<td class="off"></td>` : `<td class="c">${box()}</td>`).join("")}</tr>
      <tr><th class="first">${t("经文复习")}</th>${days.map(d => { const n = dueOn(cid, d.date); return d.off ? `<td class="off"></td>` : `<td class="c">${n ? `${box()} <span class="pmuted">${n}</span>` : ""}</td>`; }).join("")}</tr>
      ${mine.map(r => `<tr><th class="first"><span class="pdot" style="background:${subject(r.subject).color}"></span>${esc(r.title)}<br><span class="pmuted">${esc(r.start || "")}${r.start ? " · " : ""}${t("{n} 分钟", { n: r.minutes })}${r.child_id == null ? ` · ${t("全家")}` : ""}</span></th>${days.map(d => cell(r, d)).join("")}</tr>`).join("")}
      <tr><th class="first">${t("临时")}</th>${days.map(() => `<td class="c"></td>`).join("")}</tr>
      <tr><th class="first">${t("临时")}</th>${days.map(() => `<td class="c"></td>`).join("")}</tr>
    </tbody>
  </table>
  <p class="pfoot">${t("灰格是休息日或没安排；读经段落按读经计划每天前进一格推算，中间跳过一天会往后顺延。")}</p>
  </section>`;
}

function monthPage(ym){
  const cid = S.childId, [y, m] = ym.split("-").map(Number), { days } = monthRange(ym), first = new Date(y, m - 1, 1).getDay(), todayKey = dayKey(Date.now());
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<td class="pad"></td>`);
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`, off = isOffDay(date), brk = breakName(date), n = dueOn(cid, date);
    cells.push(`<td class="${off ? "off" : ""} ${date === todayKey ? "today" : ""}"><div class="pd">${d}</div>${brk ? `<div class="pmuted">${esc(brk)}</div>` : off ? `<div class="pmuted">${t("休息日")}</div>` : `<div>${box()} ${t("敬拜")}</div>${n ? `<div class="pmuted">${t("复习 {n} 节", { n })}</div>` : ""}`}</td>`);
  }
  while (cells.length % 7) cells.push(`<td class="pad"></td>`);
  const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
  const breaks = ((S.hs.settings.year || {}).breaks || []).filter(b => b.from && b.to && b.from <= `${ym}-31` && b.to >= `${ym}-01`);
  const mine = S.hs.routines.filter(r => r.active && (r.child_id == null || r.child_id === cid));
  const byDay = d => mine.filter(r => (r.weekdays || []).includes(d)).sort((a, b) => (a.start || "99").localeCompare(b.start || "99")).map(r => esc(r.title)).join("、");
  return `<section class="ppage pmonth">
  ${header(t("{y} 年 {m} 月", { y, m }), `${esc(childName())}${S.hs.settings.hymn ? ` · ${t("本月诗歌")}：${esc(S.hs.settings.hymn)}` : ""}`)}
  <table class="pcal"><thead><tr>${WEEKDAYS.map(w => `<th>${t("周" + w)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>
  ${breaks.length ? `<p class="small">${t("假期")}：${breaks.map(b => `${esc(b.name || t("假期"))} ${b.from} – ${b.to}`).join("；")}</p>` : ""}
  <h3>${t("周例行")}</h3>
  <table class="pkv">${[1, 2, 3, 4, 5, 6, 0].map(d => `<tr><th>${esc(weekdayLabel(d))}</th><td>${byDay(d) || `<span class="pmuted">${t("休息")}</span>`}</td></tr>`).join("")}</table>
  <p class="pfoot">${t("月历上每天一个敬拜勾；经文复习按手机里的安排推算，当天实际内容以今日页为准。")}</p>
  </section>`;
}

const renderPrint = (kind, ym) => kind === "week" ? weekPage() : kind === "month" ? monthPage(ym || dayKey(Date.now()).slice(0, 7)) : dayPage();

/* ---- 打印视图：整个页面变成这张纸 ----
   手机浏览器（Android Chrome、iOS Safari）打印的永远是顶层页面，而且什么时候生成预览、要不要理会 @media print 都因机而异：
   藏 iframe 会打成父页面，靠打印专用 CSS 隐藏应用又碰运气。唯一稳的办法是：按下打印时，屏幕上这一页本身就是纸。
   所以进入打印视图：头部、底栏都收起，正文只剩这张纸和一条工具栏（返回 / 打印），然后弹打印。
   打印结束（afterprint / 打印媒体查询退出）自动回到原来的页面；没有这些事件的浏览器点“返回”。 */
function openPrint(kind, ym){
  if (!S.hs.loaded) return;
  S.printView = { kind, ym: ym || null, back: S.tab };
  try { history.pushState({ print: 1 }, ""); } catch (e) {}
  render(); window.scrollTo(0, 0);
  window.addEventListener("afterprint", autoBack);
  if (mq) mq.addEventListener("change", onMq);
  setTimeout(() => { try { window.print(); } catch (e) {} }, 400); // 等字体和排版
}
function closePrint(){
  if (!S.printView) return;
  window.removeEventListener("afterprint", autoBack);
  if (mq) mq.removeEventListener("change", onMq);
  const back = S.printView.back; S.printView = null;
  if (back) S.tab = back;
  if (history.state && history.state.print) { try { history.back(); return; } catch (e) {} } // popstate 里再 render
  render();
}
const mq = window.matchMedia ? window.matchMedia("print") : null;
// 打印结束后稍等再退：预览还在用这一页时就切回去，会把切回去的页面打出来
const autoBack = () => setTimeout(closePrint, 300);
const onMq = e => { if (!e.matches) autoBack(); };
window.addEventListener("popstate", () => { if (S.printView) { S.printView = null; render(); } });
function printViewHTML(){
  const { kind, ym } = S.printView;
  return `<div class="pbar"><button class="btn" data-act="print-back">‹ ${t("返回")}</button><button class="btn primary" data-act="print-now">${t("打印")}</button><span class="small muted">${t("这一页就是要打印的纸。没有弹出打印窗口就点“打印”；打印完会自动返回。")}</span></div>
  <div id="print" lang="${document.documentElement.lang}">${renderPrint(kind, ym)}</div>`;
}

export { openPrint, closePrint, printViewHTML, renderPrint };
