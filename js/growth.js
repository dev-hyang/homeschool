import { t } from "./core/i18n.js";
import { S, ageMonths, ageText, childName } from "./core/state.js";
import { D, dayKey, esc, hm } from "./core/util.js";
import { bars } from "./charts.js";
import { dayLabel } from "./recfilter.js";
import { paged, resetPage } from "./pager.js";
import { aiIcon, askAbout } from "./ask.js";
import { TILES, summary, tileOf } from "./quicklog.js";
import { nightList } from "./nightdry.js";
import { B, buckets, flowContext, mineRows, nightDryHTML, nightsIn, pullButtonHTML, sleepNights } from "./flows-trend.js";
import { learnedCount, unitProgress } from "./hs.js";
import { bodyAct, bodyRowDesc, bodyTopicHTML } from "./growth-body.js";
import { reviewAct, reviewHTML } from "./growth-review.js";
import { LINKS, SECTIONS, TOPICS } from "./data/growth-topics.js";
import { render } from "./views.js";

/* ============ 成长（底部页签）：三层，和课程、我的同一种分层 ============
   第 1 层 成长首页：最上面「✦ AI 身心灵分析」（js/growth-review.js）；下面三块——🩺 身体与健康 · 🌱 习惯与情绪 · 📚 学习与培训，
          每块一张卡，卡里一行一个主题（图标、名字、一句最新情况、›），和课程页、我的页的入口行一样。
   第 2 层 主题页（主题表在 js/data/growth-topics.js）：每一页同一个版式——
          时间范围（7 / 14 / 30 天，三个按钮）→「＋ 记一笔」→ 指标卡（这段时间 vs 前一段，点一张换下面的图）→ 走势图（点柱子筛到那一天 / 那一周）→ 记录（列表 | 时间线）。
          身体与健康几页（身高体重、体检与就诊、疫苗、化验、病史）由 js/growth-body.js 画，结构一样：动作按钮 → 概况 → 走势 / 列表。
   第 3 层 一条记录：点一下用「记一笔」同一张表单改 / 删（情绪行为在冲突管理 / 小月亮里改）。
   数据：和趋势与分析同一份（flows-trend.js 的 S.cf：小月亮 entries 近 61 天），身体与健康另外读全部历史（growth-body.js）。
   2026-11-11 第二版：去掉了顶上的两排导航和下拉筛选（睡前安然、趋势与分析留在 资源 → 定制流程）。 */
const G = (S.gr = S.gr || {});
Object.assign(G, { view: G.view === "timeline" ? "timeline" : "list", days: G.days || 14, metric: G.metric || {}, span: G.span || null, spanTopic: G.spanTopic || null });
if (typeof G.metric !== "object") G.metric = {};
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
  music:    { label: "音乐", unit: "分钟", kind: "sum", color: "#8A6FB0", v: (a, b) => actMin(a, b, "音乐") },
  screen:   { label: "屏幕", unit: "分钟", kind: "sum", color: "var(--muted)", v: (a, b) => actMin(a, b, "屏幕") },
  tantrum:  { label: "发脾气 / 哭闹", unit: "次", kind: "sum", color: "var(--rose)", v: (a, b) => rowsIn(a, b, "behavior").filter(e => ["发脾气", "哭闹"].includes(e.kind)).length },
  mood:     { label: "心情", unit: "分（1–5）", kind: "avg", dec: 1, color: "#4F8FA8", v: (a, b) => avgOr(rowsIn(a, b, "mood").map(e => +e.level).filter(x => x > 0)) },
  words:    { label: "语言", unit: "条", kind: "sum", color: "#5B8E5A", v: (a, b) => rowsIn(a, b, "speech").length },
  companion:{ label: "陪伴", unit: "分钟", kind: "sum", color: "#C2677B", v: (a, b) => rowsIn(a, b, "companion").reduce((s, e) => s + (+e.minutes || 0), 0) },
  social:   { label: "社交", unit: "次", kind: "sum", color: "#5B8E5A", v: (a, b) => rowsIn(a, b, "social").length },
  class:    { label: "课外班", unit: "分钟", kind: "sum", color: "#B07A2E", v: (a, b) => actMin(a, b, "课外班") }
};
const BAD_UP = new Set(["accident", "screen", "tantrum"]);   // 这几项变多不是好事
const ORDER = Object.keys(METRICS);
const fmt = (k, v) => (v == null ? "–" : String(Math.round(v * 10 ** (METRICS[k].dec || 0)) / 10 ** (METRICS[k].dec || 0)));
const hasData = (k, a, b) => { const M = METRICS[k]; if (M.has) return M.has(a, b); const v = M.v(a, b); return v != null && v !== 0; };
const DAYS = [7, 14, 30];
const daysNow = () => (DAYS.includes(G.days) ? G.days : 14);
/** 当前 N 天（含今天）和前 N 天 */
function periods(days){
  const end = new Date(); end.setHours(0, 0, 0, 0); const b = end.getTime() + D, a = b - days * D;
  return { cur: [a, b], prev: [a - days * D, a] };
}
const shownMetrics = days => { const p = periods(days); return ORDER.filter(k => hasData(k, ...p.cur) || hasData(k, ...p.prev)); };

/* ---- 记录：记一笔的格子 id（活动按 kind 分成户外 / 阅读 / 音乐 / 屏幕 / 课外班） ---- */
const asRec = e => ({ id: e.id, ts: +e.ts, data: e });
const typeKey = e => { const tl = e.type === "behavior" ? null : tileOf(asRec(e)); return tl ? tl.id : e.type; };
const metaOf = e => (e.type === "behavior" ? BEH : tileOf(asRec(e)) || { icon: "📝", label: e.type });
const tileById = id => TILES.find(x => x.id === id);

/* ============ 第 1 层：成长首页 ============ */
function viewGrowth(){
  const status = B.loading && !B.loaded ? `<p class="small muted" role="status">${t("正在读取记录…")}</p>` : B.err && !B.loaded ? `<p class="small muted" role="status">${t("读取小月亮失败：")}${esc(String(B.err).slice(0, 80))}</p>` : "";
  const m = ageMonths();
  const sec = s => {
    const rows = Object.entries(TOPICS).filter(([, x]) => x.sec === s.id).filter(([id, x]) => !x.ages || m == null || (m >= x.ages[0] && m < x.ages[1]) || topicHasData(id))
      .map(([id, x]) => hubRow(`data-tab="${id}"`, x.icon, t(x.label), rowDesc(id, x)));
    for (const l of LINKS[s.id] || []) rows.push(hubRow(l.attr, l.icon, t(l.label), linkDesc(l.id)));
    const act = s.id === "body" ? `<button type="button" class="chip" data-ix="open" data-src="儿科体检">✦ ${t("AI 录入体检")}</button>` : "";
    return `<section class="gr-hub-sec" aria-labelledby="grh-${s.id}"><div class="gr-hub-h"><h2 id="grh-${s.id}"><span aria-hidden="true">${s.icon}</span> ${t(s.label)}</h2>${act}</div>
      <div class="panel mlist">${rows.join("")}</div></section>`;
  };
  return `<h2 class="gr-title">${esc(t("{n}的成长", { n: childName() }))} <span class="small muted">${esc(ageText())}</span></h2>
    ${reviewHTML()}${status}${SECTIONS.map(sec).join("")}<p class="small muted gr-foot">${pullButtonHTML()}</p>`;
}
const hubRow = (attr, icon, title, desc) => `<button type="button" class="mrow" ${attr}><span class="mi" aria-hidden="true">${icon}</span><span class="mt"><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</span><span class="mch" aria-hidden="true">›</span></button>`;
function topicHasData(id){ const x = TOPICS[id]; if (!x.metrics) return false; const p = periods(30); return x.metrics.some(k => hasData(k, ...p.cur) || hasData(k, ...p.prev)); }
/** 首页每一行的一句话：近 14 天主要指标和前 14 天比 */
function rowDesc(id, x){
  if (x.sec === "body") return esc(bodyRowDesc(id));
  if (id === "sleep") { const p = periods(14), v = METRICS.sleep.v(...p.cur); return v == null ? esc(t("记入睡和醒来，看每晚睡了多久")) : esc(t("近 14 天平均每晚 {v} 小时", { v: fmt("sleep", v) })); }
  if (!B.loaded) return esc(t("正在读取…"));
  const p = periods(14), parts = (x.metrics || []).filter(k => hasData(k, ...p.cur) || hasData(k, ...p.prev)).slice(0, 2).map(k => `${t(METRICS[k].label)} ${fmt(k, METRICS[k].v(...p.cur))} ${t(METRICS[k].unit)}`);
  return esc(parts.length ? `${t("近 14 天")} · ${parts.join(" · ")}` : t("还没有记录，点进去记一笔"));
}
function linkDesc(id){
  const cid = S.childId;
  if (id === "scr") return esc(t("已会背 {n} 节", { n: learnedCount(cid) }));
  if (!S.hs.phase2) return "";
  const units = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active), going = units.filter(u => { const p = unitProgress(u.id); return p.done < p.total; }).length;
  const p = periods(14), ids = new Set(units.map(u => u.id)), done = S.hs.lessons.filter(l => ids.has(l.unit_id) && l.status === "done" && l.done_on && dkTs(String(l.done_on).slice(0, 10)) >= p.cur[0]).length;
  return esc(t("{a} 个单元在学 · 近 14 天完成 {b} 节课时", { a: going, b: done }));
}

/* ============ 第 2 层：主题页 ============ */
function viewTopic(id){
  const x = TOPICS[id]; if (!x) return "";
  if (x.sec === "body") return bodyTopicHTML(id);
  const status = B.loading && !B.loaded ? `<p class="small muted" role="status">${t("正在读取记录…")}</p>` : B.err && !B.loaded ? `<p class="small muted" role="status">${t("读取小月亮失败：")}${esc(String(B.err).slice(0, 80))}</p>` : "";
  if (!B.loaded) return status;
  if (G.spanTopic !== id) { G.span = null; G.spanTopic = id; }
  const days = daysNow();
  const range = `<div class="seg gr-days" role="group" aria-label="${esc(t("时间范围"))}">${DAYS.map(d => `<button type="button" data-act="gr-days" data-v="${d}" aria-pressed="${d === days}">${t("近 {n} 天", { n: d })}</button>`).join("")}</div>`;
  const adds = (x.add || []).map(tileById).filter(Boolean).map((tl, i) => `<button type="button" class="btn ${i ? "" : "primary"} sm" data-act="ql-new" data-id="${tl.id}">＋ ${t(tl.label)}</button>`).join("");
  const extra = id === "gr-night" ? nightBlock(days) : id === "gr-class" ? classBlock(days) : "";
  return `<div class="gr-top">${range}<div class="gr-adds">${adds}</div></div>
    ${trendSection(id, x, days)}${extra}${recordsSection(id, x, days)}<p class="small muted gr-foot">${pullButtonHTML()}</p>`;
}
/* ---- 同一块里的上一个 / 下一个主题：电脑上页面底部两个按钮；手机上在页面上左右滑也能换（js 在下面） ---- */
const siblings = id => Object.keys(TOPICS).filter(k => TOPICS[k].sec === (TOPICS[id] || {}).sec);
function topicPager(id){
  const list = siblings(id), i = list.indexOf(id); if (i < 0 || list.length < 2) return "";
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  return `<nav class="gr-pager" aria-label="${esc(t("同一块里的其他主题"))}"><button type="button" class="btn sm" data-tab="${prev}">‹ ${TOPICS[prev].icon} ${t(TOPICS[prev].label)}</button>
    <span class="small muted gr-pager-hint">${t("手机上左右滑动也能换")}</span><button type="button" class="btn sm" data-tab="${next}">${TOPICS[next].icon} ${t(TOPICS[next].label)} ›</button></nav>`;
}
let sx = null;
document.addEventListener("touchstart", e => { const tch = e.touches[0]; sx = TOPICS[S.tab] && !e.target.closest(".scroll-x, input, textarea, select, .gr-chart, #sheet") ? { x: tch.clientX, y: tch.clientY } : null; }, { passive: true });
document.addEventListener("touchend", e => {
  if (!sx || !TOPICS[S.tab]) return; const tch = e.changedTouches[0], dx = tch.clientX - sx.x, dy = tch.clientY - sx.y; sx = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
  const list = siblings(S.tab), i = list.indexOf(S.tab); if (i < 0 || list.length < 2) return;
  S.tab = list[(i + (dx < 0 ? 1 : -1) + list.length) % list.length]; render(); window.scrollTo(0, 0);
}, { passive: true });
function tileHTML(k, p, days, cur){
  const M = METRICS[k], c = M.v(...p.cur), q = M.v(...p.prev), d = c == null || q == null ? null : c - q;
  const dir = d == null || Math.abs(d) < 1e-9 ? "" : (d > 0) !== BAD_UP.has(k) ? "good" : "bad";
  return `<button type="button" class="gr-tile" data-act="gr-metric" data-v="${k}" aria-pressed="${cur === k}" style="--c:${M.color}">
    <span class="gr-tl">${esc(t(M.label))}${M.kind === "avg" ? ` <span class="gr-avg">${t("平均")}</span>` : ""}</span>
    <span class="gr-tv num">${fmt(k, c)}<small>${esc(t(M.unit))}</small></span>
    <span class="gr-td"><span class="small muted">${t("前 {n} 天", { n: days })} ${fmt(k, q)}</span>${d == null ? "" : `<span class="gr-dl ${dir}">${d > 0 ? "↑" : d < 0 ? "↓" : "＝"}${Math.abs(d) < 1e-9 ? "" : fmt(k, Math.abs(d))}</span>`}</span>
  </button>`;
}
function trendSection(id, x, days){
  const p = periods(days), keys = x.metrics || [];
  const cur = keys.includes(G.metric[id]) ? G.metric[id] : keys[0];
  if (!keys.some(k => hasData(k, ...p.cur) || hasData(k, ...p.prev))) return `<div class="panel gr-empty"><p class="small muted" style="margin:0">${t("近 {n} 天还没有记录。点上面的「＋」记一笔，这里就会出现走势。", { n: days * 2 })}</p></div>`;
  const M = METRICS[cur], bk = buckets(days);
  const items = bk.map(b => { const v = M.v(dkTs(b.from), dkTs(b.to) + D); return { label: b.label, value: v == null ? 0 : +fmt(cur, v), color: M.color, drill: `gr:${id}|${b.from}|${b.to}` }; });
  return `<div class="gr-tiles">${keys.map(k => tileHTML(k, p, days, cur)).join("")}</div>
    <div class="panel gr-chart"><div class="gr-ch-h"><b>${esc(t(M.label))}</b> <span class="small muted">${esc(t(M.unit))} · ${days <= 14 ? t("每天一格") : t("每周一格（按周起始日标日期）")}${M.kind === "avg" ? ` · ${t("平均")}` : ""}</span></div>
      ${bars(items, { title: t(M.label) })}<p class="small muted gr-ch-f">${t("点柱子：下面只看那一天 / 那一周的记录")}</p></div>`;
}
function nightBlock(days){
  const dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D));
  return `<section class="gr-sec"><h2 class="gr-sh2">${t("每晚情况")}</h2>${nightDryHTML(dates, sleepNights(days), new Set(nightsIn(days).map(l => l.date)))}</section>`;
}
function classBlock(days){
  const from = periods(days).cur[0], by = new Map();
  for (const e of mineRows().filter(e => e.type === "activity" && e.kind === "课外班" && +e.ts >= from).sort((a, b) => b.ts - a.ts)) { const k = (e.what || t("课外班")).trim(), v = by.get(k) || { n: 0, min: 0, last: e }; v.n++; v.min += +e.minutes || 0; by.set(k, v); }
  if (!by.size) return "";
  return `<section class="gr-sec"><h2 class="gr-sh2">${t("每门课")}</h2><div class="panel mlist">${[...by].map(([k, v]) => `<div class="mrow gr-static"><span class="mi" aria-hidden="true">🎹</span><span class="mt"><b>${esc(k)}</b><small>${t("{n} 次", { n: v.n })}${v.min ? ` · ${t("{n} 分钟", { n: v.min })}` : ""}${v.last.progress ? ` · ${esc(v.last.progress)}` : ""}</small></span></div>`).join("")}</div></section>`;
}
function rowHTML(e, { time = false } = {}){
  const m = metaOf(e), sum = e.type === "behavior" ? [e.kind, e.trigger && t("起因：{s}", { s: e.trigger }), e.how && t("处理：{s}", { s: e.how })].filter(Boolean).map(x => t(x)).join(" · ") : summary(asRec(e));
  const when = time ? hm(e.ts) : `${e.date.slice(5)} ${hm(e.ts)}`;
  const inner = `<span class="title">${m.icon} <b>${esc(t(m.label))}</b> <span class="small muted num">${esc(when)}</span></span><span class="meta">${esc(sum || "")}${e.note ? ` · ${esc(e.note)}` : ""}</span>`;
  return `<div class="task"><span class="bar" style="background:${e.type === "behavior" ? "var(--rose)" : "var(--slate)"}"></span>
    ${e.type === "behavior" ? `<div class="main" style="cursor:default">${inner}</div>` : `<button type="button" class="main" data-act="ql-edit" data-id="${esc(e.id)}" aria-label="${esc(t("修改这一条"))}">${inner}</button>`}<span class="acts"></span></div>`;
}
const spanText = () => (!G.span ? "" : G.span.from === G.span.to ? G.span.from.slice(5) : `${G.span.from.slice(5)} – ${G.span.to.slice(5)}`);
function recordsSection(id, x, days){
  const from = periods(days).cur[0], types = new Set(x.types || []);
  const all = mineRows().filter(e => +e.ts >= from && types.has(typeKey(e))).map(e => ({ ...e, date: dayKey(e.ts) }))
    .filter(e => !G.span || (e.date >= G.span.from && e.date <= G.span.to)).sort((a, b) => b.ts - a.ts);
  const pg = paged("gr-rec", all), view = G.view === "timeline" ? "timeline" : "list";
  let body;
  if (!all.length) body = `<div class="empty">${G.span ? t("那几天没有记录。") : t("这段时间没有记录。")}</div>`;
  else if (view === "timeline") {
    const groups = []; pg.rows.forEach(r => { const g = groups[groups.length - 1]; if (g && g.date === r.date) g.items.push(r); else groups.push({ date: r.date, items: [r] }); });
    body = `<div class="tl">${groups.map(g => `<div class="tl-day"><div class="tl-head"><b>${esc(dayLabel(g.date))}</b> <span class="small muted">${g.date}</span></div>${g.items.map(r => `<div class="tl-item">${rowHTML(r, { time: true })}</div>`).join("")}</div>`).join("")}</div>`;
  } else body = `<div class="tasks">${pg.rows.map(r => rowHTML(r)).join("")}</div>`;
  const tag = G.span ? `<button type="button" class="gr-tag" data-act="gr-clear" aria-label="${esc(t("去掉这个筛选：{s}", { s: spanText() }))}">📅 ${esc(spanText())} <span aria-hidden="true">✕</span></button>` : "";
  return `<section class="gr-sec" id="grRec" aria-labelledby="grRecH">
    <div class="gr-sh"><h2 id="grRecH">${t("记录")} <span class="small muted gr-n">${t("{n} 条", { n: all.length })}</span> ${tag}</h2>
      <div class="seg gr-seg" role="group" aria-label="${t("视图")}"><button type="button" data-act="gr-view" data-v="list" aria-pressed="${view === "list"}">${t("列表")}</button><button type="button" data-act="gr-view" data-v="timeline" aria-pressed="${view === "timeline"}">${t("时间线")}</button></div></div>
    <div class="panel">${body}${pg.more}</div>
    <p class="small muted gr-foot">${x.types.includes("behavior") ? t("点一条可以修改或删除（情绪行为在冲突管理 / 小月亮里改）。") : t("点一条可以修改或删除。")}${t("最多看最近 2 个月；和小月亮是同一份记录。")}</p>
  </section>`;
}

/* ---- 给 AI 身心灵分析和咩咩咩用 ---- */
function metricsList(days){
  const p = periods(days);
  return shownMetrics(days).map(k => { const M = METRICS[k]; return { key: k, label: M.label, unit: M.unit, kind: M.kind, cur: M.v(...p.cur), prev: M.v(...p.prev) }; });
}
function growthContext(days){
  const lines = metricsList(days).map(m => `- ${m.label}（${m.unit}，${m.kind === "avg" ? "平均" : "合计"}）：近 ${days} 天 ${fmt(m.key, m.cur)}，前 ${days} 天 ${fmt(m.key, m.prev)}`);
  return `日常记录（家庭学堂「记一笔」和小月亮，近 ${days} 天 vs 前 ${days} 天）：\n${lines.length ? lines.join("\n") : "- 没有记录"}\n\n${flowContext({ days })}`;
}

/* ---- 事件 ---- */
const toRec = () => setTimeout(() => document.getElementById("grRec")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
async function growthAct(act, btn){
  if (bodyAct(act, btn)) return;   // 身体与健康（js/growth-body.js）
  if (await reviewAct(act, btn)) return;   // AI 身心灵分析（js/growth-review.js）
  const d = btn.dataset;
  switch (act) {
    case "gr-days": G.days = +d.v; G.span = null; resetPage("gr-rec"); render(); break;
    case "gr-view": G.view = d.v; render(); break;
    case "gr-metric": G.metric[S.tab] = d.v; render(); break;
    case "gr-clear": G.span = null; resetPage("gr-rec"); render(); break;
    case "gr-ask": { const days = daysNow(); askAbout({ q: t("分析这个孩子最近的日常记录（如厕、夜间干爽、吃饭、睡眠作息、户外 / 阅读 / 屏幕、情绪）：有什么规律？哪些地方进步了、哪些需要调整？下一步具体怎么做？"), extra: growthContext(days), name: t("日常记录摘要（近 {n} 天）", { n: days }), from: "growth" }); break; }
  }
}
/** 柱状图点了一根（charts.js 的 data-libf="gr:主题|起|止"）：下面的记录只看那几天 */
function growthDrill(v){
  const [id, from, to] = String(v).split("|"); if (!TOPICS[id] || !from) return;
  G.span = { from, to: to || from }; G.spanTopic = id; resetPage("gr-rec"); render(); toRec();
}
/** 以前的下拉（页面导航、筛选器）都换成了按钮；保留这个出口给 events.js */
const growthChange = () => false;
/** 第 2 层每一页（views.js 注册） */
const topicView = id => () => `${viewTopic(id)}${topicPager(id)}`;

export { metricsList, viewGrowth, topicView, growthAct, growthChange, growthContext, growthDrill };
