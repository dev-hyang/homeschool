import { SB } from "./core/auth.js";
import { selectAll } from "./core/paged.js";
import { t, tc } from "./core/i18n.js";
import { S, ageMonths, ageText } from "./core/state.js";
import { D, dayKey, esc, toast } from "./core/util.js";
import { CONFLICTS, SIDES, STAGE_NAME, bandOf, contentFor } from "./data/flows.js";
import { EMOTIONS } from "./data/emotions.js";
import { aiIcon, askAbout } from "./ask.js";
import { bars, stack } from "./charts.js";
import { cfg, h2, isCf, offlineHTML, sidesHint } from "./bedtime.js";
import { render } from "./views.js";

/* ============ 定制流程的数据、趋势与「问咩咩咩」 ============
   一份数据（家庭学堂自己的睡前记录 + 冲突记录 + 小月亮里的睡眠 / 情绪行为 / 社交记录），三种用法：
   ① 冲突管理的每张状况卡（小月亮里的表现）；② 趋势与分析页的图表；③ 把摘要交给咩咩咩（askAbout）：
   状况卡的「问一问咩咩咩」、趋势页的「让咩咩咩分析」、定制流程页的直接入口，用的是同一个摘要（flowContext），页面上「会发送什么」能看原文。
   摘要只有统计和你写的处理办法 / 起因，不含孩子姓名和备注。小月亮的记录只读，不写回。 */
const B = (S.cf = S.cf || { loaded: false, loading: false, rows: [], ts: 0, err: "", fresh: 0, key: "", gen: 0 });
const fid = () => S.family && S.family.id;

/* ---- 小月亮的记录（只读）：情绪行为、社交、睡眠、情绪、自律、活动（屏幕），近 61 天 ----
   默认自动同步：每次打开带「从小月亮重新读取」按钮的页面（冲突管理、情绪管理、趋势与分析），都在后台先拉一次；
   拉的时候按钮是灰色的、点不了；拉完提示「已同步最新小月亮记录」。一直停在这页、小月亮那边又有新记录时，可以再点按钮手动拉。 */
const PULL_TABS = new Set(["flow-conflict", "flow-emotion", "flow-trend"]);
const DAYS = 61, MAX_ROWS = 4000;
/* 新鲜度：60 秒内拉过、家庭和天数都没变，在这几页之间来回切换就直接用上次的，不再重拉；
   小月亮的记录有变动（实时推送 entries）或这里回写了冲突记录时，bedtime.js 把 S.cf.fresh 清零、S.cf.gen 加一，下次进来照常拉。手动按钮总是重拉。 */
const FRESH_MS = 60e3;
const isFresh = () => B.loaded && B.fresh && Date.now() - B.fresh < FRESH_MS && B.key === `${fid()}|${DAYS}`;
const canPull = () => !!(SB.client && fid() && S.hs.loaded);
let enteredTab = null;
async function pull({ quiet = false, renderNow = true } = {}){
  if (B.loading || !canPull()) return;
  B.loading = true; B.err = "";
  if (renderNow && PULL_TABS.has(S.tab)) render();   // 按钮立刻变灰
  let data = null, error = null;
  const f = fid(), since = Date.now() - DAYS * D, gen = B.gen || 0;
  // 一次最多回 1000 行：按 1000 行一页读，最多 4000 行；ts 相同时按 id 排，翻页不重不漏（js/core/paged.js）
  try { ({ data, error } = await selectAll(() => SB.client.from("entries").select("id,type,ts,data").eq("family_id", f).in("type", ["behavior", "social", "sleep", "mood", "habit", "activity"]).eq("deleted", false).gte("ts", since).order("ts", { ascending: false }).order("id"), MAX_ROWS)); }
  catch (e) { error = { message: (e && e.message) || "network" }; }   // 网络异常也要把按钮放开
  B.loading = false; B.ts = Date.now(); B.loaded = !error; B.err = error ? (error.message || "error") : "";
  B.fresh = error || (B.gen || 0) !== gen ? 0 : B.ts; B.key = `${f}|${DAYS}`;   // 拉的途中被清过（gen 变了）就不算新鲜
  if (!error) B.rows = (data || []).map(r => ({ ...(r.data || {}), id: r.id, type: r.type, ts: r.ts }));
  if (PULL_TABS.has(S.tab)) render();
  if (!quiet) toast(error ? t("读取小月亮失败：") + String(B.err).slice(0, 80) : t("已同步最新小月亮记录（{n} 条）", { n: (data || []).length }));
}
/* views.js 每次画页面之前调：刚进入这几页就自动拉一次；离开这几页再进来会再拉（60 秒内拉过的不重拉，见 isFresh） */
function beforeRender(tab){
  if (!PULL_TABS.has(tab)) { enteredTab = null; return; }
  if (enteredTab === tab || !canPull()) return;
  enteredTab = tab; if (!isFresh()) pull({ renderNow: false });
}
const loadBaby = () => pull({ quiet: true });
const hhmm = ts => { const d = new Date(ts); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };
/** 「从小月亮重新读取」按钮：拉的时候灰色不可点；旁边写上次同步的时间 */
const pullButtonHTML = () => `<button type="button" class="chip pull-btn" data-act="tr-refresh" ${B.loading || !canPull() ? "disabled" : ""}>${B.loading ? t("正在同步小月亮…") : t("从小月亮重新读取")}</button> <span class="small muted">${B.loading ? "" : B.loaded ? t("上次同步 {t}", { t: hhmm(B.ts) }) : B.err ? esc(t("读取失败：") + B.err) : canPull() ? "" : t("登录并进入家庭后才能读取")}</span>`;
const mineRows = () => { const cid = S.childId, first = S.children[0] && S.children[0].id; return B.rows.filter(e => e.child === cid || (!e.child && first === cid)); };

/* 内置状况 + 自家加的（cfg.situations 里 id 以 cf- 开头的）*/
/* 孩子的性别（可选）：小月亮里没有这一项，放在家庭学堂设置里按孩子单独记；只用来决定哪些内容显示给他（比如青春期） */
const genderOf = (cid = S.childId) => ((S.hs.settings.genders || {})[cid]) || "";
const bandKey = () => bandOf(ageMonths());
const allEmotions = () => EMOTIONS;
const allConflicts = (c = cfg()) => [...CONFLICTS, ...c.situations.filter(x => String(x.id).startsWith("cf-") && !CONFLICTS.some(s => s.id === x.id)).map(x => ({ ...x, custom: true, bl: x.bl || { kinds: [x.write || "发脾气"], social: [] } }))];
const sitOf = id => allConflicts().find(s => s.id === id) || EMOTIONS.find(s => s.id === id) || null;
const whyOf = (s, band) => contentFor(s, band).why;

const hasBl = sit => !!(sit.bl && ((sit.bl.kinds || []).length || (sit.bl.social || []).length || (sit.bl.mood || []).length || (sit.bl.habit || []).length || (sit.bl.activity || []).length));
function blStats(sit){
  const rows = mineRows(), now = Date.now(), c30 = now - 30 * D, b = sit.bl || {};
  const hit = e => (e.type === "behavior" && (b.kinds || []).includes(e.kind)) || (e.type === "social" && (b.social || []).includes(e.kind)) || (e.type === "mood" && (b.mood || []).includes(e.kind)) || (e.type === "habit" && (b.habit || []).includes(e.kind)) || (e.type === "activity" && (b.activity || []).includes(e.kind));
  const all = rows.filter(hit), cur = all.filter(e => e.ts >= c30), prev = all.filter(e => e.ts < c30);
  const mins = cur.filter(e => +e.minutes > 0), how = {};
  all.forEach(e => { const h = String(e.how || "").trim(); if (h) how[h] = (how[h] || 0) + 1; });
  const sumMin = cur.reduce((a, e) => a + (+e.minutes || 0), 0);
  return { cur: cur.length, prev: prev.length, sumMin, dayAvg: Math.round(sumMin / 30), prevSum: prev.reduce((a, e) => a + (+e.minutes || 0), 0), avgMin: mins.length ? Math.round(mins.reduce((a, e) => a + +e.minutes, 0) / mins.length) : null,
    how: Object.entries(how).sort((a, c) => c[1] - a[1]).slice(0, 3).map(x => x[0]), fromHere: all.filter(e => String(e.id).startsWith("hscf-")).length };
}

/* ---- 睡眠：每个晚上取最长的一段夜间睡眠（18 点后或凌晨 4 点前入睡、至少 3 小时）。bed = 离 18:00 的分钟数，wake = 当天的分钟数 ---- */
function sleepNights(days){
  const from = Date.now() - days * D, by = {};
  for (const e of mineRows()) {
    if (e.type !== "sleep" || !e.end || e.end <= e.ts || e.ts < from - D) continue;
    const d = new Date(e.ts), h = d.getHours(), dur = e.end - e.ts; if (!(h >= 18 || h < 4) || dur < 3 * 3600e3) continue;
    const date = h >= 18 ? dayKey(e.ts) : dayKey(e.ts - D), w = new Date(e.end);
    if (!by[date] || dur > by[date].dur) by[date] = { date, bed: (h >= 18 ? h - 18 : h + 6) * 60 + d.getMinutes(), wake: w.getHours() * 60 + w.getMinutes(), dur };
  }
  return Object.values(by).filter(x => x.date >= dayKey(from)).sort((a, b) => a.date.localeCompare(b.date));
}
const pad2 = n => String(n).padStart(2, "0");
const clockOfDay = m => `${pad2(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad2(Math.round(((m % 1440) + 1440) % 1440 % 60))}`;
const bedClock = v => clockOfDay(18 * 60 + v);
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
const countText = m => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("、");

const sinceKey = days => dayKey(Date.now() - (days - 1) * D);
const eventsIn = days => S.bt.events.filter(e => isCf(e) && e.date >= sinceKey(days));
const isNapLog = l => !!(l && l.steps && l.steps[0] && l.steps[0].kind === "nap");   // 午睡流程不算「晚上做了睡前流程」
const nightsIn = days => S.bt.logs.filter(l => l.date >= sinceKey(days) && !isNapLog(l));
const napsIn = days => S.bt.logs.filter(l => l.date >= sinceKey(days) && isNapLog(l));

/* ============ 摘要：交给咩咩咩的上下文（也是「会发送什么」里能看到的原文）============ */
function flowContext({ days = 14, focus = null } = {}){
  const L = [], stage = bandKey(), evs = eventsIn(days), logs = nightsIn(days), nights = sleepNights(days);
  L.push(`孩子 ${ageText()}（${STAGE_NAME[stage]}）${genderOf() ? "，" + (genderOf() === "f" ? "女孩" : "男孩") : ""}。记录区间：最近 ${days} 天。`);
  if (logs.length) {
    const mins = logs.map(l => +l.actual_min || 0), plan = logs.map(l => +l.planned_min || 0).filter(Boolean);
    L.push(`睡前流程：${logs.length} 晚做了（共 ${days} 晚），平均 ${Math.round(avg(mins))} 分钟${plan.length ? `（计划约 ${Math.round(avg(plan))}）` : ""}；孩子状态：${countText(count(logs, l => l.child_state)) || "没记"}；大人状态：${countText(count(logs, l => l.parent_state)) || "没记"}。`);
  } else L.push(`睡前流程：这 ${days} 天没有记录。`);
  if (napsIn(days).length) L.push(`午睡流程：${napsIn(days).length} 次。`);
  if (nights.length) {
    const on = new Set(logs.map(l => l.date)), withR = nights.filter(n => on.has(n.date)), without = nights.filter(n => !on.has(n.date));
    const part = (a, label) => a.length ? `${label}（${a.length} 晚）平均入睡 ${bedClock(avg(a.map(x => x.bed)))}、起床 ${clockOfDay(avg(a.map(x => x.wake)))}` : "";
    L.push(`睡眠（小月亮的记录，${nights.length} 晚）：平均入睡 ${bedClock(avg(nights.map(n => n.bed)))}（最早 ${bedClock(Math.min(...nights.map(n => n.bed)))}，最晚 ${bedClock(Math.max(...nights.map(n => n.bed)))}），平均起床 ${clockOfDay(avg(nights.map(n => n.wake)))}，平均睡 ${(avg(nights.map(n => n.dur)) / 3600e3).toFixed(1)} 小时。${[part(withR, "做了睡前流程的晚上"), part(without, "没做的晚上")].filter(Boolean).join("；")}`);
  } else L.push("睡眠：小月亮里这段时间没有可用的夜间睡眠记录。");
  if (evs.length) {
    const by = count(evs, e => (sitOf(e.situation) || { when: e.title || "其他" }).when), calm = evs.filter(e => e.outcome === "calm").length, mins = evs.filter(e => e.minutes != null).map(e => +e.minutes);
    const heated = evs.filter(e => SIDES.heated.includes(e.parent_state)).length;
    L.push(`冲突记录：共 ${evs.length} 次（${countText(by)}）；平静下来 ${calm} 次${mins.length ? `；平均处理 ${Math.round(avg(mins))} 分钟` : ""}；孩子当时的状态：${countText(count(evs, e => e.child_state)) || "没记"}；大人当时的状态：${countText(count(evs, e => e.parent_state)) || "没记"}${heated ? `（其中大人情绪升高 ${heated} 次）` : ""}。`);
    const keep = evs.filter(e => e.keep && e.approach).slice(0, 5).map(e => `${(sitOf(e.situation) || { when: "其他" }).when}：${e.approach}`);
    if (keep.length) L.push(`标了「值得继续」的做法：${keep.join("；")}。`);
    const bad = evs.filter(e => (e.outcome === "none" || e.outcome === "worse") && e.approach).slice(0, 5).map(e => `${(sitOf(e.situation) || { when: "其他" }).when}：${e.approach}（${e.outcome === "worse" ? "更糟了" : "没什么用"}）`);
    if (bad.length) L.push(`试过但没用的做法：${bad.join("；")}。`);
  } else L.push(`冲突记录：这 ${days} 天没有记录。`);
  const emEv = S.bt.events.filter(e => String(e.situation || "").startsWith("em-") && e.date >= sinceKey(days));
  if (emEv.length) L.push(`情绪管理记录：共 ${emEv.length} 次（${countText(count(emEv, e => (sitOf(e.situation) || { when: "其他" }).when))}）；孩子当时的状态：${countText(count(emEv, e => e.child_state)) || "没记"}；大人当时的状态：${countText(count(emEv, e => e.parent_state)) || "没记"}。`);
  const scr = mineRows().filter(e => e.type === "activity" && e.kind === "屏幕" && e.ts >= Date.now() - days * D);
  if (scr.length) L.push(`屏幕（小月亮的活动记录）：${scr.length} 次，共 ${scr.reduce((a, e) => a + (+e.minutes || 0), 0)} 分钟，日均约 ${Math.round(scr.reduce((a, e) => a + (+e.minutes || 0), 0) / days)} 分钟。`);
  const beh = mineRows().filter(e => e.type === "behavior" && e.ts >= Date.now() - days * D);
  if (beh.length) L.push(`小月亮里的情绪行为（${beh.length} 条）：${countText(count(beh, e => e.kind))}。`);
  if (focus) {
    const s = sitOf(focus);
    if (s) {
      const mine = S.bt.events.filter(e => e.situation === focus).slice(0, 6);
      if (focus.startsWith("em-")) L.push("（这是一种持续的情绪 / 习惯，不是一次冲突；回答里请着重「平时怎么陪伴」。）");
      L.push(`\n关注的状况：${s.when}（${s.short || ""}）。\n这个年龄段的解释（应用自带）：${whyOf(s, stage)}\n应用自带的做法：${contentFor(s, stage).steps.join("；")}`);
      if (mine.length) L.push(`家里在这个状况下最近的记录：\n${mine.map(e => `- ${e.date}：${e.approach || "（没写做法）"}；结果 ${({ calm: "平静下来了", partly: "勉强过去了", none: "没什么用", worse: "更糟了" })[e.outcome] || "没记"}${e.minutes != null ? `，用了 ${e.minutes} 分钟` : ""}${e.child_state ? `；孩子 ${e.child_state}` : ""}${e.parent_state ? `；大人 ${e.parent_state}` : ""}${e.title ? `；起因：${e.title}` : ""}`).join("\n")}`);
      else L.push("家里还没有在这个状况下的记录。");
    }
  }
  return L.join("\n");
}
const ctxName = days => t("睡眠、睡前流程、冲突的记录摘要（最近 {n} 天）", { n: days });

/* ============ 定制流程页上的「问咩咩咩」直接入口 ============ */
const HUB_PROMPTS = [
  ["分析最近的记录", "分析这个孩子最近的睡眠、睡前流程和冲突记录（孩子和大人两方面都看）：有什么规律？哪些做法有效？下一步怎么调整？"],
  ["孩子总不肯睡", "孩子总是不肯好好睡、反复下床，结合最近的记录，今晚和这一周可以怎么安排睡前流程？哪一步可以缩短或加强？"],
  ["睡前拖拖拉拉", "睡前流程总是拖得很长，孩子第二天起得晚、很多事情又拖拖拉拉。怎么压缩时间又不草率，让孩子准点上床？"],
  ["我总忍不住发脾气", "我（家长）在睡前或孩子闹的时候常常控制不住发脾气，事后又自责。结合最近的记录，帮我设计一个自己的应对办法，以及事后向孩子修复关系的话。"],
  ["兄弟姐妹吵架打架", "孩子们之间常有争抢、打人、大喊。结合最近的记录和孩子的年龄，怎么在当场处理，又怎么预防？"],
  ["管教后又自责", "我管教孩子之后常常觉得太严厉、缺少耐心和爱心，不管又怕孩子不守规矩。怎么拿捏「安抚多过刑罚，但不放弃管教」的界限？"]
];
function hubAskHTML(){
  return `<div class="panel bt-ask"><div class="bt-card-row"><div><b>${aiIcon(20)} ${t("咩咩咩 · 问一问")}</b><div class="small muted">${t("会带上最近 14 天的睡眠、睡前流程和冲突记录（孩子和大人两方面）。点一个话题，或自己写问题；「会发送什么」里能看到原文。")}</div></div></div>
    <div class="chips">${HUB_PROMPTS.map(([n], i) => `<button type="button" class="chip" data-act="tr-ask-hub" data-i="${i}">${esc(t(n))}</button>`).join("")}<button type="button" class="chip" data-act="tr-ask-hub" data-i="free">${t("自己写…")}</button></div></div>`;
}

/* ============ 趋势与分析页 ============ */
const TREND_DAYS = [7, 14, 30, 60];
const stateColor = k => ({ "平静": "var(--sage)", "安静入睡": "var(--sage)", "有点累": "var(--sky)", "有点急": "var(--honey)", "有点闹": "var(--honey)", "兴奋": "var(--honey)", "提高了声音": "var(--rose)", "生气": "var(--rose)", "哭闹抗拒": "var(--rose)", "发了脾气": "#8E1A14", "难过": "var(--sky)", "委屈": "var(--sky)", "害怕": "var(--slate)", "累了": "var(--slate)", "很晚才睡": "var(--slate)", "换人接手": "var(--slate)" })[k] || "var(--line)";
function buckets(days){
  const list = [], dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D));
  if (days <= 14) dates.forEach(d => list.push({ label: d.slice(8), from: d, to: d }));
  else for (let i = 0; i < dates.length; i += 7) { const part = dates.slice(i, i + 7); list.push({ label: part[0].slice(5).replace("-", "/"), from: part[0], to: part[part.length - 1] }); }
  return list;
}
const inB = (b, date) => date >= b.from && date <= b.to;

/** 时间点图：每个晚上一个点；做了睡前流程的是实心金点，没做的是空心点；虚线是平均 */
function timeDots(title, pts, dates, fmt){
  if (!pts.length) return `<p class="small muted">${t("小月亮里还没有这段时间的夜间睡眠记录。记几天睡眠（开始和醒来），这里就能和睡前流程对照。")}</p>`;
  const W = 300, H = 140, L = 36, Bm = 22, T = 8, R = 8, vs = pts.map(p => p.v), lo = Math.floor((Math.min(...vs) - 20) / 60) * 60, hi = Math.max(lo + 120, Math.ceil((Math.max(...vs) + 20) / 60) * 60);
  const n = dates.length, X = i => L + (n <= 1 ? 0.5 : i / (n - 1)) * (W - L - R), Y = v => T + (v - lo) / (hi - lo) * (H - T - Bm);
  const grid = []; for (let v = lo; v <= hi; v += 60) grid.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/><text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="ch-tick">${fmt(v)}</text>`);
  const idx = new Map(dates.map((d, i) => [d, i])), line = pts.map((p, k) => `${k ? "L" : "M"}${X(idx.get(p.date)).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" "), mean = avg(vs);
  const dots = pts.map(p => `<circle cx="${X(idx.get(p.date)).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4" fill="${p.on ? "var(--honey)" : "var(--surface)"}" stroke="${p.on ? "var(--ink)" : "var(--slate)"}" stroke-width="1.5"><title>${esc(`${p.date} ${fmt(p.v)}${p.on ? " · " + t("做了睡前流程") : ""}`)}</title></circle>`).join("");
  return `<figure class="lib-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid.join("")}<path d="${line}" fill="none" stroke="var(--slate)" stroke-width="1" opacity=".5"/><line x1="${L}" x2="${W - R}" y1="${Y(mean).toFixed(1)}" y2="${Y(mean).toFixed(1)}" stroke="var(--rose)" stroke-dasharray="4 3"/>${dots}
    <text x="${L}" y="${H - 6}" class="ch-tick">${dates[0].slice(5)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="ch-tick">${dates[n - 1].slice(5)}</text></svg>
    <p class="legend-line"><span><i style="background:var(--honey)"></i>${t("做了睡前流程")}</span><span><i style="background:var(--surface)"></i>${t("没做")}</span><span><i style="background:transparent;border:1px dashed var(--rose)"></i>${t("平均 {v}", { v: fmt(mean) })}</span></p></figure>`;
}
const legend = names => `<p class="legend-line">${names.map(n => `<span><i style="background:${stateColor(n)}"></i>${esc(t(n))}</span>`).join("")}</p>`;

function viewTrend(){
  const days = S.trendDays || 30, bk = buckets(days), dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D));
  const logs = nightsIn(days), evs = eventsIn(days), nights = sleepNights(days), on = new Set(logs.map(l => l.date));
  const calm = evs.filter(e => e.outcome === "calm").length, heated = evs.filter(e => SIDES.heated.includes(e.parent_state)).length + logs.filter(l => ["有点急", "发了脾气"].includes(l.parent_state)).length;
  const withR = nights.filter(n => on.has(n.date)), without = nights.filter(n => !on.has(n.date));
  const rate = (set) => { const d = dates.filter(x => set(x)); return d.length ? (evs.filter(e => set(e.date)).length / d.length) : null; };
  const cmpRow = (label, a, b, f) => `<tr><td>${t(label)}</td><td class="num">${a == null ? "–" : f(a)}</td><td class="num">${b == null ? "–" : f(b)}</td></tr>`;
  const stat = (k, v, u) => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}${u ? `<small>${u}</small>` : ""}</div></div>`;
  const stateRows = (src, key, label) => { const m = count(src, x => x[key]); const segs = Object.entries(m).map(([k, v]) => ({ name: t(k), value: v, color: stateColor(k) })); return segs.length ? { label, segs } : null; };
  const parentRows = [stateRows(evs, "parent_state", t("冲突时")), stateRows(logs, "parent_state", t("睡前"))].filter(Boolean), childRows = [stateRows(evs, "child_state", t("冲突时")), stateRows(logs, "child_state", t("睡前"))].filter(Boolean);
  const parentNames = [...new Set([...evs, ...logs].map(x => x.parent_state).filter(Boolean))], childNames = [...new Set([...evs, ...logs].map(x => x.child_state).filter(Boolean))];
  return `${h2(t("趋势与分析"))}
  ${offlineHTML()}${sidesHint()}
  <div class="chips" role="group" aria-label="${t("时间范围")}">${TREND_DAYS.map(d => `<button type="button" class="chip" data-act="tr-days" data-v="${d}" aria-pressed="${days === d}">${t("近 {n} 天", { n: d })}</button>`).join("")}</div>
  <div class="panel"><div class="stats">${stat(t("睡前流程"), `${logs.length}<small>/${days}</small>`, t("晚"))}${stat(t("平均入睡"), nights.length ? bedClock(avg(nights.map(n => n.bed))) : "–", "")}${stat(t("冲突记录"), evs.length, t("次"))}${stat(t("大人情绪升高"), heated, t("次"))}</div>
    <div class="btns" style="margin-top:10px"><button class="btn primary sm" data-act="tr-ask">${aiIcon(16)} ${t("让咩咩咩分析最近的记录")}</button></div><p style="margin:8px 0 0">${pullButtonHTML()}</p>
    <p class="small muted" style="margin:8px 0 0">${B.loaded ? t("睡眠来自小月亮的记录（只读）；睡前流程和冲突是这里记的。点分析会带着这一页的摘要去问咩咩咩，「会发送什么」里能看到原文。") : B.loading ? t("正在读取小月亮的记录…") : B.err ? t("读不到小月亮的记录：") + esc(B.err) : ""}</p></div>

  <h2>${t("入睡时间")}</h2><div class="panel">${timeDots(t("入睡时间"), nights.map(n => ({ date: n.date, v: n.bed, on: on.has(n.date) })), dates, bedClock)}</div>
  <h2>${t("起床时间")}</h2><div class="panel">${timeDots(t("起床时间"), nights.map(n => ({ date: n.date, v: n.wake, on: on.has(n.date) })), dates, clockOfDay)}</div>
  <h2>${t("做了睡前流程 vs 没做")}</h2>
  <div class="panel">${withR.length || without.length ? `<div class="scroll-x"><table><thead><tr><th></th><th class="num">${t("做了")}</th><th class="num">${t("没做")}</th></tr></thead><tbody>
    ${cmpRow("晚数", withR.length, without.length, v => v)}${cmpRow("平均入睡", withR.length ? avg(withR.map(n => n.bed)) : null, without.length ? avg(without.map(n => n.bed)) : null, bedClock)}${cmpRow("平均起床", withR.length ? avg(withR.map(n => n.wake)) : null, without.length ? avg(without.map(n => n.wake)) : null, clockOfDay)}
    ${cmpRow("每天冲突次数", rate(d => on.has(d)), rate(d => !on.has(d)), v => v.toFixed(1))}</tbody></table></div>
    <p class="small muted" style="margin:6px 0 0">${t("样本少时只作参考；一个月以上的对比才比较可靠。")}</p>` : `<p class="small muted" style="margin:0">${t("还没有可对比的夜晚：需要小月亮里的睡眠记录，和这里的睡前流程记录。")}</p>`}</div>
  <h2>${t("睡前流程完成")}</h2><div class="panel">${bars(bk.map(b => ({ label: b.label, value: logs.filter(l => inB(b, l.date)).length, color: "var(--sage)" })), { title: t("睡前流程完成") })}<p class="small muted" style="margin:0">${days <= 14 ? t("每天一格") : t("每周一格（按周起始日标日期）")}</p></div>
  <h2>${t("冲突次数与结果")}</h2><div class="panel">${evs.length ? stack(bk.map(b => { const e = evs.filter(x => inB(b, x.date)); return { label: b.label, segs: [{ name: t("平静下来"), value: e.filter(x => x.outcome === "calm").length, color: "var(--sage)" }, { name: t("勉强过去"), value: e.filter(x => x.outcome === "partly").length, color: "var(--honey)" }, { name: t("没用或更糟"), value: e.filter(x => ["none", "worse"].includes(x.outcome)).length, color: "var(--rose)" }, { name: t("没记结果"), value: e.filter(x => !x.outcome).length, color: "var(--line)" }] }; }), { title: t("冲突次数与结果") }) + `<p class="legend-line"><span><i style="background:var(--sage)"></i>${t("平静下来")}</span><span><i style="background:var(--honey)"></i>${t("勉强过去")}</span><span><i style="background:var(--rose)"></i>${t("没用或更糟")}</span></p><p class="small muted" style="margin:0">${t("平静下来 {a} / {b} 次", { a: calm, b: evs.length })}</p>` : `<p class="small muted" style="margin:0">${t("这段时间没有冲突记录。")}</p>`}</div>
  <h2>${t("大人的状态")}</h2><div class="panel">${parentRows.length ? stack(parentRows, { title: t("大人的状态") }) + legend(parentNames) + `<p class="small muted" style="margin:6px 0 0">${t("大人情绪升高（有点急 / 提高了声音 / 发了脾气）共 {n} 次。看到它变多，先照顾自己：换人接手、休息，再回来修复。", { n: heated })}</p>` : `<p class="small muted" style="margin:0">${t("记录时选一下「大人当时的状态」，这里就能看到趋势。")}</p>`}</div>
  <h2>${t("孩子的状态")}</h2><div class="panel">${childRows.length ? stack(childRows, { title: t("孩子的状态") }) + legend(childNames) : `<p class="small muted" style="margin:0">${t("记录时选一下「孩子当时的状态」，这里就能看到分布。")}</p>`}</div>
  <p class="small muted">${t("每个点和色块都带数字或提示；颜色之外还有文字图例。")}</p>`;
}

async function trAct(act, btn){
  const d = btn.dataset;
  switch (act) {
    case "tr-days": S.trendDays = +d.v; render(); break;
    case "tr-refresh": await pull({}); break;
    case "tr-ask": { const days = S.trendDays || 30; askAbout({ q: HUB_PROMPTS[0][1], extra: flowContext({ days }), name: ctxName(days), from: "flow-trend" }); break; }
    case "tr-ask-hub": { const free = d.i === "free", p = free ? null : HUB_PROMPTS[+d.i]; askAbout({ q: p ? p[1] : "", extra: flowContext({ days: 14 }), name: ctxName(14), from: "flows" }); break; }
  }
}

export { B, pull, beforeRender, pullButtonHTML, loadBaby, genderOf, bandKey, allEmotions, hasBl, mineRows, allConflicts, sitOf, whyOf, blStats, sleepNights, flowContext, ctxName, hubAskHTML, viewTrend, trAct };
