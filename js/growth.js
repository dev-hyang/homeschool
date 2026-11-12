import { t } from "./core/i18n.js";
import { S, ageMonths, ageText, childName } from "./core/state.js";
import { D, dayKey, esc, hm } from "./core/util.js";
import { bars } from "./charts.js";
import { dayLabel } from "./recfilter.js";
import { paged, resetPage } from "./pager.js";
import { aiIcon, askAbout } from "./ask.js";
import { TILES, summary, tileOf } from "./quicklog.js";
import { nightList } from "./nightdry.js";
import { B, buckets, flowContext, inB, mineRows, nightDryHTML, nightsIn, pullButtonHTML, sleepNights } from "./flows-trend.js";
import { learnedCount, unitProgress } from "./hs.js";
import { bodyAct, bodyHTML } from "./growth-body.js";
import { reviewAct, reviewHTML } from "./growth-review.js";
import { render } from "./views.js";

/* ============ 成长（底部页签，2026-11-11 重排）：2 岁以上孩子的记录与趋势（小月亮不再显示 2 岁以上，这里是找它们的地方） ============
   分几大块（顶上一排大按钮）：🩺 身体与健康（js/growth-body.js）· 🌱 习惯与情绪（下面这些原来的成长记录页面）· 📚 学习与培训（如厕训练、夜间干爽、阅读、语言、课外班、课程和经文进度）。
   最上面是「✦ AI 身心灵分析」（js/growth-review.js），三大块都看得到。
   哪一块由 G.sec 决定：overview / learn / night …（blockOf），今天页、记一笔的链接用 data-grview 直接打开某一页。
   入口：今天页「记一笔」卡片的「全部记录 ›」、我的页的「成长记录」、夜间干爽那行的「趋势 ›」。
   数据：和趋势与分析同一份（flows-trend.js 的 S.cf：小月亮 entries 近 61 天，按 1000 行一页读，最多 4000 行），不另外读。
   11-08 重排：顶上一排页面导航（宽屏页签、手机下拉）：总览 / 夜间干爽 / 睡眠 / 睡前安然 / 趋势与分析（后三个是原来的页面，进去后顶上同样有这一排）。
   总览：一个筛选器（时间范围、类型、排序：默认最新在前）管下面两块——
   ① 趋势：每个指标一块（这段时间 vs 前一段同样长），点一块看柱状图（14 天以内每天一根，30 天每周一根）；
      点柱子 / 「看…的记录」把下面的记录筛到那一类、那一天或那一周；「让咩咩咩分析」带上这些指标 + 趋势与分析的摘要；
   ② 记录：列表 | 时间线，记一笔的各种记录 + 小月亮里的情绪行为，点一条用记一笔的同一张表单改 / 删。 */
const G = (S.gr = S.gr || {});
Object.assign(G, { sec: G.sec || "overview", view: G.view === "timeline" ? "timeline" : "list", type: G.type || "all", days: G.days || 14, sort: G.sort || "new", metric: G.metric || null, span: G.span || null });
const LIST_TYPES = new Set([...TILES.map(x => x.type), "behavior"]);
const BEH = { icon: "🙂", label: "情绪行为" };   // 小月亮 / 冲突管理记的，不是记一笔的格子：只看，不在这里改
const rowsIn = (a, b, type) => mineRows().filter(e => e.type === type && e.ts >= a && e.ts < b);
const actMin = (a, b, kind) => rowsIn(a, b, "activity").filter(e => e.kind === kind).reduce((s, e) => s + (+e.minutes || 0), 0);
const avgOr = arr => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null);
const dkTs = d => new Date(d + "T00:00:00").getTime();

/* 指标：sum = 区间内加总（次数、分钟）；avg = 区间内平均（没有记录 = 没有值）。夜间干爽和睡眠按「那一晚」的日期算 */
const nightsBetween = (a, b) => nightList(mineRows().filter(e => e.type === "night")).filter(x => { const ts = dkTs(x.date); return ts >= a && ts < b; });
const sleepBetween = (a, b) => sleepNights(62).filter(n => { const ts = dkTs(n.date); return ts >= a && ts < b; });
const METRICS = {
  potty:    { label: "如厕成功", unit: "次", kind: "sum", color: "var(--sky)", v: (a, b) => rowsIn(a, b, "potty").filter(e => ["小马桶", "马桶"].includes(e.where) && e.what !== "坐了没出").length },
  accident: { label: "如厕意外", unit: "次", kind: "sum", color: "var(--rose)", v: (a, b) => rowsIn(a, b, "potty").filter(e => ["尿裤里", "裤子湿了"].includes(e.where)).length },
  dry:      { label: "干爽的晚上", unit: "晚", kind: "sum", color: "var(--sage)", v: (a, b) => nightsBetween(a, b).filter(x => x.dry).length, has: (a, b) => nightsBetween(a, b).length > 0 },
  sleep:    { label: "夜间睡眠", unit: "小时", kind: "avg", dec: 1, color: "var(--slate)", v: (a, b) => { const n = sleepBetween(a, b); return n.length ? avgOr(n.map(x => x.dur / 3600e3)) : null; } },
  meals:    { label: "吃饭", unit: "次", kind: "sum", color: "#C8743A", v: (a, b) => rowsIn(a, b, "food").length },
  mealMin:  { label: "用餐时长", unit: "分钟", kind: "avg", color: "#C8743A", v: (a, b) => avgOr(rowsIn(a, b, "food").map(e => +e.minutes).filter(x => x > 0)) },
  outdoor:  { label: "户外", unit: "分钟", kind: "sum", color: "var(--sage)", v: (a, b) => actMin(a, b, "户外") },
  read:     { label: "阅读", unit: "分钟", kind: "sum", color: "#7A6FB5", v: (a, b) => actMin(a, b, "阅读") },
  screen:   { label: "屏幕", unit: "分钟", kind: "sum", color: "var(--muted)", v: (a, b) => actMin(a, b, "屏幕") },
  tantrum:  { label: "发脾气 / 哭闹", unit: "次", kind: "sum", color: "var(--rose)", v: (a, b) => rowsIn(a, b, "behavior").filter(e => ["发脾气", "哭闹"].includes(e.kind)).length },
  mood:     { label: "心情", unit: "分（1–5）", kind: "avg", dec: 1, color: "#4F8FA8", v: (a, b) => avgOr(rowsIn(a, b, "mood").map(e => +e.level).filter(x => x > 0)) },
  words:    { label: "语言", unit: "条", kind: "sum", color: "#5B8E5A", v: (a, b) => rowsIn(a, b, "speech").length },
  companion:{ label: "陪伴", unit: "分钟", kind: "sum", color: "#C2677B", v: (a, b) => rowsIn(a, b, "companion").reduce((s, e) => s + (+e.minutes || 0), 0) },
  social:   { label: "社交", unit: "次", kind: "sum", color: "#5B8E5A", v: (a, b) => rowsIn(a, b, "social").length },
  class:    { label: "课外班", unit: "分钟", kind: "sum", color: "#B07A2E", v: (a, b) => actMin(a, b, "课外班") }
};
/* 两大块各看哪些：学习与培训 = 如厕训练、夜间干爽、阅读、语言、课外班；其余是习惯与情绪 */
const LEARN_M = new Set(["potty", "accident", "dry", "read", "words", "class"]), LEARN_T = new Set(["potty", "night", "read", "speech", "class"]);
const blockOf = sec => (sec === "body" ? "body" : sec === "learn" || sec === "night" ? "learn" : "heart");
const curBlock = () => blockOf(G.sec);
const inBlockT = (k, blk = curBlock()) => blk !== "body" && LEARN_T.has(k) === (blk === "learn");
const inBlockM = (k, blk = curBlock()) => blk !== "body" && LEARN_M.has(k) === (blk === "learn");
/** 按年龄排：小的先看如厕、夜间干爽、睡眠、吃饭；大的先看情绪、陪伴、阅读、屏幕 */
function metricOrder(){
  const m = ageMonths();
  if (m != null && m < 48) return ["potty", "accident", "dry", "sleep", "meals", "mealMin", "outdoor", "read", "tantrum", "words", "screen", "mood", "companion", "social", "class"];
  if (m != null && m < 84) return ["dry", "sleep", "outdoor", "read", "screen", "meals", "mealMin", "tantrum", "mood", "potty", "accident", "companion", "words", "social", "class"];
  return ["mood", "companion", "read", "outdoor", "screen", "sleep", "social", "tantrum", "meals", "mealMin", "dry", "potty", "accident", "words", "class"];
}
const fmt = (k, v) => (v == null ? "–" : String(Math.round(v * 10 ** (METRICS[k].dec || 0)) / 10 ** (METRICS[k].dec || 0)));
const hasData = (k, a, b) => { const M = METRICS[k]; if (M.has) return M.has(a, b); const v = M.v(a, b); return v != null && v !== 0; };
/** 当前 N 天（含今天）和前 N 天 */
function periods(days){
  const end = new Date(); end.setHours(0, 0, 0, 0); const b = end.getTime() + D, a = b - days * D;
  return { cur: [a, b], prev: [a - days * D, a] };
}
const shownMetrics = days => { const p = periods(days); return metricOrder().filter(k => hasData(k, ...p.cur) || hasData(k, ...p.prev)); };

/* ---- 页面导航：顶上一排大块（习惯与情绪 / 学习与培训…），下面是这一块里的几页（宽屏页签，手机下拉框） ----
   习惯与情绪：总览在本页；睡眠、睡前安然、趋势与分析是原来的页面，从这里进去时顶上同样有这两排，面包屑回到成长。
   学习与培训：总览、夜间干爽都在本页。 */
const BLOCKS = [["body", "🩺", "身体与健康", "body"], ["heart", "🌱", "习惯与情绪", "overview"], ["learn", "📚", "学习与培训", "learn"]];
const SUBNAV = { body: [], heart: [["overview", "📒", "总览"], ["sleep", "🌙", "睡眠"], ["bedtime", "🕯", "睡前安然"], ["flow-trend", "📈", "趋势与分析"]],
  learn: [["learn", "📚", "总览"], ["night", "🩲", "夜间干爽"]] };
const HERE = new Set(["body", "overview", "learn", "night"]);   // 这些是成长页本身（G.sec），其余是别的页面
const navCur = tab => (tab === "growth" ? (HERE.has(G.sec) ? G.sec : "overview") : tab);
function growthNavHTML(tab){
  const cur = navCur(tab), blk = tab === "growth" ? curBlock() : "heart", nav = SUBNAV[blk];
  const attrs = k => (HERE.has(k) ? `data-tab="growth" data-grview="${k}"` : `data-tab="${k}" data-from="growth"`);
  return `<div class="gr-blocks seg" role="group" aria-label="${esc(t("成长"))}">${BLOCKS.map(([k, ic, l, sec]) => `<button type="button" data-tab="growth" data-grview="${sec}" aria-pressed="${k === blk}"><span aria-hidden="true">${ic}</span> ${t(l)}</button>`).join("")}</div>
  ${!nav.length ? "" : `<nav class="gnav" aria-label="${esc(t(BLOCKS.find(x => x[0] === blk)[2]))}">
    <div class="gnav-tabs">${nav.map(([k, ic, l]) => `<button type="button" class="gnav-tab" ${attrs(k)} ${k === cur ? 'aria-current="page"' : ""}><span aria-hidden="true">${ic}</span> ${t(l)}</button>`).join("")}</div>
    <label class="gnav-pick"><span class="gnav-lbl">${t(BLOCKS.find(x => x[0] === blk)[2])}</span><select data-grnav aria-label="${esc(t("选一页"))}">${nav.map(([k, ic, l]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${ic} ${esc(t(l))}</option>`).join("")}</select></label>
  </nav>`}`;
}
/** 哪些页面顶上放这两排：成长本身、睡眠，以及从成长点进去的睡前安然 / 趋势与分析 */
const showGrowthNav = (tab, parent) => tab === "growth" || tab === "sleep" || ((tab === "bedtime" || tab === "flow-trend") && parent === "growth");
function goNav(k){
  if (HERE.has(k)) { G.sec = k; S.tab = "growth"; }
  else { (S.from ||= {})[k] = "growth"; S.tab = k; }
  render(); window.scrollTo(0, 0);
}

/* ---- 筛选器：时间范围、类型、排序（总览里趋势和记录共用同一套） ---- */
const DAYS = [7, 14, 30];
const TYPE_OF = { potty: "potty", accident: "potty", dry: "night", meals: "meal", mealMin: "meal", outdoor: "outdoor", read: "read", screen: "screen", tantrum: "behavior", mood: "mood", words: "speech", companion: "companion", social: "social", class: "class" };
const daysNow = () => (DAYS.includes(G.days) ? G.days : 14);
const typeName = k => { if (k === "behavior") return `${BEH.icon} ${t(BEH.label)}`; const x = TILES.find(y => y.id === k); return x ? `${x.icon} ${t(x.label)}` : k; };
function typeOptions(){
  const present = new Set(mineRows().filter(e => LIST_TYPES.has(e.type)).map(typeKey));
  const ids = [...TILES.map(x => x.id).filter(k => present.has(k)), ...(present.has("behavior") ? ["behavior"] : [])].filter(k => inBlockT(k));
  if (G.type !== "all" && !ids.includes(G.type)) ids.push(G.type);   // 刚从趋势点过来、这段时间没有记录：选项里也留着
  return ids;
}
const sel = (name, label, opts, cur) => `<label class="gr-f"><span>${label}</span><select data-grf="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
function filterHTML({ timeOnly = false } = {}){
  const days = daysNow(), time = sel("days", t("时间"), DAYS.map(d => [d, t("近 {n} 天", { n: d })]), days);
  if (timeOnly) return `<div class="gr-filter is-time">${time}</div>`;
  const type = sel("type", t("类型"), [["all", t("全部")], ...typeOptions().map(k => [k, typeName(k)])], G.type);
  const sort = sel("sort", t("排序"), [["new", t("最新在前")], ["old", t("最早在前")]], G.sort === "old" ? "old" : "new");
  const on = [G.type !== "all" && `<button type="button" class="gr-tag" data-act="gr-clear" data-v="type" aria-label="${esc(t("去掉这个筛选：{s}", { s: typeName(G.type) }))}">${esc(typeName(G.type))} <span aria-hidden="true">✕</span></button>`,
    G.span && `<button type="button" class="gr-tag" data-act="gr-clear" data-v="span" aria-label="${esc(t("去掉这个筛选：{s}", { s: spanText() }))}">📅 ${esc(spanText())} <span aria-hidden="true">✕</span></button>`].filter(Boolean);
  return `<div class="gr-filter" role="group" aria-label="${esc(t("筛选与排序"))}">${time}${type}${sort}</div>
    ${on.length ? `<div class="gr-tags">${on.join("")}${on.length > 1 ? `<button type="button" class="linkbtn small" data-act="gr-clear" data-v="all">${t("全部清除")}</button>` : ""}</div>` : ""}`;
}
const spanText = () => (!G.span ? "" : G.span.from === G.span.to ? G.span.from.slice(5) : `${G.span.from.slice(5)} – ${G.span.to.slice(5)}`);

/* ---- 记录（列表 | 时间线），按筛选器 ---- */
const asRec = e => ({ id: e.id, ts: +e.ts, data: e });
/** 筛选用的类型：活动按 kind 分成户外 / 阅读 / 音乐 / 屏幕（和记一笔的格子一致） */
const typeKey = e => { const tl = e.type === "behavior" ? null : tileOf(asRec(e)); return tl ? tl.id : e.type; };
const metaOf = e => (e.type === "behavior" ? BEH : tileOf(asRec(e)) || { icon: "📝", label: e.type });
function listItems(){
  const from = periods(daysNow()).cur[0];
  const rows = mineRows().filter(e => LIST_TYPES.has(e.type) && +e.ts >= from && inBlockT(typeKey(e)) && (G.type === "all" || typeKey(e) === G.type))
    .map(e => ({ ...e, date: dayKey(e.ts) })).filter(e => !G.span || (e.date >= G.span.from && e.date <= G.span.to));
  return rows.sort((a, b) => (G.sort === "old" ? a.ts - b.ts : b.ts - a.ts));
}
function rowHTML(e, { time = false } = {}){
  const m = metaOf(e), sum = e.type === "behavior" ? [e.kind, e.trigger && t("起因：{s}", { s: e.trigger }), e.how && t("处理：{s}", { s: e.how })].filter(Boolean).map(x => t(x)).join(" · ") : summary(asRec(e));
  const when = time ? hm(e.ts) : `${e.date.slice(5)} ${hm(e.ts)}`;
  const inner = `<span class="title">${m.icon} <b>${esc(t(m.label))}</b> <span class="small muted num">${esc(when)}</span></span><span class="meta">${esc(sum || "")}${e.note ? ` · ${esc(e.note)}` : ""}</span>`;
  return `<div class="task"><span class="bar" style="background:${e.type === "behavior" ? "var(--rose)" : "var(--slate)"}"></span>
    ${e.type === "behavior" ? `<div class="main" style="cursor:default">${inner}</div>` : `<button type="button" class="main" data-act="ql-edit" data-id="${esc(e.id)}" aria-label="${esc(t("修改这一条"))}">${inner}</button>`}<span class="acts"></span></div>`;
}
function recordsSection(){
  const all = listItems(), pg = paged("gr-rec", all), view = G.view === "timeline" ? "timeline" : "list";
  let body;
  if (!all.length) body = `<div class="empty">${G.type !== "all" || G.span ? t("这些筛选条件下没有记录。") : t("这段时间没有记录。在今天页「记一笔」点一格就能记。")}</div>`;   // 只列这一块的类型（inBlockT）
  else if (view === "timeline") {
    const groups = []; pg.rows.forEach(x => { const g = groups[groups.length - 1]; if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] }); });
    body = `<div class="tl">${groups.map(g => `<div class="tl-day"><div class="tl-head"><b>${esc(dayLabel(g.date))}</b> <span class="small muted">${g.date}</span></div>${g.items.map(x => `<div class="tl-item">${rowHTML(x, { time: true })}</div>`).join("")}</div>`).join("")}</div>`;
  } else body = `<div class="tasks">${pg.rows.map(x => rowHTML(x)).join("")}</div>`;
  return `<section class="gr-sec" id="grRec" aria-labelledby="grRecH">
    <div class="gr-sh"><h2 id="grRecH">${t("记录")} <span class="small muted gr-n">${t("{n} 条", { n: all.length })}</span></h2>
      <div class="seg gr-seg" role="group" aria-label="${t("视图")}"><button type="button" data-act="gr-view" data-v="list" aria-pressed="${view === "list"}">${t("列表")}</button><button type="button" data-act="gr-view" data-v="timeline" aria-pressed="${view === "timeline"}">${t("时间线")}</button></div></div>
    <div class="panel">${body}${pg.more}</div>
    <p class="small muted gr-foot">${t("点一条可以修改或删除（情绪行为在冲突管理 / 小月亮里改）。最多看最近 2 个月；和小月亮是同一份记录。")}</p>
  </section>`;
}

/* ---- 趋势：每个指标一块（这段时间 vs 前一段同样长），点一块看柱状图；柱子和「看记录」都能把下面的记录筛到那一类 / 那几天 ---- */
const BAD_UP = new Set(["accident", "screen", "tantrum"]);   // 这几项变多不是好事
function tileHTML(k, p, days){
  const M = METRICS[k], c = M.v(...p.cur), q = M.v(...p.prev), d = c == null || q == null ? null : c - q;
  const dir = d == null || Math.abs(d) < 1e-9 ? "" : (d > 0) !== BAD_UP.has(k) ? "good" : "bad";
  return `<button type="button" class="gr-tile" data-act="gr-metric" data-v="${k}" aria-pressed="${G.metric === k}" style="--c:${M.color}">
    <span class="gr-tl">${esc(t(M.label))}${M.kind === "avg" ? ` <span class="gr-avg">${t("平均")}</span>` : ""}</span>
    <span class="gr-tv num">${fmt(k, c)}<small>${esc(t(M.unit))}</small></span>
    <span class="gr-td"><span class="small muted">${t("前 {n} 天", { n: days })} ${fmt(k, q)}</span>${d == null ? "" : `<span class="gr-dl ${dir}">${d > 0 ? "↑" : d < 0 ? "↓" : "＝"}${Math.abs(d) < 1e-9 ? "" : fmt(k, Math.abs(d))}</span>`}</span>
  </button>`;
}
function trendSection(){
  const days = daysNow(), p = periods(days);
  const keys = shownMetrics(days).filter(k => inBlockM(k) && (G.type === "all" || TYPE_OF[k] === G.type));
  if (!keys.includes(G.metric)) G.metric = keys[0] || null;
  const head = `<div class="gr-sh"><h2>${t("趋势")} <span class="small muted gr-n">${t("近 {n} 天 vs 前 {n} 天", { n: days })}</span></h2>
    ${curBlock() === "heart" ? `<button class="btn sm gr-ask" data-act="gr-ask">${aiIcon(16)} ${t("让咩咩咩分析")}</button>` : ""}</div>`;
  if (!keys.length) return `<section class="gr-sec">${head}<div class="panel"><p class="small muted" style="margin:0">${G.type !== "all" ? t("这一类没有趋势指标，下面是它的记录。") : t("这段时间还没有记录。在今天页「记一笔」记几天，这里就能看到变化。")}</p></div></section>`;
  let chart = "";
  if (G.metric) {
    const k = G.metric, M = METRICS[k], bk = buckets(days), ty = TYPE_OF[k];
    const items = bk.map(b => { const v = M.v(dkTs(b.from), dkTs(b.to) + D); return { label: b.label, value: v == null ? 0 : +fmt(k, v), color: M.color, drill: ty ? `gr:${k}|${b.from}|${b.to}` : "" }; });
    const see = ty ? `<button type="button" class="linkbtn small" data-act="gr-see" data-v="${k}">${t("看{s}的记录", { s: t(M.label) })} ↓</button>`
      : k === "sleep" ? `<button type="button" class="linkbtn small" data-tab="sleep" data-from="growth">${t("看睡眠记录")} ›</button>` : "";
    chart = `<div class="panel gr-chart"><div class="gr-ch-h"><b>${esc(t(M.label))}</b> <span class="small muted">${esc(t(M.unit))} · ${days <= 14 ? t("每天一格") : t("每周一格（按周起始日标日期）")}${M.kind === "avg" ? ` · ${t("平均")}` : ""}</span></div>
      ${bars(items, { title: t(M.label) })}
      <div class="gr-ch-f">${ty ? `<span class="small muted">${t("点柱子：下面只看那一天 / 那一周的记录")}</span>` : "<span></span>"}${see}</div></div>`;
  }
  return `<section class="gr-sec">${head}
    <div class="gr-tiles">${keys.map(k => tileHTML(k, p, days)).join("")}</div>
    ${chart}
    <p class="small muted gr-foot">${t("次数、分钟是合计；心情、用餐时长、夜间睡眠是平均。记得越全越准，样本少时只作参考。")}</p>
  </section>`;
}

/** 给 AI 身心灵分析（js/growth-review.js）：每个有数据的指标，这段时间和前一段 */
function metricsList(days){
  const p = periods(days);
  return shownMetrics(days).map(k => { const M = METRICS[k]; return { key: k, label: M.label, unit: M.unit, kind: M.kind, cur: M.v(...p.cur), prev: M.v(...p.prev) }; });
}
/** 交给咩咩咩：各指标近 N 天 vs 前 N 天 + 趋势与分析的摘要（睡眠、睡前流程、冲突、夜间干爽） */
function growthContext(days){
  const p = periods(days), lines = shownMetrics(days).map(k => {
    const M = METRICS[k], c = M.v(...p.cur), q = M.v(...p.prev);
    return `- ${M.label}（${M.unit}，${M.kind === "avg" ? "平均" : "合计"}）：近 ${days} 天 ${fmt(k, c)}，前 ${days} 天 ${fmt(k, q)}`;
  });
  return `日常记录（家庭学堂「记一笔」和小月亮，近 ${days} 天 vs 前 ${days} 天）：\n${lines.length ? lines.join("\n") : "- 没有记录"}\n\n${flowContext({ days })}`;
}

/* ---- 学习与培训：课程进度、经文、课外班（记一笔里的「课外班」格子） ---- */
const inP = (d, [a, b]) => { if (!d) return false; const ts = dkTs(String(d).slice(0, 10)); return ts >= a && ts < b; };
function learnCards(days){
  const cid = S.childId, p = periods(days), cards = [];
  if (S.hs.phase2) {
    const units = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active), ids = new Set(units.map(u => u.id));
    const ls = S.hs.lessons.filter(l => ids.has(l.unit_id)), done = ls.filter(l => l.status === "done");
    const cur = done.filter(l => inP(l.done_on, p.cur)).length, prev = done.filter(l => inP(l.done_on, p.prev)).length;
    const goals = S.hs.goals.filter(g => g.child_id === cid), got = goals.filter(g => g.achieved_on).length;
    cards.push(`<div class="panel gr-card"><div class="gr-card-h"><b>📘 ${t("课程")}</b><button type="button" class="chip" data-tab="course">${t("课程")} ›</button></div>
      <p class="gr-card-big num">${cur}<small> ${t("节课时")}</small> <span class="small muted">${t("前 {n} 天 {v}", { n: days, v: prev })}</span></p>
      <p class="small muted" style="margin:0">${t("{a} 个单元在学 · 课时完成 {b}/{c}", { a: units.filter(u => unitProgress(u.id).done < unitProgress(u.id).total).length, b: done.length, c: ls.length })}${goals.length ? ` · ${t("学习目标达成 {a}/{b}", { a: got, b: goals.length })}` : ""}</p></div>`);
  }
  cards.push(`<div class="panel gr-card"><div class="gr-card-h"><b>📖 ${t("经文背诵")}</b><button type="button" class="chip" data-act="scriptures" data-from="growth">${t("经文卡库")} ›</button></div>
    <p class="gr-card-big num">${learnedCount(cid)}<small> ${t("节已会背")}</small></p><p class="small muted" style="margin:0">${t("会背后按 3、7、30、90、180 天自动安排复习。")}</p></div>`);
  const cls = mineRows().filter(e => e.type === "activity" && e.kind === "课外班" && +e.ts >= p.cur[0]).sort((a, b) => b.ts - a.ts), by = new Map();
  for (const e of cls) { const k = (e.what || t("课外班")).trim(), x = by.get(k) || { n: 0, min: 0, last: e }; x.n++; x.min += +e.minutes || 0; by.set(k, x); }
  cards.push(`<div class="panel gr-card"><div class="gr-card-h"><b>🎹 ${t("课外班")}</b><button type="button" class="chip" data-act="ql-new" data-id="class">＋ ${t("记一次")}</button></div>
    ${by.size ? `<ul class="gr-cls">${[...by].map(([k, x]) => `<li><b>${esc(k)}</b> <span class="small muted">${t("{n} 次", { n: x.n })}${x.min ? ` · ${t("{n} 分钟", { n: x.min })}` : ""}</span>${x.last.progress ? `<br><span class="small">${esc(x.last.progress)}</span>` : ""}</li>`).join("")}</ul>`
      : `<p class="small muted" style="margin:0">${t("钢琴、游泳、球队、美术…上一次课点「记一次」，这里按课程汇总次数、时长和最新进度。")}</p>`}</div>`);
  return `<div class="gr-cards">${cards.join("")}</div>`;
}

function viewGrowth(){
  if (!HERE.has(G.sec)) G.sec = "overview";
  const sec = G.sec, blk = curBlock();
  if (G.type !== "all" && !inBlockT(G.type)) { G.type = "all"; G.span = null; }   // 换了一块：上一块的类型筛选不带过来
  const status = B.loading && !B.loaded ? `<p class="small muted" role="status">${t("正在读取记录…")}</p>` : B.err && !B.loaded ? `<p class="small muted" role="status">${t("读取小月亮失败：")}${esc(String(B.err).slice(0, 80))}</p>` : "";
  const title = `<h2 class="gr-title">${esc(t("{n}的成长", { n: childName() }))} <span class="small muted">${esc(ageText())}</span></h2>`;
  let body = "";
  if (B.loaded) {
    if (sec === "body") body = "";
    else if (sec === "night") { const days = daysNow(), dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D)); body = `${filterHTML({ timeOnly: true })}${nightDryHTML(dates, sleepNights(days), new Set(nightsIn(days).map(l => l.date)))}`; }
    else if (blk === "learn") body = `${filterHTML()}${learnCards(daysNow())}${trendSection()}${recordsSection()}`;
    else body = `${filterHTML()}${trendSection()}${recordsSection()}`;
  }
  if (sec === "body") return `${title}${reviewHTML()}${bodyHTML()}`;   // 身体与健康自己读数据（js/growth-body.js），不用上面那份近 2 个月的记录
  return `${title}${reviewHTML()}${status}${body}<p class="small muted" style="margin-top:12px">${pullButtonHTML()}</p>`;
}

const toRec = () => setTimeout(() => document.getElementById("grRec")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
async function growthAct(act, btn){
  if (bodyAct(act)) return;   // 身体与健康（js/growth-body.js）
  if (await reviewAct(act, btn)) return;   // AI 身心灵分析（js/growth-review.js）
  const d = btn.dataset;
  switch (act) {
    case "gr-view": G.view = d.v; render(); break;
    case "gr-metric": G.metric = d.v; render(); break;
    case "gr-see": { const ty = TYPE_OF[d.v]; if (ty) { G.type = ty; G.metric = d.v; G.span = null; resetPage("gr-rec"); render(); toRec(); } break; }
    case "gr-clear": { if (d.v === "type" || d.v === "all") G.type = "all"; if (d.v === "span" || d.v === "all") G.span = null; resetPage("gr-rec"); render(); break; }
    case "gr-ask": { const days = daysNow(); askAbout({ q: t("分析这个孩子最近的日常记录（如厕、夜间干爽、吃饭、睡眠作息、户外 / 阅读 / 屏幕、情绪）：有什么规律？哪些地方进步了、哪些需要调整？下一步具体怎么做？"), extra: growthContext(days), name: t("日常记录摘要（近 {n} 天）", { n: days }), from: "growth" }); break; }
  }
}
/** 柱状图点了一根（charts.js 的 data-libf="gr:指标|起|止"）：下面的记录只看那一类、那几天 */
function growthDrill(v){
  const [k, from, to] = String(v).split("|"), ty = TYPE_OF[k]; if (!ty || !from) return;
  G.type = ty; G.metric = k; G.span = { from, to: to || from }; resetPage("gr-rec"); render(); toRec();
}
/** 下拉：页面导航、筛选器（change 事件） */
function growthChange(el){
  if (el.dataset.grnav !== undefined) { goNav(el.value); return true; }
  const f = el.dataset.grf; if (f === undefined) return false;
  if (f === "days") { G.days = +el.value; G.span = null; }
  else if (f === "type") { G.type = el.value; G.span = null; }
  else if (f === "sort") G.sort = el.value;
  resetPage("gr-rec"); render(); return true;
}

export { metricsList, viewGrowth, growthAct, growthChange, growthContext, growthDrill, growthNavHTML, showGrowthNav };
