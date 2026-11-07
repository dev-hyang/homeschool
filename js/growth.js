import { t } from "./core/i18n.js";
import { S, ageMonths, ageText, childName } from "./core/state.js";
import { D, dayKey, esc, hm } from "./core/util.js";
import { bars } from "./charts.js";
import { recordsHTML } from "./recfilter.js";
import { aiIcon, askAbout } from "./ask.js";
import { TILES, summary, tileOf } from "./quicklog.js";
import { nightList } from "./nightdry.js";
import { B, buckets, flowContext, inB, mineRows, nightDryHTML, nightsIn, pullButtonHTML, sleepNights } from "./flows-trend.js";
import { render } from "./views.js";

/* ============ 成长记录：2 岁以上孩子的日常记录与趋势（小月亮不再显示 2 岁以上，这里是找它们的地方） ============
   入口：今天页「记一笔」卡片的「全部记录 ›」、我的页的「成长记录」、夜间干爽那行的「趋势 ›」。
   数据：和趋势与分析同一份（flows-trend.js 的 S.cf：小月亮 entries 近 61 天，按 1000 行一页读，最多 4000 行），不另外读。
   两个视图：
   ① 记录：记一笔的各种记录 + 小月亮里的情绪行为，按类型筛、按日期范围看，点一条用记一笔的同一张表单改 / 删；
   ② 趋势：近 7 / 14 / 30 天 vs 前一段同样长的对比表、选一个指标看柱状图（14 天以内每天一根，30 天每周一根）、夜间干爽一节（和趋势与分析同一块），
      「让咩咩咩分析」带上这些指标 + 趋势与分析的摘要（睡眠、睡前流程、冲突、夜间干爽）。
   睡眠、睡前安然、睡前流程和冲突的趋势还在原来的页面，顶上一行链接过去。 */
const G = (S.gr = S.gr || { view: "list", type: "all", days: 14, metric: null });
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
  social:   { label: "社交", unit: "次", kind: "sum", color: "#5B8E5A", v: (a, b) => rowsIn(a, b, "social").length }
};
/** 按年龄排：小的先看如厕、夜间干爽、睡眠、吃饭；大的先看情绪、陪伴、阅读、屏幕 */
function metricOrder(){
  const m = ageMonths();
  if (m != null && m < 48) return ["potty", "accident", "dry", "sleep", "meals", "mealMin", "outdoor", "read", "tantrum", "words", "screen", "mood", "companion", "social"];
  if (m != null && m < 84) return ["dry", "sleep", "outdoor", "read", "screen", "meals", "mealMin", "tantrum", "mood", "potty", "accident", "companion", "words", "social"];
  return ["mood", "companion", "read", "outdoor", "screen", "sleep", "social", "tantrum", "meals", "mealMin", "dry", "potty", "accident", "words"];
}
const fmt = (k, v) => (v == null ? "–" : String(Math.round(v * 10 ** (METRICS[k].dec || 0)) / 10 ** (METRICS[k].dec || 0)));
const hasData = (k, a, b) => { const M = METRICS[k]; if (M.has) return M.has(a, b); const v = M.v(a, b); return v != null && v !== 0; };
/** 当前 N 天（含今天）和前 N 天 */
function periods(days){
  const end = new Date(); end.setHours(0, 0, 0, 0); const b = end.getTime() + D, a = b - days * D;
  return { cur: [a, b], prev: [a - days * D, a] };
}
const shownMetrics = days => { const p = periods(days); return metricOrder().filter(k => hasData(k, ...p.cur) || hasData(k, ...p.prev)); };

/* ---- 记录 ---- */
const asRec = e => ({ id: e.id, ts: +e.ts, data: e });
function listItems(){
  return mineRows().filter(e => LIST_TYPES.has(e.type) && (G.type === "all" || typeKey(e) === G.type)).map(e => ({ ...e, date: dayKey(e.ts), updated_at: String(e.ts).padStart(15, "0") }));
}
/** 筛选用的类型：活动按 kind 分成户外 / 阅读 / 音乐 / 屏幕（和记一笔的格子一致） */
const typeKey = e => { const tl = e.type === "behavior" ? null : tileOf(asRec(e)); return tl ? tl.id : e.type; };
const metaOf = e => (e.type === "behavior" ? BEH : tileOf(asRec(e)) || { icon: "📝", label: e.type });
function rowHTML(e){
  const m = metaOf(e), sum = e.type === "behavior" ? [e.kind, e.trigger && t("起因：{s}", { s: e.trigger }), e.how && t("处理：{s}", { s: e.how })].filter(Boolean).map(x => t(x)).join(" · ") : summary(asRec(e));
  const inner = `<span class="title">${m.icon} <b>${esc(t(m.label))}</b> <span class="small muted num">${esc(e.date.slice(5))} ${hm(e.ts)}</span></span><span class="meta">${esc(sum || "")}${e.note ? ` · ${esc(e.note)}` : ""}</span>`;
  return `<div class="task"><span class="bar" style="background:${e.type === "behavior" ? "var(--rose)" : "var(--slate)"}"></span>
    ${e.type === "behavior" ? `<div class="main" style="cursor:default">${inner}</div>` : `<button type="button" class="main" data-act="ql-edit" data-id="${esc(e.id)}" aria-label="${esc(t("修改这一条"))}">${inner}</button>`}<span class="acts"></span></div>`;
}
function listView(){
  const present = new Set(mineRows().filter(e => LIST_TYPES.has(e.type)).map(typeKey));
  const opts = [...TILES.filter(x => present.has(x.id)).map(x => [x.id, `${x.icon} ${t(x.label)}`]), ...(present.has("behavior") ? [["behavior", `${BEH.icon} ${t(BEH.label)}`]] : [])];
  if (G.type !== "all" && !present.has(G.type)) G.type = "all";
  return `<div class="chips gr-types" role="group" aria-label="${t("按类型筛选")}"><button type="button" class="chip" data-act="gr-type" data-v="all" aria-pressed="${G.type === "all"}">${t("全部")}</button>${opts.map(([k, l]) => `<button type="button" class="chip" data-act="gr-type" data-v="${k}" aria-pressed="${G.type === k}">${esc(l)}</button>`).join("")}</div>
  ${recordsHTML("gr", listItems(), rowHTML, null, t("这段时间没有记录。在今天页「记一笔」点一格就能记。"))}
  <p class="small muted" style="margin-top:8px">${t("点一条可以修改或删除（情绪行为在冲突管理 / 小月亮里改）。这里显示最近 2 个月；和小月亮是同一份记录。")}</p>`;
}

/* ---- 趋势 ---- */
const DAYS = [7, 14, 30];
function trendView(){
  const days = DAYS.includes(G.days) ? G.days : 14, p = periods(days), keys = shownMetrics(days);
  if (!keys.includes(G.metric)) G.metric = keys[0] || null;
  const dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D)), on = new Set(nightsIn(days).map(l => l.date));
  const per = [t("近 {n} 天", { n: days }), t("前 {n} 天", { n: days })];
  const rows = keys.map(k => {
    const c = METRICS[k].v(...p.cur), q = METRICS[k].v(...p.prev), d = c == null || q == null ? null : c - q;
    return `<tr><td><button type="button" class="linkbtn" data-act="gr-metric" data-v="${k}" aria-pressed="${G.metric === k}">${esc(t(METRICS[k].label))}</button> <span class="small muted">${esc(t(METRICS[k].unit))}${METRICS[k].kind === "avg" ? ` · ${t("平均")}` : ""}</span></td>
      <td class="num">${fmt(k, c)}</td><td class="num">${fmt(k, q)}</td><td class="num ${d == null || Math.abs(d) < 1e-9 ? "" : d > 0 ? "up" : "down"}">${d == null ? "–" : (d > 0 ? "↑" : d < 0 ? "↓" : "") + fmt(k, Math.abs(d))}</td></tr>`;
  }).join("");
  let chart = "";
  if (G.metric) {
    const M = METRICS[G.metric], bk = buckets(days);
    const items = bk.map(b => { const v = M.v(dkTs(b.from), dkTs(b.to) + D); return { label: b.label, value: v == null ? 0 : +fmt(G.metric, v), color: M.color }; });
    chart = `<h2>${esc(t(M.label))} <span class="small muted">${esc(t(M.unit))} · ${days <= 14 ? t("每天一格") : t("每周一格（按周起始日标日期）")}${M.kind === "avg" ? ` · ${t("平均")}` : ""}</span></h2>
      <div class="panel"><label class="gr-msel"><span class="small muted">${t("指标")}</span> <select data-grmetric>${keys.map(k => `<option value="${k}" ${k === G.metric ? "selected" : ""}>${esc(t(METRICS[k].label))}</option>`).join("")}</select></label>${bars(items, { title: t(M.label) })}</div>`;
  }
  return `<div class="chips" role="group" aria-label="${t("时间范围")}">${DAYS.map(d => `<button type="button" class="chip" data-act="gr-days" data-v="${d}" aria-pressed="${days === d}">${t("近 {n} 天", { n: d })}</button>`).join("")}</div>
  <div class="panel">${keys.length ? `<div class="scroll-x"><table class="gr-cmp"><thead><tr><th>${t("指标")}</th><th class="num">${per[0]}</th><th class="num">${per[1]}</th><th class="num">${t("变化")}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted" style="margin:6px 0 0">${t("次数、分钟是这段时间的合计；心情、用餐时长、夜间睡眠是平均。点指标名看柱状图。记得越全越准，样本少时只作参考。")}</p>`
    : `<p class="small muted" style="margin:0">${t("这段时间还没有记录。在今天页「记一笔」记几天，这里就能看到变化。")}</p>`}
    <div class="btns" style="margin-top:10px"><button class="btn primary sm" data-act="gr-ask">${aiIcon(16)} ${t("让咩咩咩分析最近的记录")}</button></div></div>
  ${chart}
  ${nightDryHTML(dates, sleepNights(days), on)}`;
}

/** 交给咩咩咩：各指标近 N 天 vs 前 N 天 + 趋势与分析的摘要（睡眠、睡前流程、冲突、夜间干爽） */
function growthContext(days){
  const p = periods(days), lines = shownMetrics(days).map(k => {
    const M = METRICS[k], c = M.v(...p.cur), q = M.v(...p.prev);
    return `- ${M.label}（${M.unit}，${M.kind === "avg" ? "平均" : "合计"}）：近 ${days} 天 ${fmt(k, c)}，前 ${days} 天 ${fmt(k, q)}`;
  });
  return `日常记录（家庭学堂「记一笔」和小月亮，近 ${days} 天 vs 前 ${days} 天）：\n${lines.length ? lines.join("\n") : "- 没有记录"}\n\n${flowContext({ days })}`;
}

function viewGrowth(){
  const view = G.view === "trend" ? "trend" : "list";
  const status = B.loading && !B.loaded ? `<p class="small muted" role="status">${t("正在读取记录…")}</p>` : B.err && !B.loaded ? `<p class="small muted" role="status">${t("读取小月亮失败：")}${esc(String(B.err).slice(0, 80))}</p>` : "";
  return `<h2>${esc(t("{n}的成长记录", { n: childName() }))} <span class="small muted" style="font-family:var(--f-body);font-weight:400">${esc(ageText())}</span></h2>
  <div class="gr-links small"><button type="button" class="bt-more" data-tab="sleep" data-from="growth">🌙 ${t("睡眠")} ›</button><button type="button" class="bt-more" data-tab="bedtime" data-from="growth">🕯 ${t("睡前安然")} ›</button><button type="button" class="bt-more" data-tab="flow-trend" data-from="growth">📈 ${t("趋势与分析（睡前流程、冲突）")} ›</button></div>
  <div class="seg gr-view" role="group" aria-label="${t("视图")}"><button type="button" data-act="gr-view" data-v="list" aria-pressed="${view === "list"}">${t("记录")}</button><button type="button" data-act="gr-view" data-v="trend" aria-pressed="${view === "trend"}">${t("趋势")}</button></div>
  ${status}
  ${B.loaded ? (view === "trend" ? trendView() : listView()) : ""}
  <p class="small muted" style="margin-top:10px">${pullButtonHTML()}</p>`;
}

async function growthAct(act, btn){
  const d = btn.dataset;
  switch (act) {
    case "gr-view": G.view = d.v; render(); break;
    case "gr-type": G.type = d.v; render(); break;
    case "gr-days": G.days = +d.v; render(); break;
    case "gr-metric": G.metric = d.v; render(); break;
    case "gr-ask": { const days = DAYS.includes(G.days) ? G.days : 14; askAbout({ q: t("分析这个孩子最近的日常记录（如厕、夜间干爽、吃饭、睡眠作息、户外 / 阅读 / 屏幕、情绪）：有什么规律？哪些地方进步了、哪些需要调整？下一步具体怎么做？"), extra: growthContext(days), name: t("日常记录摘要（近 {n} 天）", { n: days }), from: "growth" }); break; }
  }
}
/** 指标下拉（change 事件） */
function growthChange(el){ if (el.dataset.grmetric === undefined) return false; G.metric = el.value; render(); return true; }

export { viewGrowth, growthAct, growthChange, growthContext };
