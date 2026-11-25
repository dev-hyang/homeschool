import { aiReady, askText } from "./ai.js";
import { SB } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { locale, t } from "./core/i18n.js";
import { selectAll } from "./core/paged.js";
import { S, ageMonths, childName, ownerOf } from "./core/state.js";
import { $, D, dayKey, esc, toast } from "./core/util.js";
import { EXTRA, EXTRA_KEYS, INTAKE_SYSTEM, VAX_NAMES, extraParts, mergeInto, placeText, parseIntake, sameEntry, sameVisit, vaxForm } from "./intake-lib.js";
import { attachHTML, attachHas, attachPayload, attachReset } from "./attach.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { TIMINGS, timingOf, timingText } from "./med-advice.js";
import { trendHTML } from "./growth-meds.js";
import { VT_KEYS, bmiBand, bpLimit, flag as vtFlag, hrRange, vitalsContext, vitalsHTML } from "./vitals.js";
import { askAbout } from "./ask.js";
import { genderOf } from "./flows-trend.js";
import { render } from "./views.js";
import { paged, resetPage } from "./pager.js";
import { fbarHTML, hit, onFbar } from "./filterbar.js";
import { REC_AI_SYSTEM, parseRecAi, recAiBody } from "./record-ai.js";
import { LABS, LAB_GROUPS } from "./data/health-ref.js";   // 化验项目、套餐、常见范围（牧羊人同一份）

/* ============ 成长 · 🩺 身体与健康（2026-11-11） ============
   数据不另建表，和姊妹应用共用一份：
     · 小月亮的记录（entries）：宝宝健康（体重、身高、头围、体温；来源 = 自己记录 / 儿科体检 / 看病急诊，带医院和医生总结）、疫苗接种、宝宝用药、里程碑；
     · 牧羊人的健康表（hl_*，subject = "c:" + 孩子 id）：化验（hl_labs）、牧羊人里给孩子记的就诊（hl_visits）、档案里的病史 / 过敏 / 长期用药（hl_profiles.data）。
   页面：身高体重、体检与就诊（上次年度体检多久了）、疫苗、化验、病史 · 过敏 · 用药几张卡；
   「AI 一次录入体检 / 就诊」和小月亮同一套（js/intake-lib.js 两边同一份）：拍小结或打一段话 → 核对 → 一次存成几条小月亮记录；
   「量一次身高体重」是同一张表的手填模式（来源 = 自己记录）。病史 · 过敏 · 用药存在牧羊人的档案里，两边看到的是同一份。
   单位跟小月亮的设置走（同一个网址，本机 xiaoyueliang.v1.units）：美制显示 lb / in / ℉，存的都是公制。 */
const H = (S.gb ||= { key: "", loading: false, loaded: false, err: "", rows: [], hlOk: false, labs: [], visits: [], profiles: [] });
const fid = () => S.family && S.family.id;
const TYPES = ["baby", "vax", "bmed", "milestone"];

async function loadBody(force = false){
  const f = fid(); if (!f || !SB.client || H.loading || (!force && H.key === f)) return;
  H.loading = true;
  try {
    const e = await selectAll(() => SB.client.from("entries").select("id,type,ts,data").eq("family_id", f).in("type", TYPES).eq("deleted", false).order("ts", { ascending: false }).order("id"), 6000);
    if (e.error) throw e.error;
    H.rows = (e.data || []).map(r => ({ ...(r.data || {}), id: r.id, type: r.type, ts: +r.ts }));
    // 牧羊人的表可能没建（迁移 026）：读不到就当没有，不算错误
    const [pr, lb, vs] = await Promise.all(["hl_profiles", "hl_labs", "hl_visits"].map(tb => selectAll(() => SB.client.from(tb).select("*").eq("family_id", f).like("subject", "c:%").order("id"))));
    H.hlOk = !pr.error && !lb.error && !vs.error;
    H.profiles = pr.data || []; H.labs = lb.data || []; H.visits = vs.data || [];
    H.loaded = true; H.err = ""; H.key = f;
  } catch (err) { H.err = String((err && err.message) || err); }
  // 读完重画：成长首页，和身体与健康的各个主题页（gr-size 等；刷新时网址直接停在主题页，没有先经过成长首页）
  finally { H.loading = false; if (S.tab === "growth" || /^gr-/.test(S.tab)) render(); }
}
const mine = type => H.rows.filter(e => e.type === type && ownerOf(e) === S.childId).sort((a, b) => b.ts - a.ts);
const subj = () => "c:" + S.childId;
const profileRow = () => H.profiles.find(p => p.subject === subj()) || null;

/* ---- 单位（跟小月亮） ---- */
function isUS(){
  let p = "auto"; try { p = localStorage.getItem("xiaoyueliang.v1.units") || "auto"; } catch (e) {}
  if (p !== "auto") return p === "us";
  let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  return /^en-US/i.test(navigator.language || "") || /^America\//.test(tz);
}
const DIM = { weight: [2.2046226, "lb", "kg", 1], length: [1 / 2.54, "in", "cm", 1], head: [1 / 2.54, "in", "cm", 1], temp: [null, "℉", "℃", 1] };
const unit = k => (isUS() ? DIM[k][1] : DIM[k][2]);
const toDisp = (k, v) => (v == null || v === "" ? null : !isUS() ? +v : k === "temp" ? +v * 9 / 5 + 32 : +v * DIM[k][0]);
const fromDisp = (k, x) => { if (x == null || x === "" || isNaN(+x)) return null; x = +x; return !isUS() ? x : k === "temp" ? +((x - 32) * 5 / 9).toFixed(2) : +(x / DIM[k][0]).toFixed(4); };
const show = (k, v) => (v == null ? "–" : `${Math.round(toDisp(k, v) * 10) / 10} ${unit(k)}`);
/** BMI、血压、心率、百分位 → ["BMI 16.2 (P60)", "血压 98/60", "体重 P75"…] */
const extras = e => extraParts(e).map(([l, v]) => `${t(l)} ${v}`);
const monthsAgo = ts => Math.floor((Date.now() - ts) / (30.44 * D));
const day = ts => dayKey(ts).replace(/-/g, "/");

/* ---- 页面：成长首页每一行的一句话 + 每个主题一页（和习惯、学习那些主题页同一个版式：动作按钮 → 指标卡 → 走势图 → 记录） ---- */
const ensure = () => { if (!H.loaded) loadBody(); return H.loaded; };
function bodyRowDesc(id){
  if (!ensure()) return t("正在读取…");
  if (id === "gr-size") { const w = mine("baby").find(e => e.weight), l = mine("baby").find(e => e.length);
    return w || l ? [w && `${t("体重")} ${show("weight", w.weight)}`, l && `${t("身高")} ${show("length", l.length)}`, day((w || l).ts)].filter(Boolean).join(" · ") : t("还没有记录，点进去量一次"); }
  if (id === "gr-visits") { const a = visitsAll().find(v => v.annual), m = ageMonths(), gap = a ? monthsAgo(a.ts) : null;
    return a ? t("上次体检 {d}，{n} 个月前", { d: day(a.ts), n: gap }) + (m >= 36 && gap >= 12 ? ` · ${t("该做年度体检了")}` : "") : t("还没有体检记录"); }
  if (id === "gr-vax") { const v = mine("vax"); return v.length ? t("共 {n} 次 · 最近 {d}", { n: v.length, d: day(v[0].ts) }) : t("还没有接种记录"); }
  if (id === "gr-labs") { if (!H.hlOk) return t("在牧羊人里记化验"); const r = labLatest(), bad = r.filter(labFlag).length; return r.length ? t("{n} 项", { n: r.length }) + (bad ? ` · ${t("{n} 项超出范围", { n: bad })}` : ` · ${t("都在范围内")}`) : t("还没有化验"); }
  if (id === "gr-history") { const p = (profileRow() || {}).data || {}; return [p.allergies && `${t("过敏")}：${p.allergies}`, p.conditions && `${t("病史")}：${p.conditions}`].filter(Boolean).join(" · ").slice(0, 80) || t("还没有记过"); }
  if (id === "gr-meds") { const m = mine("bmed"), e = m[0]; return e ? t("共 {n} 次 · 最近 {d} {name}", { n: m.length, d: day(e.ts), name: e.name || "" }) : t("还没有用药记录"); }
  return "";
}
const labFlag = x => (x.ref_high != null && +x.value > +x.ref_high ? "high" : x.ref_low != null && +x.value < +x.ref_low ? "low" : null);
/* ---- 化验项目：按「套餐」分组，同一项目（不管是按代码还是按名字存的）合成一条走势 ---- */
const labNorm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const LAB_BY_NAME = (() => { const m = new Map(); for (const [c, x] of Object.entries(LABS)) for (const n of [c, x.name, x.en, ...(x.alias || [])]) m.set(labNorm(n), c); return m; })();
const labKeyOf = x => (x.code && LABS[x.code] ? x.code : LAB_BY_NAME.get(labNorm(x.name || x.code)) || x.name || x.code || "");
const labTitle = (k, x) => (LABS[k] ? (locale() === "en" ? LABS[k].en : t(LABS[k].name)) : (x && (x.name || x.code)) || k);
const byDayAsc = (a, b) => String(a.day).localeCompare(String(b.day));
const labDay = d => String(d).slice(0, 10).replace(/-/g, "/");
const labNum = v => +(+v).toFixed(2);
const labRows = k => H.labs.filter(x => x.subject === subj() && labKeyOf(x) === k).sort(byDayAsc);
function labLatest(){ const by = new Map(); for (const x of H.labs.filter(x => x.subject === subj()).sort(byDayAsc)) by.set(labKeyOf(x), x); return [...by.values()]; }
/** [[套餐 id, [{ k, rows（旧→新）, last, prev }]]]，只列有记录的套餐 */
function labGroups(){
  const by = new Map(); for (const x of H.labs.filter(x => x.subject === subj()).sort(byDayAsc)) { const k = labKeyOf(x); (by.get(k) || by.set(k, []).get(k)).push(x); }
  const out = new Map(Object.keys(LAB_GROUPS).map(g => [g, []])), order = Object.keys(LABS);
  for (const [k, rows] of by) out.get(LABS[k] ? LABS[k].group : "other").push({ k, rows, last: rows[rows.length - 1], prev: rows[rows.length - 2] || null });
  for (const a of out.values()) a.sort((x, y) => { const i = order.indexOf(x.k), j = order.indexOf(y.k); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j) || labTitle(x.k, x.last).localeCompare(labTitle(y.k, y.last)); });
  return [...out].filter(([, a]) => a.length);
}
const labRange = x => (x.ref_low != null && x.ref_high != null ? `${+x.ref_low}–${+x.ref_high}` : x.ref_high != null ? `≤ ${+x.ref_high}` : x.ref_low != null ? `≥ ${+x.ref_low}` : "");
const flagTxt = f => `<span class="lab-flag ${f}">${t(f === "high" ? "偏高" : "偏低")}</span>`;
/** 小走势线（列表每行右边）：只有 1 次不画 */
function labSpark(rows){
  if (rows.length < 2) return "";
  const v = rows.slice(-8).map(r => +r.value), lo = Math.min(...v), hi = Math.max(...v), W = 60, Hh = 24, y = x => (hi === lo ? Hh / 2 : Hh - 3 - ((x - lo) / (hi - lo)) * (Hh - 6)), xs = i => 3 + (i / (v.length - 1)) * (W - 6);
  return `<svg class="lab-spark" viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${v.map((x, i) => `${xs(i).toFixed(1)},${y(x).toFixed(1)}`).join(" ")}"/><circle cx="${xs(v.length - 1).toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.4" fill="currentColor"/></svg>`;
}
/** 单项走势图：参考范围画成一条底色带（取最新一次的范围），每个点按它自己那次的范围着色 */
function labChart(rows){
  const W = 320, Hh = 160, L = 38, R = 10, T = 12, B = 26, last = rows[rows.length - 1], lo0 = last.ref_low != null ? +last.ref_low : null, hi0 = last.ref_high != null ? +last.ref_high : null;
  const vals = rows.map(r => +r.value), all = [...vals, ...(lo0 != null ? [lo0] : []), ...(hi0 != null ? [hi0] : [])];
  let mn = Math.min(...all), mx = Math.max(...all); const pad = (mx - mn || Math.abs(mx) || 1) * 0.12; mn -= pad; mx += pad;
  const ts = rows.map(r => new Date(String(r.day).slice(0, 10) + "T12:00:00").getTime()), t0 = ts[0], t1 = ts[ts.length - 1];
  const X = i => (t1 === t0 ? (L + W - R) / 2 : L + ((ts[i] - t0) / (t1 - t0)) * (W - L - R)), Y = v => T + (1 - (v - mn) / (mx - mn)) * (Hh - T - B), f2 = n => +n.toFixed(1);
  const band = lo0 != null || hi0 != null ? `<rect x="${L}" y="${f2(Y(hi0 != null ? hi0 : mx))}" width="${W - L - R}" height="${f2(Y(lo0 != null ? lo0 : mn) - Y(hi0 != null ? hi0 : mx))}" fill="var(--sage)" opacity=".18"/>` : "";
  const line = rows.length > 1 ? `<polyline fill="none" stroke="var(--slate)" stroke-width="2" stroke-linejoin="round" points="${rows.map((r, i) => `${f2(X(i))},${f2(Y(+r.value))}`).join(" ")}"/>` : "";
  const dots = rows.map((r, i) => `<circle cx="${f2(X(i))}" cy="${f2(Y(+r.value))}" r="4" fill="${labFlag(r) ? "var(--rose)" : "var(--slate)"}"><title>${esc(labDay(r.day))} ${labNum(r.value)} ${esc(r.unit || "")}</title></circle>`).join("");
  return `<svg class="lab-chart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(t("走势图"))}">${band}
    <text x="${L - 4}" y="${f2(Y(mx - pad) + 4)}" text-anchor="end" class="lab-ax">${labNum(mx - pad)}</text><text x="${L - 4}" y="${f2(Y(mn + pad) + 4)}" text-anchor="end" class="lab-ax">${labNum(mn + pad)}</text>
    ${line}${dots}<text x="${f2(X(0))}" y="${Hh - 6}" text-anchor="${rows.length === 1 ? "middle" : "start"}" class="lab-ax">${esc(labDay(rows[0].day).slice(2))}</text>${rows.length > 1 ? `<text x="${f2(X(rows.length - 1))}" y="${Hh - 6}" text-anchor="end" class="lab-ax">${esc(labDay(last.day).slice(2))}</text>` : ""}</svg>`;
}
/** 这一次在参考范围里的位置（范围两头各留一半宽） */
function labBar(x){
  if (x.ref_low == null || x.ref_high == null || +x.ref_high <= +x.ref_low) return "";
  const lo = +x.ref_low, hi = +x.ref_high, span = hi - lo, a = lo - span / 2, b = hi + span / 2, p = v => Math.max(0, Math.min(100, ((v - a) / (b - a)) * 100));
  return `<span class="lab-bar" aria-hidden="true"><i class="ok" style="left:${p(lo).toFixed(1)}%;width:${(p(hi) - p(lo)).toFixed(1)}%"></i><i class="at ${labFlag(x) || ""}" style="left:${p(+x.value).toFixed(1)}%"></i></span>`;
}
/** 动作按钮一排（和主题页的「＋ 记一笔」同一个位置、同一个样式） */
const top = (btns, cls = "") => `<div class="gr-top"><div class="gr-adds ${cls}">${btns}</div></div>`;
/** 各个子页面自己的录入入口：只带这一页相关的那几块（scope），默认 AI 录入，可以切换成手动录入。综合录入（scope = all）只在成长首页 */
const entryBtn = (scope, src, label, primary = true) => `<button type="button" class="ui-btn" data-size="sm" data-tone="${primary ? "primary" : "ghost"}" data-ix="open" data-scope="${scope}" data-src="${src}">＋ ${t(label)}</button>`;
const rec = (icon, title, when, meta, note) => `<div class="task"><span class="bar" style="background:var(--slate)"></span><div class="main" style="cursor:default"><span class="title">${icon} <b>${esc(title)}</b> <span class="small muted num">${esc(when)}</span></span>${meta ? `<span class="meta">${esc(meta)}</span>` : ""}${note ? `<span class="meta gr-note">${esc(note)}</span>` : ""}</div><span class="acts"></span></div>`;
const recs = (title, rows, foot) => `<section class="gr-sec"><div class="gr-sh"><h2>${t(title)} <span class="small muted gr-n">${t("{n} 条", { n: rows.length })}</span></h2></div>
  <div class="panel">${rows.length ? `<div class="tasks">${rows.join("")}</div>` : `<div class="empty">${t("还没有记录。")}</div>`}</div>${foot ? `<p class="small muted gr-foot">${foot}</p>` : ""}</section>`;
const EDIT_HERE = () => t("点一条可以修改或删除；和小月亮是同一份记录。");
/* ---- 记录列表（11-15）：筛选条（搜索 + 时间 + 类别 + 排序 + 清除，js/filterbar.js，和爱家小助手同一套）、列表 | 时间线、点一条就改
   items: [{ ts, icon, title, meta, note, edit: 点了干什么的属性（没有 = 只看） }]；subs: [[键, 名字, x => 是不是这一类]] */
const RANGES = [["all", "全部时间"], ["365", "近 1 年"], ["1095", "近 3 年"]];
const BF = (H.bf ||= { view: "list" });
const BF_DEF = { range: "all", sub: "all", q: "", sort: "new" };
function recRow(x, full = true){
  const busy = x.aiK && H.aiBusy === x.aiK;
  const aiBtn = x.aiK && !x.ai ? `<button type="button" class="chip gb-ai-btn" data-act="gr-b-ai" data-k="${esc(x.aiK)}" ${busy ? "disabled" : ""}>${busy ? t("分析中…") : `✦ ${t("AI 解读")}`}</button>` : "";
  const inner = `<span class="title">${x.icon} <b>${esc(x.title)}</b> <span class="small muted num">${esc(full ? day(x.ts) : day(x.ts).slice(5))}</span></span>${x.meta ? `<span class="meta">${esc(x.meta)}</span>` : ""}${x.note ? `<span class="meta gr-note">${esc(x.note)}</span>` : ""}`;
  const task = `<div class="task"><span class="bar" style="background:var(--slate)"></span>${x.edit ? `<button type="button" class="main" ${x.edit} aria-label="${esc(t("修改这一条"))}">${inner}</button>` : `<div class="main" style="cursor:default">${inner}</div>`}<span class="acts">${aiBtn}</span></div>`;
  return x.aiK && x.ai ? `<div class="gb-rec">${task}${aiSavedHTML(x.aiK, x.ai, busy)}</div>` : task;
}
function recList(id, title, items, { subs = null, foot = "" } = {}){
  const F = (BF[id] ||= { ...BF_DEF }), R = +F.range || 0, key = "gb-" + id;
  if (subs && F.sub !== "all" && !subs.some(x => x[0] === F.sub)) F.sub = "all";
  const sb = subs && F.sub !== "all" ? subs.find(x => x[0] === F.sub) : null;
  const list = items.filter(x => (!R || x.ts >= Date.now() - R * D) && (!sb || sb[2](x)) && hit(F.q, x.title, x.meta, x.note))
    .sort((a, b) => (F.sort === "old" ? a.ts - b.ts : b.ts - a.ts));
  const pg = paged(key, list), tl = BF.view === "timeline", filtered = F.range !== "all" || F.sub !== "all" || !!F.q;
  onFbar(key, { set(k, v){ F[k === "type" ? "sub" : k] = v; resetPage(key); render(); }, clear(){ Object.assign(F, { range: "all", sub: "all", q: "" }); resetPage(key); render(); } });
  let body;
  if (!list.length) body = `<div class="empty">${items.length ? t("没有符合筛选的记录。") : t("还没有记录。")}</div>`;
  else if (tl) {   // 时间线：按年份分组（体检、疫苗一年就几条，按天分太散）
    const g = []; pg.rows.forEach(x => { const y = new Date(x.ts).getFullYear(), last = g[g.length - 1]; if (last && last.y === y) last.xs.push(x); else g.push({ y, xs: [x] }); });
    body = `<div class="tl">${g.map(x => `<div class="tl-day"><div class="tl-head"><b>${x.y}</b> <span class="small muted">${t("{n} 条", { n: x.xs.length })}</span></div>${x.xs.map(r => `<div class="tl-item">${recRow(r, false)}</div>`).join("")}</div>`).join("")}</div>`;
  } else body = `<div class="tasks">${pg.rows.map(r => recRow(r)).join("")}</div>`;
  const bar = items.length ? fbarHTML(key, { q: { value: F.q, ph: t("搜索记录、医院、备注") },
    selects: [{ k: "range", label: t("时间范围"), opts: RANGES.map(([k, l]) => [k, t(l)]), v: F.range }, subs && { k: "type", label: t("类别"), opts: [["all", t("全部类别")], ...subs.map(([k, l]) => [k, l])], v: F.sub }],
    sort: { opts: [["new", t("最新在前")], ["old", t("最早在前")]], v: F.sort }, changed: filtered }) : "";
  const view = `<div class="seg gr-seg" role="group" aria-label="${esc(t("视图"))}">${[["list", t("列表")], ["timeline", t("时间线")]].map(([k, l]) => `<button type="button" data-act="gr-b-view" data-v="${k}" aria-pressed="${(tl ? "timeline" : "list") === k}">${esc(l)}</button>`).join("")}</div>`;
  return `<section class="gr-sec"><div class="gr-sh"><h2>${t(title)} <span class="small muted gr-n">${filtered ? t("{n} / {m} 条", { n: list.length, m: items.length }) : t("{n} 条", { n: list.length })}</span></h2>${items.length ? view : ""}</div>
    ${bar}<div class="panel">${body}${pg.more}</div>${foot ? `<p class="small muted gr-foot">${foot}</p>` : ""}</section>`;
}
function statTile(label, value, sub, color, attrs = "", on = false){
  const tag = attrs ? "button" : "div";
  return `<${tag} ${attrs ? 'type="button"' : ""} class="gr-tile ${attrs ? "" : "static"}" ${attrs} ${attrs ? `aria-pressed="${on}"` : ""} style="--c:${color}"><span class="gr-tl">${esc(label)}</span><span class="gr-tv num">${value}</span><span class="gr-td"><span class="small muted">${esc(sub)}</span></span></${tag}>`;
}

function bodyTopicHTML(id){
  if (!fid()) return "";
  if (!ensure()) return `<p class="small muted" role="status">${H.err ? t("读取失败：{m}", { m: esc(H.err.slice(0, 80)) }) : t("正在读取…")}</p>`;
  return ({ "gr-size": sizePage, "gr-visits": visitsPage, "gr-vax": vaxPage, "gr-labs": labsPage, "gr-history": historyPage, "gr-meds": medsPage }[id] || (() => ""))();
}
/* ---- 基本体征：卡片、走势线、同龄正常范围、给 AI 的摘要都在 js/vitals.js（和小月亮同一份） ---- */
const vtCtx = () => ({ t, val: (dim, v) => toDisp(dim, v), unit, day, months: ts => ageMonths(S.childId, ts), sex: genderOf() || null,
  src: e => t(e.src && e.src !== "自己记录" ? e.src : "在家量") });
function sizePage(){
  const rows = mine("baby").filter(e => VT_KEYS.some(k => e[k] != null && e[k] !== ""));
  return `${top(`${entryBtn("size", "自己记录", "录入基本体征")}<button type="button" class="ui-btn" data-size="sm" data-tone="ghost" data-act="gr-vt-ask">✦ ${t("问 AI 这些体征")}</button>`)}
    ${vitalsHTML(rows, vtCtx())}
    ${recList("size", "记录", rows.map(e => ({ ts: e.ts, icon: "📏", home: !e.src || e.src === "自己记录", title: [e.weight && show("weight", e.weight), e.length && show("length", e.length)].filter(Boolean).join(" · ") || t("体征"),
      meta: [t(e.src && e.src !== "自己记录" ? e.src : "在家量"), ...extras(e)].join(" · "), note: e.note, edit: `data-ix="edit" data-id="${esc(e.id)}"` })),
      { subs: [["home", t("在家量的"), x => x.home], ["clinic", t("体检 / 看病时量的"), x => !x.home]], foot: `${EDIT_HERE()} ${t("生长百分位以儿科医生的生长曲线为准。")}` })}`;
}
/** 就诊：小月亮里来源是体检 / 看病的「宝宝健康」+ 牧羊人里给孩子记的就诊 */
function visitsAll(){
  const a = mine("baby").filter(e => e.src && e.src !== "自己记录").map(e => ({ id: e.id, aiK: "e:" + e.id, ai: e.ai || null, ts: e.ts, annual: e.src === "儿科体检", kind: t(e.src), where: placeText(e), text: e.note || "", m: [e.weight && show("weight", e.weight), e.length && show("length", e.length), e.temp && show("temp", e.temp), ...extras(e)].filter(Boolean).join(" · ") }));
  const b = H.visits.filter(v => v.subject === subj()).map(v => ({ aiK: "v:" + v.id, ai: v.ai || null, ts: new Date(v.day + "T12:00:00").getTime(), annual: v.kind === "annual", kind: t(v.kind === "annual" ? "年度体检" : "就诊"), where: v.provider || "", text: [v.diagnosis, v.advice].filter(Boolean).join(" · "), m: "" }));
  return [...a, ...b].sort((x, y) => y.ts - x.ts);
}
function visitsPage(){
  const list = visitsAll(), a = list.find(v => v.annual), m = ageMonths(), gap = a ? monthsAgo(a.ts) : null, due = m != null && m >= 36 && (gap == null || gap >= 12);
  const tiles = `<div class="gr-tiles">${statTile(t("上次体检"), a ? esc(day(a.ts)) : "–", a ? t("{n} 个月前", { n: gap }) : t("还没有体检记录"), due ? "var(--honey)" : "var(--sage)")}
    ${statTile(t("就诊次数"), String(list.length), t("全部记录"), "var(--slate)")}</div>`;
  return `${top(entryBtn("visit", "儿科体检", "录入体检 / 就诊"))}${due ? `<p class="gr-due"><span class="ui-badge" data-tone="caution">${t("该做年度体检了")}</span> <span class="small muted">${t("3 岁以后一般每年一次儿科体检。")}</span></p>` : ""}${tiles}
    ${recList("visits", "记录", list.map(v => ({ ts: v.ts, annual: v.annual, aiK: v.aiK, ai: v.ai, icon: v.annual ? "🩺" : "🤒", title: v.kind, meta: [v.where, v.m].filter(Boolean).join(" · "), note: v.text, edit: v.id ? `data-ix="edit" data-id="${esc(v.id)}"` : "" })),
      { subs: [["checkup", t("体检"), x => x.annual], ["sick", t("看病 / 急诊"), x => !x.annual]], foot: `${EDIT_HERE()} ${H.visits.some(v => v.subject === subj()) ? t("牧羊人里记的就诊在牧羊人里改。") : ""}` })}`;
}
/** 疫苗按种类筛：去掉括号里的原文（百白破 DTaP（Pediarix）→ 百白破 DTaP），只有一种时不显示筛选 */
const vaxKey = n => String(n || "").replace(/（.*?）|\(.*?\)/g, "").trim();
function vaxSubs(list){ const ks = [...new Set(list.map(e => vaxKey(e.name)).filter(Boolean))]; return ks.length > 1 ? ks.map(k => [k, t(k), x => x.k === k]) : null; }
function vaxPage(){
  const list = mine("vax");
  return `${top(entryBtn("vax", "儿科体检", "录入疫苗"))}<div class="gr-tiles">${statTile(t("接种"), String(list.length), list.length ? t("最近 {d}", { d: day(list[0].ts) }) : t("还没有接种记录"), "#3F8F8B")}</div>
    ${recList("vax", "记录", list.map(e => ({ ts: e.ts, icon: "💉", k: vaxKey(e.name), title: t(e.name || "疫苗"), meta: [e.dose && t(e.dose), e.site && t(e.site), placeText(e), e.reaction && e.reaction !== "无" && t("反应：{r}", { r: t(e.reaction) })].filter(Boolean).join(" · "), note: e.note, edit: `data-act="gr-b-vax" data-id="${esc(e.id)}"` })),
      { subs: vaxSubs(list), foot: `${EDIT_HERE()} ${t("正式凭证以接种本、医院或学校要求的官方记录为准。")}` })}`;
}
function labsPage(){
  const btn = `${H.hlOk ? `<button type="button" class="ui-btn" data-size="sm" data-tone="primary" data-act="gr-lab-batch">＋ ${t("录入化验")}</button>` : ""}`;   // 牧羊人的入口放在录入表的抬头里（和「AI 录入」并排），页面上只留这一个按钮，免得点错
  if (!H.hlOk) return `<div class="panel gr-empty"><p class="small muted" style="margin:0">${t("化验在牧羊人里记；数据库还没有牧羊人的健康表（迁移 026）。")}</p></div>`;
  const groups = labGroups(), latest = labLatest(), bad = latest.filter(labFlag).length;
  const item = it => { const f = labFlag(it.last), d = it.prev ? labNum(+it.last.value - +it.prev.value) : null;
    return `<button type="button" class="mrow lab-row" data-act="gr-lab-open" data-k="${esc(it.k)}"><span class="mi ${f ? "lab-bad" : ""}" aria-hidden="true">${f ? "!" : "✓"}</span>
      <span class="mt"><b>${esc(labTitle(it.k, it.last))}</b><span class="lab-now"><span class="num">${labNum(it.last.value)}</span> <small class="muted">${esc(it.last.unit || "")}</small>${f ? ` ${flagTxt(f)}` : ""}${d ? ` <small class="muted">${d > 0 ? "↑" : "↓"} ${Math.abs(d)}</small>` : ""}</span>
      <small>${esc([labRange(it.last) && t("参考 {r}", { r: labRange(it.last) }), labDay(it.last.day), t("{n} 次", { n: it.rows.length })].filter(Boolean).join(" · "))}</small></span>${labSpark(it.rows)}<span class="mch" aria-hidden="true">›</span></button>`; };
  const sections = groups.map(([g, items]) => { const nb = items.filter(it => labFlag(it.last)).length;
    return `<section class="gr-sec"><div class="gr-sh"><h2>${esc(t(LAB_GROUPS[g]))} <span class="small muted gr-n">${t("{n} 项", { n: items.length })}${nb ? ` · ${t("{n} 项超出范围", { n: nb })}` : ""}</span></h2></div><div class="panel mlist">${items.map(item).join("")}</div></section>`; }).join("");
  return `${top(btn)}<div class="gr-tiles">${statTile(t("项目"), String(latest.length), t("每项最新一次"), "var(--slate)")}${statTile(t("超出范围"), String(bad), bad ? t("下次就诊时问医生") : t("都在范围内"), bad ? "var(--rose)" : "var(--sage)")}</div>
    ${sections || `<div class="panel gr-empty"><p class="small muted" style="margin:0">${t("还没有化验记录。点上面的「录入化验」，拍化验单让 AI 填表，或自己填。")}</p></div>`}
    <p class="small muted gr-foot">${t("点一项看走势和每次的记录，可以改或删。范围以化验单为准。")}</p>
    ${recList("labdays", "按日期", labDays().map(d => ({ ts: new Date(d.day + "T12:00:00").getTime(), icon: d.bad ? "⚠️" : "🧪", title: t("{n} 项化验", { n: d.rows.length }) + (d.bad ? ` · ${t("{n} 项超出范围", { n: d.bad })}` : ""),
      meta: d.rows.map(x => `${labTitle(labKeyOf(x), x)} ${labNum(x.value)}${x.unit ? " " + x.unit : ""}${labFlag(x) ? (labFlag(x) === "high" ? " ↑" : " ↓") : ""}`).join(" · "), aiK: "l:" + d.day, ai: (labAi()[d.day]) || null, bad: !!d.bad })),
      { subs: [["bad", t("有超出范围的"), x => x.bad]], foot: t("每个日期可以让 AI 解读这次化验：每项是什么意思、后续注意什么。") })}`;
}
/** 单项页（gr-lab）：最新值 + 范围 + 走势 + 每次的记录（点一条改或删，也能再记一次） */
function labItemView(){
  if (!ensure()) return `<div class="empty">${t("正在读取…")}</div>`;
  const k = H.labKey, rows = k ? labRows(k) : [];
  if (!rows.length) return `<div class="empty">${t("这一项还没有记录。")}<br><button type="button" class="ui-btn" data-tone="ghost" data-tab="gr-labs">${t("回到化验")}</button></div>`;
  const last = rows[rows.length - 1], f = labFlag(last), desc = rows.slice().reverse();
  const g = LABS[k] ? LAB_GROUPS[LABS[k].group] : LAB_GROUPS.other;
  const rec = (x, i) => { const p = desc[i + 1], d = p ? labNum(+x.value - +p.value) : null, fx = labFlag(x);
    return `<button type="button" class="mrow" data-act="gr-lab-edit" data-id="${esc(x.id)}"><span class="mi ${fx ? "lab-bad" : ""}" aria-hidden="true">${fx ? "!" : "✓"}</span><span class="mt"><b>${esc(labDay(x.day))} · <span class="num">${labNum(x.value)}</span> <small class="muted">${esc(x.unit || "")}</small>${fx ? ` ${flagTxt(fx)}` : ""}${d ? ` <small class="muted">${d > 0 ? "↑" : "↓"} ${Math.abs(d)}</small>` : ""}</b>
      <small>${esc([labRange(x) && t("参考 {r}", { r: labRange(x) }), x.notes, x.ai_used ? "AI" : ""].filter(Boolean).join(" · "))}</small></span><span class="mch" aria-hidden="true">›</span></button>`; };
  return `${top(`<button type="button" class="ui-btn" data-size="sm" data-tone="primary" data-act="gr-lab-add" data-k="${esc(k)}">＋ ${t("再记一次这一项")}</button>`)}
    <div class="panel lab-head ${f ? "flag-" + f : ""}"><p class="small muted" style="margin:0 0 2px">${esc(t(g))}</p><h2 style="margin:0">${esc(labTitle(k, last))}</h2>
      <div class="lab-big"><b class="num">${labNum(last.value)}</b> <span class="muted">${esc(last.unit || "")}</span> ${f ? flagTxt(f) : `<span class="lab-flag ok">${t("在范围内")}</span>`}</div>
      <p class="small muted" style="margin:2px 0 8px">${esc([t("参考 {r}", { r: labRange(last) || "—" }), t("最近 {d}", { d: labDay(last.day) }), t("{n} 次", { n: rows.length })].join(" · "))}</p>${labBar(last)}</div>
    <section class="gr-sec"><div class="gr-sh"><h2>${t("走势")}</h2></div><div class="panel">${labChart(rows)}${rows.length < 2 ? `<p class="small muted" style="margin:6px 0 0">${t("只有一次结果，再记一次就能看到走势。")}</p>` : `<p class="small muted" style="margin:6px 0 0">${t("底色带是参考范围；红点 = 那一次超出范围。")}</p>`}</div></section>
    <section class="gr-sec"><div class="gr-sh"><h2>${t("每次的记录")} <span class="small muted gr-n">${t("{n} 条", { n: rows.length })}</span></h2></div><div class="panel mlist">${desc.map(rec).join("")}</div><p class="small muted gr-foot">${t("点一条可以改或删。")}</p></section>`;
}
/** 改 / 删 / 再记一次：同一张小表单。x = 已有的一条；k = 新记一次时的项目 */
function labForm(x, k){
  const base = x || labRows(k).slice(-1)[0] || {}, key = x ? labKeyOf(x) : k, name = labTitle(key, base);
  openForm(`🧪 ${x ? t("修改化验结果") : t("再记一次")} · ${name}`, [
    { k: "day", label: "日期", type: "date", past: true }, { k: "value", label: "结果", mode: "decimal" }, { k: "unit", label: "单位" },
    { k: "ref_low", label: "参考范围：下限（可不填）", mode: "decimal" }, { k: "ref_high", label: "参考范围：上限（可不填）", mode: "decimal" }, { k: "notes", label: "备注", type: "area" }
  ], { day: x ? String(x.day).slice(0, 10) : dayKey(Date.now()), value: x ? String(x.value) : "", unit: base.unit || (LABS[key] ? LABS[key].unit : ""), ref_low: base.ref_low != null ? String(base.ref_low) : "", ref_high: base.ref_high != null ? String(base.ref_high) : "", notes: x ? x.notes || "" : "" },
  async f => {
    if (!f.day) { toast(t("请填日期")); return; }
    if (f.value === "" || isNaN(+f.value)) { toast(t("请填结果（数字）")); return; }
    const row = { day: f.day, value: +f.value, unit: f.unit || "", ref_low: numOr(f.ref_low), ref_high: numOr(f.ref_high), notes: f.notes || "" };
    const { data, error } = await (x ? SB.client.from("hl_labs").update(row).eq("id", x.id) : SB.client.from("hl_labs").insert({ ...row, subject: subj(), code: LABS[key] ? key : "", name: LABS[key] ? "" : name })).select().single();
    if (error) { toast(t("没存上：{m}", { m: error.message })); return; }
    H.labs = x ? H.labs.map(y => (y.id === x.id ? data : y)) : [...H.labs, data];
    closeSheet(); toast(t("已保存")); render();
  }, x ? async () => {
    if (!confirm(t("删除这一项化验结果？"))) return;
    const { error } = await SB.client.from("hl_labs").delete().eq("id", x.id);
    if (error) { toast(t("没删掉：{m}", { m: error.message })); return; }
    H.labs = H.labs.filter(y => y.id !== x.id); closeSheet(); toast(t("已删除"));
    if (!labRows(key).length) S.tab = "gr-labs";   // 这一项没有记录了：回到化验
    render();
  } : null);
}
/** 化验按日期分组（这个孩子的） */
function labDays(){
  const by = new Map(); for (const x of H.labs.filter(x => x.subject === subj())) { const d = String(x.day).slice(0, 10); (by.get(d) || by.set(d, []).get(d)).push(x); }
  return [...by].map(([day, rows]) => ({ day, rows, bad: rows.filter(labFlag).length }));
}
const labAi = () => (((profileRow() || {}).data || {}).ai_labdays) || {};
function historyPage(){
  const p = (profileRow() || {}).data || {}, meds = mine("bmed");
  const row = (label, v) => `<div class="gr-kv"><span class="muted">${t(label)}</span><span>${v ? esc(v) : `<span class="muted">—</span>`}</span></div>`;
  return `${top(`<button type="button" class="ui-btn" data-size="sm" data-tone="primary" data-act="gr-profile">✎ ${t("编辑病史 · 过敏 · 用药")}</button><button type="button" class="ui-btn" data-size="sm" data-tone="ghost" data-act="km-settings">💊 ${t("用药卡与设置")}</button>`)}
    <div class="panel gr-kvs">${row("过敏", p.allergies)}${row("病史", p.conditions)}${row("长期用药", p.meds)}${row("备注", p.notes)}</div>
    <p class="small muted gr-foot">${t("有食物 / 药物过敏、哮喘、湿疹这类情况，记在这里，给医生、学校、AI 分析都用得上。和牧羊人的档案是同一份。")}</p>
    <div class="panel mlist"><button type="button" class="mrow" data-tab="gr-meds"><span class="mi" aria-hidden="true">💊</span><span class="mt"><b>${t("用药记录与趋势")}</b><small>${meds.length ? t("共 {n} 次 · 近 14 / 30 / 90 天的次数、每种药、每一次", { n: meds.length }) : t("记一次用药，这里就有次数趋势和历史")}</small></span><span class="mch" aria-hidden="true">›</span></button></div>`;
}
/* ---- 用药记录与趋势：次数柱状图 + 按药名汇总（js/growth-meds.js），下面是每一次（能搜索、筛类别、列表 | 时间线，点一条改 / 删） ---- */
function medsPage(){
  const meds = mine("bmed");
  return `${top(`<button type="button" class="ui-btn" data-size="sm" data-tone="primary" data-act="km-add">＋ ${t("记一次用药")}</button><button type="button" class="ui-btn" data-size="sm" data-tone="ghost" data-act="km-settings">💊 ${t("用药卡与设置")}</button>`)}
    ${trendHTML(meds, S.kmRange || 30)}
    ${recList("meds", "维生素 / 用药", meds.map(e => ({ ts: e.ts, icon: "💧", cat: e.cat || "", title: [t(e.cat || ""), e.name].filter(Boolean).join(" · "), meta: [e.dose, timingText(timingOf(e, null), t)].filter(Boolean).join(" · "), note: e.note, edit: `data-act="gr-b-med" data-id="${esc(e.id)}"` })),
      { subs: (cs => (cs.length > 1 ? cs.map(c => [c, t(c), x => x.cat === c]) : null))([...new Set(meds.map(e => e.cat).filter(Boolean))]), foot: EDIT_HERE() })}`;
}

/* ---- 病史 · 过敏 · 用药：存在牧羊人的档案（hl_profiles.data），两边同一份 ---- */
function openProfile(){
  if (!H.hlOk) { toast(t("数据库还没有牧羊人的健康表（迁移 026）")); return; }
  const cur = profileRow(), d = (cur || {}).data || {};
  openForm(`📋 ${esc(childName())} · ${t("病史 · 过敏 · 用药")}`, [
    { k: "conditions", label: "病史", type: "area", ph: "哮喘、湿疹、中耳炎反复…" },
    { k: "allergies", label: "过敏", type: "area", ph: "花生、青霉素、尘螨…" },
    { k: "meds", label: "长期用药", type: "area", ph: "名称、剂量、多久一次" },
    { k: "notes", label: "备注", type: "area" }
  ], { conditions: d.conditions || "", allergies: d.allergies || "", meds: d.meds || "", notes: d.notes || "" }, async f => {
    const data = { ...d, conditions: (f.conditions || "").trim(), allergies: (f.allergies || "").trim(), meds: (f.meds || "").trim(), notes: (f.notes || "").trim() };
    const q = cur ? SB.client.from("hl_profiles").update({ data }).eq("id", cur.id).select().single() : SB.client.from("hl_profiles").insert({ subject: subj(), data }).select().single();
    const { data: row, error } = await q;
    if (error) { toast(t("没存上：{m}", { m: error.message })); return; }
    H.profiles = [...H.profiles.filter(p => p.id !== row.id), row]; closeSheet(); toast(t("已保存")); render();
  });
}

/* ============ AI 一次录入体检 / 就诊（和小月亮 js/intake.js 同一个流程，存成小月亮的记录） ============ */
const OK_KEY = LS_PREFIX + ".intakeOk", ATT = "hs-intake";
let X = null;
const VAX_DOSE = ["第1剂", "第2剂", "第3剂", "第4剂", "第5剂", "加强"], VAX_SITE = ["左大腿", "右大腿", "左上臂", "右上臂", "口服"];
const MED_CAT = ["维生素D", "铁剂", "益生菌", "药物"], MS_CAT = ["大运动", "精细动作", "语言", "社交情绪", "认知", "自理"];
const VITALS = [["weight", "体重"], ["length", "身高"], ["head", "头围"], ["temp", "体温"]];
const toLocal = ts => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromLocal = s => { const v = new Date(s).getTime(); return isNaN(v) ? null : v; };

const SC_TEXT = {
  size: { icon: "📏", title: "录入基本体征", desc: "拍体检单或成长记录（可多张），或者打 / 粘贴一段话：体重、身高、头围、体温、血压、心率…。AI 读出来后在下面核对，再保存。", ph: "例：体重 20 kg，身高 112 cm，头围 50 cm，体温 36.8 ℃，血压 98/60" },
  visit: { icon: "🩺", title: "录入体检 / 就诊", desc: "拍就诊小结或体检单（可多张），或者打 / 粘贴一段话：哪家医院、哪位医生、量了多少、医生说了什么、开了什么药。AI 读出来后在下面核对，再保存。", ph: "例：Dr. Lee 儿科体检，体重 20 kg，身高 112 cm，医生说发育正常，注意少吃甜食，明年再来" },
  vax: { icon: "💉", title: "录入疫苗", desc: "拍疫苗本或接种记录（可多张），或者打 / 粘贴一段话：打了什么针、哪天、哪个部位。AI 读出来后在下面核对，再保存。", ph: "例：2026-10-12 流感疫苗，左上臂；2026-11-02 百白破 第4剂，左大腿" }
};
const emptyVax = () => ({ on: true, name: "", day: "", dose: "", site: "" });
function openIntake(src, manual, scope){
  X = { scope: SC_TEXT[scope] ? scope : "all", mode: "ai", src: src || "儿科体检", ts: Date.now(), child: S.childId, clinic: "", doctor: "", note: "", weight: null, length: null, head: null, temp: null,
    ...Object.fromEntries(EXTRA_KEYS.map(k => [k, null])), more: false, vaccines: [], meds: [], milestones: [], rows: [], labs: [], read: !!manual, busy: false, fold: {} };
  attachReset(ATT);
  draw(); showSheet();
}
/** 改一条「宝宝健康」（体检 / 看病 / 在家量）：用同一张表，填好原来的值；不读图、不加疫苗 / 用药，保存时只改这一条 */
function openEdit(id){
  const e = H.rows.find(r => r.id === id); if (!e) return;
  X = { edit: id, src: e.src || "自己记录", ts: e.ts, child: ownerOf(e) || S.childId, clinic: e.clinic || "", doctor: e.doctor || "", note: e.note || "",
    ...Object.fromEntries([...VITALS.map(([k]) => k), ...EXTRA_KEYS].map(k => [k, e[k] == null || e[k] === "" || isNaN(+e[k]) ? null : +e[k]])),
    more: false, vaccines: [], meds: [], milestones: [], rows: [], labs: [], read: true, busy: false, fold: {} };
  attachReset(ATT); draw(); showSheet();
}
/** 写回一条小月亮记录（deleted = 删除：和小月亮一样只打删除标记） */
async function putRow(data, deleted = false){
  const now = Date.now(), d = { ...data, updated: now };
  for (const k of Object.keys(d)) if (d[k] === "" || d[k] == null) delete d[k];
  const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: d.id, type: d.type, ts: d.ts, updated: now, deleted, data: d }, { onConflict: "family_id,id" });
  if (error) { toast(t("没记上：{m}", { m: error.message })); return false; }
  H.rows = deleted ? H.rows.filter(r => r.id !== d.id) : [d, ...H.rows.filter(r => r.id !== d.id)];
  return true;
}
async function saveEdit(){
  const old = H.rows.find(r => r.id === X.edit); if (!old) { X = null; closeSheet(); return; }
  if (X.ts > Date.now() + 60000) { toast(t("时间不能晚于现在")); return; }
  const home = X.src === "自己记录", data = { ...old, src: X.src, ts: X.ts, clinic: home ? "" : X.clinic.trim(), doctor: home ? "" : (X.doctor || "").trim(), note: X.note.trim() };
  for (const k of [...VITALS.map(([k]) => k), ...EXTRA_KEYS]) data[k] = X[k];
  if (await putRow(data)) { X = null; closeSheet(); toast(t("已保存")); render(); }
}
async function delEdit(){
  const old = H.rows.find(r => r.id === X.edit); if (!old || !confirm(t("删除这一条？"))) return;
  if (await putRow(old, true)) { X = null; closeSheet(); toast(t("已删除")); render(); }
}
const segOpts = a => a.map(x => [x, x]);
const fromDay = (d, old) => (d && d !== dayKey(old) ? new Date(d + "T09:00:00").getTime() : old);   // 日期改了才换时间（同一天保留原来的几点）
function editVax(id){
  const e = H.rows.find(r => r.id === id); if (!e) return;
  openForm(`💉 ${t("修改接种记录")}`, [
    { k: "name", label: "疫苗名称", list: VAX_NAMES.map(v => t(v)) }, { k: "day", label: "接种日期", type: "date", past: true },
    { k: "dose", label: "剂次", type: "seg", opts: segOpts(VAX_DOSE) }, { k: "site", label: "接种部位", type: "seg", opts: segOpts(VAX_SITE) },
    { k: "clinic", label: "接种机构" }, { k: "doctor", label: "医生 / 护士" },
    { k: "reaction", label: "接种后反应", type: "seg", opts: segOpts(["无", "局部红肿", "发热", "哭闹", "其他"]) }, { k: "note", label: "备注", type: "area" }
  ], { name: e.name || "", day: dayKey(e.ts), dose: e.dose || "", site: e.site || "", clinic: e.clinic || "", doctor: e.doctor || "", reaction: e.reaction || "", note: e.note || "" },
  async f => {
    if (!f.name) { toast(t("填一下疫苗名称")); return; }
    if (await putRow({ ...e, name: f.name, ts: fromDay(f.day, e.ts), dose: f.dose, site: f.site, clinic: f.clinic, doctor: f.doctor, reaction: f.reaction, note: f.note })) { closeSheet(); toast(t("已保存")); render(); }
  }, async () => { if (!confirm(t("删除这一条？"))) return; if (await putRow(e, true)) { closeSheet(); toast(t("已删除")); render(); } });
}
function editMed(id){
  const e = H.rows.find(r => r.id === id); if (!e) return;
  openForm(`💧 ${t("修改维生素 / 用药")}`, [
    { k: "cat", label: "类别", type: "seg", opts: segOpts(MED_CAT) }, { k: "name", label: "名称" }, { k: "dose", label: "剂量", ph: "如 400 IU 每天一次" },
    { k: "timing", label: "服药时机（按医嘱 / 说明书）", type: "seg", opts: TIMINGS.map(x => [x === "不限" ? "" : x, x]) }, { k: "mins", label: "饭前 / 饭后多少分钟（选填）", type: "num" },
    { k: "day", label: "日期", type: "date", past: true }, { k: "note", label: "备注", type: "area" }
  ], { cat: e.cat || "药物", name: e.name || "", dose: e.dose || "", timing: e.timing || "", mins: e.mins ?? null, day: dayKey(e.ts), note: e.note || "" },
  async f => {
    if (!f.name) { toast(t("填一下名称")); return; }
    if (await putRow({ ...e, cat: f.cat || "药物", name: f.name, dose: f.dose, timing: f.timing, mins: ["饭前", "饭后"].includes(f.timing) ? f.mins : null, ts: fromDay(f.day, e.ts), note: f.note })) { closeSheet(); toast(t("已保存")); render(); }
  }, async () => { if (!confirm(t("删除这一条？"))) return; if (await putRow(e, true)) { closeSheet(); toast(t("已删除")); render(); } });
}
/* 表单里每一块（体征、疫苗、用药、里程碑、多次测量、化验）可以点标题展开 / 折叠；折叠状态记在 X.fold，重画时保留 */
const secOpen = (k, head) => `<details class="ix-sec" data-ixsec="${k}" ${X.fold && X.fold[k] ? "" : "open"}><summary class="ix-h">${head}</summary><div class="ix-sec-b">`, secClose = "</div></details>";
const sel = (k, opts, v, label) => `<select data-ixk="${k}" aria-label="${esc(t(label))}"><option value="">${esc(t(label))}</option>${opts.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(t(o))}</option>`).join("")}</select>`;
/* ---- 表格：多次测量（每个日期一条「宝宝健康」）、化验（每项一条，存牧羊人的化验表 hl_labs） ---- */
const sameDay = d => mine("baby").find(e => dayKey(e.ts) === d) || null;   // 那一天已经有的体征记录（不管是体检还是在家量）
const labSeen = (d, name) => H.labs.find(x => x.subject === subj() && String(x.day).slice(0, 10) === d && labKeyOf(x) === labKeyOf({ name })) || null;
const rowOk = x => x.on && /^\d{4}-\d{2}-\d{2}$/.test(x.day || "") && (x.w || x.l || x.h || Object.keys(x.ex || {}).length);
const labOk = x => x.on && x.name && x.value !== "" && !isNaN(+x.value) && /^\d{4}-\d{2}-\d{2}$/.test(x.day || "");
const disp1 = (k, v) => (v == null ? "" : String(Math.round(toDisp(k, v) * 100) / 100));
const numOr = v => (v === "" || v == null || isNaN(+v) ? null : +v);
function draw(){
  const vit = VITALS.map(([k, l]) => { const dv = X[k] == null ? "" : String(Math.round(toDisp(k, X[k]) * 100) / 100);
    return `<div class="field"><label for="ix_${k}">${t(l)}（${unit(k)}）</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-dim="1" data-orig="${dv}" value="${dv}"></div>`; }).join("");
  // 两岁以后的体检单：BMI、血压、心率、同龄百分位（没有单位换算）；小宝宝默认收起，读到了或点开才显示
  const more = EXTRA.map(([k, , , , , l]) => `<div class="field"><label for="ix_${k}">${t(l)}</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-n="1" value="${X[k] ?? ""}"></div>`).join("");
  const showMore = X.more || EXTRA_KEYS.some(k => X[k] != null) || (ageMonths() ?? 0) >= 24;
  const seenNote = o => (o.seen ? `<span class="small muted ix-note">${t("已经记过，勾上就更新那一条")}</span>` : "");
  const row = (list, i, inner) => `<div class="ix-row ${list[i].on ? "" : "off"}"><label class="check ix-on"><input type="checkbox" data-ixon="${i}" ${list[i].on ? "checked" : ""} aria-label="${esc(t("保存这一条"))}"></label><div class="ix-cells">${inner}${seenNote(list[i])}</div></div>`;
  const today = dayKey(Date.now());
  const vax = X.vaccines.map((v, i) => row(X.vaccines, i, `<input type="text" list="ixvax" data-ixk="name" value="${esc(v.name)}" aria-label="${esc(t("疫苗名称"))}" placeholder="${esc(t("疫苗名称"))}">
    <input type="date" data-ixk="day" value="${esc(v.day || "")}" max="${today}" aria-label="${esc(t("接种日期（空着就用上面的时间）"))}" title="${esc(t("接种日期（空着就用上面的时间）"))}">${sel("dose", VAX_DOSE, v.dose, "剂次")}${sel("site", VAX_SITE, v.site, "接种部位")}`)).join("");
  const meds = X.meds.map((m, i) => row(X.meds, i, `${sel("cat", MED_CAT, m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("名称"))}" placeholder="${esc(t("名称"))}"><input type="text" data-ixk="dose" value="${esc(m.dose)}" aria-label="${esc(t("剂量"))}" placeholder="${esc(t("剂量"))}">`)).join("");
  const ms = X.milestones.map((m, i) => row(X.milestones, i, `${sel("cat", MS_CAT, m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("做到了什么"))}" placeholder="${esc(t("做到了什么"))}">`)).join("");
  const sc = X.scope || "all", scoped = sc !== "all", n = count(), home = X.src === "自己记录", ed = !!X.edit, upd = !ed && !home && sc !== "vax" && sameVisit(mine("baby"), dayKey(X.ts));
  const read = ed || (scoped ? X.mode !== "ai" : (home && X.read && !attachHas(ATT))) ? "" : `<div class="panel ix-read"><p class="small muted" style="margin:0 0 8px">${t(scoped ? SC_TEXT[sc].desc : "拍就诊小结、体检单或疫苗本（可多张），或者打 / 粘贴一段话：量了多少、打了什么针、医生说了什么。AI 读出来后在下面核对，一次保存成几条记录。")}</p>
    ${attachHTML(ATT, { t, esc, textLabel: t("或者打字 / 粘贴"), ph: t(scoped ? SC_TEXT[sc].ph : "例：体重 20 kg，身高 112 cm，打了流感疫苗（左上臂），医生说发育正常，注意少吃甜食、每天户外 1 小时，明年再来") })}
    <div class="btns" style="margin-top:0"><button type="button" class="ui-btn" data-tone="primary" data-ix="read" ${X.busy ? "disabled" : ""}>${X.busy ? t("正在读取…") : `✦ ${t("让 AI 读出来")}`}</button>${X.read || scoped ? "" : `<button type="button" class="ui-btn" data-tone="ghost" data-ix="manual">${t("不用 AI，直接填")}</button>`}</div>
    <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("照片只在浏览器里压缩后发给你自己设置的 AI，不保存；不发孩子的名字。读出来的内容请核对。") : t("还没填 API key：在 我的 → 咩咩咩 里设置")}</p></div>`;
  const modeSeg = !scoped || ed ? "" : `<div class="seg ix-mode" role="group" aria-label="${esc(t("录入方式"))}"><button type="button" data-ix="mode" data-v="ai" aria-pressed="${X.mode === "ai"}">✦ ${t("AI 录入")}</button><button type="button" data-ix="mode" data-v="manual" aria-pressed="${X.mode === "manual"}">✎ ${t("手动录入")}</button></div>`;
  const form = !X.read ? "" : `
    <div class="field" ${sc === "vax" ? "hidden" : ""}><div class="lab" id="ix_src">${t("记录来源")}</div><div class="seg" role="group" aria-labelledby="ix_src">${(sc === "visit" ? ["儿科体检", "看病/急诊"] : ["儿科体检", "看病/急诊", "自己记录"]).map(o => `<button type="button" data-ix="src" data-v="${o}" aria-pressed="${X.src === o}">${t(o === "自己记录" ? "在家量" : o)}</button>`).join("")}</div></div>
    <div class="ix-two ix-where"><div class="field"><label for="ix_ts">${t("时间")}</label><input id="ix_ts" type="datetime-local" data-ixf="ts" max="${toLocal(Date.now())}" value="${toLocal(X.ts)}"></div>
      ${home ? "" : `<div class="field"><label for="ix_clinic">${t("医院 / 诊所")}</label><input id="ix_clinic" type="text" data-ixf="clinic" autocomplete="off" value="${esc(X.clinic)}"></div><div class="field"><label for="ix_doctor">${t("医生")}</label><input id="ix_doctor" type="text" data-ixf="doctor" autocomplete="off" placeholder="${esc(t("如 Dr. Lee"))}" value="${esc(X.doctor || "")}"></div>`}</div>
    ${upd && sc !== "vax" ? `<p class="small muted ix-upd" role="status">${t("这一天已经有一条体检 / 就诊记录：保存时会更新那一条，补上新读到的数，不会多记一条。")}</p>` : ""}
    ${sc === "vax" ? "" : `${secOpen("vitals", `🌡 ${t("体征")}`)}<div class="ix-vitals">${vit}</div>${secClose}`}
    ${(home && sc !== "size") || sc === "vax" ? "" : showMore ? `${secOpen("more", `❤️ ${t("BMI、血压、百分位")}`)}<div class="ix-vitals">${more}</div>${secClose}` : `<div class="ix-more"><button type="button" class="chip" data-ix="more">＋ ${t("BMI、血压、心率、百分位")}</button></div>`}
    <div class="field" ${sc === "vax" ? "hidden" : ""}><label for="ix_note">${t(home ? "备注" : "医生的总结 / 建议")}</label><textarea id="ix_note" data-ixf="note" placeholder="${esc(t(home ? "穿不穿鞋、什么时候量的…" : "医生说了什么、要注意什么、下次什么时候来…"))}">${esc(X.note)}</textarea></div>
    ${(home && sc !== "vax") || ed || !(sc === "all" || sc === "vax") ? "" : `${secOpen("vax", `💉 ${t("疫苗")} <button type="button" class="chip" data-ix="add-vax">＋ ${t("加一针")}</button>`)}<div class="ix-list" data-ixlist="vaccines">${vax || `<p class="small muted">${t("这次没有打针就留空。")}</p>`}</div>${secClose}`}
    ${home || ed || !(sc === "all" || sc === "visit") ? "" : `${secOpen("meds", `💧 ${t("维生素 / 用药")} <button type="button" class="chip" data-ix="add-med">＋ ${t("加一种")}</button>`)}<div class="ix-list" data-ixlist="meds">${meds || `<p class="small muted">${t("医生开了维生素 D、铁剂或药，就加在这里。")}</p>`}</div>${secClose}`}
    ${home || ed || sc !== "all" ? "" : `${secOpen("ms", `⭐ ${t("里程碑")} <button type="button" class="chip" data-ix="add-ms">＋ ${t("加一个")}</button>`)}<div class="ix-list" data-ixlist="milestones">${ms || `<p class="small muted">${t("医生提到的发育情况，可以顺手记下。")}</p>`}</div>${secClose}`}
    ${ed || !X.rows.length || !(sc === "all" || sc === "size") ? "" : `${secOpen("rows", `📋 ${t("多次测量（表格里每个日期一条）")} <span class="small muted">${t("{n} 行", { n: X.rows.length })}</span>`)}<div class="ix-list" data-ixlist="rows">${X.rows.map((x, i) => row(X.rows, i, `<input type="date" data-ixk="day" value="${esc(x.day)}" max="${today}" aria-label="${esc(t("日期"))}">
      <input type="number" inputmode="decimal" step="any" min="0" data-ixk="w" value="${esc(x.w)}" placeholder="${esc(t("体重") + " " + unit("weight"))}" aria-label="${esc(t("体重") + " " + unit("weight"))}"><input type="number" inputmode="decimal" step="any" min="0" data-ixk="l" value="${esc(x.l)}" placeholder="${esc(t("身高") + " " + unit("length"))}" aria-label="${esc(t("身高") + " " + unit("length"))}"><input type="number" inputmode="decimal" step="any" min="0" data-ixk="h" value="${esc(x.h)}" placeholder="${esc(t("头围") + " " + unit("head"))}" aria-label="${esc(t("头围") + " " + unit("head"))}">${Object.keys(x.ex || {}).length ? `<span class="small muted ix-note">${esc(extras(x.ex).join(" · "))}</span>` : ""}`)).join("")}</div>${secClose}`}
    ${ed || !X.labs.length || sc !== "all" ? "" : `${secOpen("labs", `🧪 ${t("化验")} <span class="small muted">${t("{n} 项", { n: X.labs.length })}</span>`)}${H.hlOk ? "" : `<p class="small muted">${t("化验存在牧羊人的化验表里；数据库还没有这张表（迁移 026），这次先不存。")}</p>`}<div class="ix-list" data-ixlist="labs">${X.labs.map((x, i) => row(X.labs, i, `<input type="date" data-ixk="day" value="${esc(x.day)}" max="${today}" aria-label="${esc(t("日期"))}">
      <input type="text" data-ixk="name" value="${esc(x.name)}" placeholder="${esc(t("项目"))}" aria-label="${esc(t("项目"))}"><input type="text" inputmode="decimal" data-ixk="value" value="${esc(x.value)}" placeholder="${esc(t("结果"))}" aria-label="${esc(t("结果"))}"><input type="text" data-ixk="unit" value="${esc(x.unit)}" placeholder="${esc(t("单位"))}" aria-label="${esc(t("单位"))}"><input type="text" inputmode="decimal" data-ixk="lo" value="${esc(x.lo)}" placeholder="${esc(t("参考下限"))}" aria-label="${esc(t("参考下限"))}"><input type="text" inputmode="decimal" data-ixk="hi" value="${esc(x.hi)}" placeholder="${esc(t("参考上限"))}" aria-label="${esc(t("参考上限"))}">`)).join("")}</div>${secClose}`}
    <div class="btns">${ed ? `<button type="button" class="ui-btn" data-tone="primary" data-ix="save">${t("保存修改")}</button><button type="button" class="ui-btn" data-tone="ghost" data-ix="close">${t("取消")}</button><button type="button" class="ui-btn" data-tone="danger" data-ix="del">${t("删除")}</button>`
      : `<button type="button" class="ui-btn" data-tone="primary" data-ix="save" ${n ? "" : "disabled"}>${n ? t("保存 {n} 条", { n }) : t("还没有要保存的")}</button><button type="button" class="ui-btn" data-tone="ghost" data-ix="close">${t("取消")}</button>`}</div>`;
  $("#sheetIn").innerHTML = `${head(ed ? `✎ ${esc(t("修改这条记录"))}` : `${scoped ? SC_TEXT[sc].icon : home ? "📏" : "✦"} ${esc(t(scoped ? SC_TEXT[sc].title : home ? "量一次身高体重" : "AI 综合录入"))}`)}<p class="small muted ix-who">${t("记录给")} <b>${esc(childName(X.child))}</b></p>${modeSeg}${read}${form}
    <datalist id="ixvax">${VAX_NAMES.map(v => `<option value="${esc(t(v))}">`).join("")}</datalist>`;
}
function readIx(){
  const box = $("#sheetIn"); if (!box || !X) return;
  box.querySelectorAll("[data-ixf]").forEach(el => {
    const k = el.dataset.ixf;
    if (k === "ts") { const v = fromLocal(el.value); if (v) X.ts = v; }
    else if (el.dataset.dim) { if (el.value !== el.dataset.orig) X[k] = fromDisp(k, el.value); }
    else if (el.dataset.n) X[k] = el.value === "" || !(+el.value > 0) ? null : +el.value;
    else X[k] = el.value;
  });
  box.querySelectorAll("[data-ixlist]").forEach(list => {
    const arr = X[list.dataset.ixlist];
    list.querySelectorAll(".ix-row").forEach((r, i) => { const o = arr[i]; if (!o) return; o.on = r.querySelector("[data-ixon]").checked; r.querySelectorAll("[data-ixk]").forEach(el => { o[el.dataset.ixk] = el.value.trim(); }); });
  });
}
const hasVit = () => VITALS.some(([k]) => X[k] != null) || EXTRA_KEYS.some(k => X[k] != null);
const keepVitals = () => X.scope === "vax" ? false : X.scope === "size" ? hasVit() : VITALS.some(([k]) => X[k] != null) || (X.src !== "自己记录" && EXTRA_KEYS.some(k => X[k] != null)) || X.note.trim() || X.clinic.trim() || (X.doctor || "").trim();
const listed = () => [...(X.src === "自己记录" ? [] : [...X.vaccines, ...X.meds, ...X.milestones].filter(x => x.on && x.name)), ...(X.rows || []).filter(rowOk), ...(H.hlOk ? (X.labs || []).filter(labOk) : [])];
const count = () => (keepVitals() ? 1 : 0) + listed().length;

async function aiRead(){
  readIx();
  if (!attachHas(ATT)) { toast(t("先拍照 / 选图片，或者打一段话")); return; }
  if (!aiReady()) { toast(t("还没填 API key：在 我的 → 咩咩咩 里设置")); return; }
  let ok = false; try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (e) {}
  if (!ok) { if (!confirm(t("照片和文字会发给你自己设置的 AI 服务商来读取（提示里要求它不要读姓名、生日、地址）；不保存照片。继续吗？"))) return; try { localStorage.setItem(OK_KEY, "1"); } catch (e) {} }
  X.busy = true; draw();
  try {
    const { images, text } = attachPayload(ATT);   // 照片 / PDF + 文字（js/attach.js）
    const r = parseIntake(await askText(INTAKE_SYSTEM, `Read this pediatric visit.${text ? "\nParent's notes:\n" + text.slice(0, 12000) : ""}`, { json: true, images, maxTokens: 6000 }));
    if (!r) throw new Error(t("没读出内容，换一张清楚点的照片或多写几句试试"));
    if (!X) return;
    readIx();
    const sc = X.scope || "all";
    if (r.day) { const d = new Date(r.day + "T09:00:00").getTime(); if (d <= Date.now()) X.ts = d; }
    if (r.src) X.src = r.src; else if (X.src === "自己记录" && (r.vaccines.length || r.note)) X.src = "儿科体检";
    if (sc === "visit" || sc === "vax") { if (X.src === "自己记录") X.src = "儿科体检"; }
    if (sc !== "vax") for (const k of ["weight", "length", "head", "temp", ...EXTRA_KEYS]) if (r[k] != null) X[k] = r[k];
    if (r.clinic) X.clinic = r.clinic;
    if (r.doctor) X.doctor = r.doctor;
    const next = r.next ? t("下次：{s}", { s: r.next }) : "";
    if (sc !== "vax" && (r.note || next)) X.note = [X.note.trim(), r.note, next].filter(Boolean).join("\n");
    // 疫苗本：每一针带自己的日期。已经记过的（同一种针同一天 / 同一剂次 / 同一天同一种药 / 同一个里程碑）和还没到日子的默认不勾，免得记重；
    // 勾上的话保存时更新那一条（补上剂次、部位等），也不会多一条
    const today = dayKey(Date.now()), visit = dayKey(X.ts);
    if (sc === "all" || sc === "vax") X.vaccines.push(...vaxForm([...mine("vax"), ...X.vaccines.filter(x => x.name).map(x => ({ name: x.name, ts: new Date((x.day || visit) + "T12:00:00").getTime(), dose: x.dose }))], r.vaccines, visit, today));
    (sc === "all" || sc === "visit" ? X.meds : []).push(...r.meds.map(m => { const seen = !!sameEntry(mine("bmed"), m.name, visit); return { on: !seen, seen, cat: m.cat, name: m.name, dose: m.dose }; }));
    (sc === "all" ? X.milestones : []).push(...r.milestones.map(m => { const seen = !!sameEntry(mine("milestone"), m.name, null); return { on: !seen, seen, cat: m.cat, name: m.name }; }));
    // 表格：每个日期一行体征；那天已经有记录的默认不勾（勾上 = 补进那一条）
    (sc === "all" || sc === "size" ? X.rows : []).push(...r.rows.map(x => { const seen = !!sameDay(x.day);
      return { on: !seen, seen, day: x.day, src: x.src || "", w: disp1("weight", x.weight), l: disp1("length", x.length), h: disp1("head", x.head), temp: x.temp, ex: Object.fromEntries(EXTRA_KEYS.filter(k => x[k] != null).map(k => [k, x[k]])) }; }));
    // 化验：没写日期的用这次就诊的日期；同一天同一项已经有的默认不勾（勾上 = 改成新读到的数）
    (sc === "all" ? X.labs : []).push(...r.labs.map(x => { const d = x.day || dayKey(X.ts), seen = !!labSeen(d, x.name);
      return { on: !seen, seen, day: d, name: x.name, value: String(x.value), unit: x.unit || "", lo: x.lo ?? "", hi: x.hi ?? "" }; }));
    const skip = [...X.vaccines, ...X.meds, ...X.milestones, ...X.rows, ...X.labs].filter(v => v.seen).length;
    // 这一个入口用不上的内容（比如在疫苗里读到了化验）：不放进表，提醒一下可以用成长首页的「AI 综合录入」一起存
    const other = sc === "all" ? 0 : (sc === "vax" ? 0 : r.vaccines.length) + (sc === "visit" ? 0 : r.meds.length) + r.milestones.length + (sc === "size" ? 0 : r.rows.length) + r.labs.length + (sc === "vax" ? (r.weight != null || r.length != null || r.head != null ? 1 : 0) : 0);
    X.read = true; toast((skip ? t("读出来了，请核对（{n} 条已经记过，没勾）", { n: skip }) : t("读出来了，请核对")) + (other ? " · " + t("单子里还有 {n} 项别的内容，用成长首页的「AI 综合录入」可以一起存", { n: other }) : ""));
  } catch (e) { toast(t("读取失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { if (X) { X.busy = false; draw(); } }
}
/** 存成小月亮的记录（entries），和小月亮里一条条记的一样，小月亮里也能看到、能改 */
async function save(){
  readIx();
  if (X.scope === "size" && !hasVit() && !X.rows.some(rowOk)) { toast(t("请至少填一项基本体征")); return; }
  if (X.scope === "vax" && !X.vaccines.some(v => v.on && v.name)) { toast(t("请至少填一种疫苗的名称")); return; }
  if (X.ts > Date.now() + 60000) { toast(t("时间不能晚于现在")); return; }
  const vaxTs = v => (v.day ? new Date(v.day + "T09:00:00").getTime() : X.ts);   // 疫苗本里每针自己的日期
  if (X.src !== "自己记录" && X.vaccines.some(v => v.on && v.name && !(vaxTs(v) <= Date.now() + 60000))) { toast(t("接种日期不能晚于今天")); return; }
  const now = Date.now(), id = i => "hsix-" + now.toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5);
  const base = { ts: X.ts, child: X.child, updated: now }, clinic = (X.clinic || "").trim(), doctor = (X.doctor || "").trim(), rows = [], visit = dayKey(X.ts);
  // old = 已经记过的同一条：保存时更新它（新读到的数盖上去、没读到的保留），不多记一条；它原来的时间、反应、备注不动
  const keepOld = (r, old, ...drop) => (old ? { ...Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k))), old } : r);
  if (keepVitals()) { const home = X.src === "自己记录";
    rows.push({ type: "baby", src: X.src, clinic: home ? "" : clinic, doctor: home ? "" : doctor, ...Object.fromEntries([...VITALS.map(([k]) => k), ...(home && X.scope !== "size" ? [] : EXTRA_KEYS)].map(k => [k, X[k]]).filter(([, v]) => v != null)), note: X.note.trim(),
      old: home ? null : sameVisit(mine("baby"), visit) }); }
  if (X.src !== "自己记录") {
    for (const v of X.vaccines) if (v.on && v.name) rows.push(keepOld({ type: "vax", ts: vaxTs(v), name: v.name, dose: v.dose, site: v.site, clinic, doctor, reaction: "无" }, sameEntry(mine("vax"), v.name, dayKey(vaxTs(v))), "reaction"));
    for (const m of X.meds) if (m.on && m.name) rows.push(keepOld({ type: "bmed", cat: m.cat || "药物", name: m.name, dose: m.dose, note: t("{src}时医生开的", { src: t(X.src) }) }, sameEntry(mine("bmed"), m.name, visit), "note"));
    for (const m of X.milestones) if (m.on && m.name) rows.push(keepOld({ type: "milestone", cat: m.cat || "认知", name: m.name, note: t("{src}时医生看到的", { src: t(X.src) }) }, sameEntry(mine("milestone"), m.name, null), "note"));
  }
  // 表格里的每个日期：和这次就诊同一天的并进上面那一条；其他日期各一条（那天已有记录就补进去）
  const visitRow = rows.find(r => r.type === "baby" && !r.ts);
  for (const x of X.rows.filter(rowOk)) {
    const ts = new Date(x.day + "T09:00:00").getTime(); if (ts > Date.now()) { toast(t("日期不能晚于今天")); return; }
    const vals = Object.fromEntries(Object.entries({ weight: fromDisp("weight", x.w), length: fromDisp("length", x.l), head: fromDisp("head", x.h), temp: x.temp, ...x.ex }).filter(([, v]) => v != null));
    if (visitRow && x.day === visit) { for (const [k, v] of Object.entries(vals)) if (visitRow[k] == null) visitRow[k] = v; continue; }
    rows.push({ type: "baby", ts, src: x.src || (X.src === "自己记录" ? "自己记录" : X.src), ...vals, old: sameDay(x.day) });
  }
  const labs = H.hlOk ? X.labs.filter(labOk) : [];
  if (!rows.length && !labs.length) return;
  let labN = 0;
  if (labs.length) {   // 化验：新的一次插入；同一天同一项已有的改成新读到的数
    const rec = x => ({ subject: subj(), day: x.day, name: x.name.trim(), value: +x.value, unit: (x.unit || "").trim(), ref_low: numOr(x.lo), ref_high: numOr(x.hi), ai_used: true });
    const fresh = labs.filter(x => !labSeen(x.day, x.name)).map(rec);
    if (fresh.length) { const { data, error } = await SB.client.from("hl_labs").insert(fresh).select(); if (error) { toast(t("化验没存上：{m}", { m: error.message })); return; } H.labs = [...H.labs, ...(data || [])]; labN += fresh.length; }
    for (const x of labs.filter(x => labSeen(x.day, x.name))) {
      const old = labSeen(x.day, x.name), upd = rec(x);
      const { data, error } = await SB.client.from("hl_labs").update(upd).eq("id", old.id).select().single();
      if (error) { toast(t("化验没存上：{m}", { m: error.message })); return; }
      H.labs = H.labs.map(y => (y.id === old.id ? data : y)); labN++;
    }
  }
  if (!rows.length) { X = null; closeSheet(); toast(t("已保存 {n} 项化验", { n: labN })); render(); return; }
  const out = rows.map(({ old, ...r }, i) => {
    const data = old ? { ...mergeInto(old, r), id: old.id, ts: old.ts, updated: now } : { ...base, ...r, id: id(i) };
    for (const k of Object.keys(data)) if (data[k] === "" || data[k] == null) delete data[k];
    return { family_id: fid(), id: data.id, type: data.type, ts: data.ts, updated: now, deleted: false, data }; });
  const { error } = await SB.client.from("entries").upsert(out, { onConflict: "family_id,id" });
  if (error) { toast(t("没记上：{m}", { m: error.message })); return; }
  const ids = new Set(out.map(o => o.id)), upd = rows.filter(r => r.old).length;
  H.rows = [...out.map(o => ({ ...o.data, id: o.id, type: o.type, ts: o.ts })), ...H.rows.filter(e => !ids.has(e.id))];
  X = null; closeSheet(); toast((upd ? t("已保存 {n} 条（其中 {u} 条是更新已有的）", { n: out.length, u: upd }) : t("已保存 {n} 条", { n: out.length })) + (labN ? ` · ${t("{n} 项化验", { n: labN })}` : "")); render();
}

document.addEventListener("click", async ev => {
  const b = ev.target.closest && ev.target.closest("[data-ix]"); if (!b) return;
  const act = b.dataset.ix;
  if (act === "open") { if (!fid()) return; openIntake(b.dataset.src, !!b.dataset.manual, b.dataset.scope); return; }
  if (act === "edit") { if (!fid()) return; openEdit(b.dataset.id); return; }
  if (!X) return;
  readIx();
  switch (act) {
    case "close": X = null; closeSheet(); return;
    case "read": await aiRead(); return;
    case "manual": X.read = true; break;
    case "mode": X.mode = b.dataset.v === "manual" ? "manual" : "ai"; if (X.mode === "manual") { X.read = true; if (X.scope === "vax" && !X.vaccines.length) X.vaccines.push(emptyVax()); } break;
    case "src": X.src = b.dataset.v; break;
    case "more": X.more = true; break;
    case "add-vax": X.vaccines.push({ on: true, name: "", day: "", dose: "", site: "" }); break;
    case "add-med": X.meds.push({ on: true, cat: "维生素D", name: "", dose: "" }); break;
    case "add-ms": X.milestones.push({ on: true, cat: "大运动", name: "" }); break;
    case "save": await (X.edit ? saveEdit() : save()); return;
    case "del": await delEdit(); return;
  }
  draw();
});
document.addEventListener("toggle", ev => { const d = ev.target; if (X && d.matches && d.matches("details.ix-sec")) X.fold[d.dataset.ixsec] = !d.open; }, true);
document.addEventListener("change", ev => {
  if (!X || !ev.target.closest || !ev.target.closest("#sheetIn") || !$("#sheetIn [data-ix=save]")) return;
  const row = ev.target.closest(".ix-row"); if (row && ev.target.matches("[data-ixon]")) row.classList.toggle("off", !ev.target.checked);
  if (X.edit) return;   // 改一条时按钮一直是「保存修改」
  readIx(); const n = count(), btn = $("#sheetIn [data-ix=save]");
  btn.disabled = !n; btn.textContent = n ? t("保存 {n} 条", { n }) : t("还没有要保存的");
});

/** 给 AI 分析用（第 ③ 版）：这个孩子的身体与健康摘要（不含姓名） */
function bodySummary(){
  if (!H.loaded) return null;
  const p = (profileRow() || {}).data || {};
  return {
    growth: mine("baby").filter(e => e.weight || e.length || e.bmi || e.bp_sys).slice(0, 8).map(e => ({ date: dayKey(e.ts), weight_kg: e.weight || null, height_cm: e.length || null,
      ...Object.fromEntries([["bmi", "bmi"], ["bp_sys", "bp_systolic"], ["bp_dia", "bp_diastolic"], ["pulse", "pulse"], ["wpct", "weight_pct"], ["lpct", "height_pct"], ["bmipct", "bmi_pct"]].filter(([k]) => e[k] != null).map(([k, n]) => [n, e[k]])) })),
    visits: visitsAll().slice(0, 8).map(v => ({ date: dayKey(v.ts), kind: v.annual ? "checkup" : "visit", notes: v.text.slice(0, 500) })),
    vaccines: mine("vax").slice(0, 20).map(e => ({ date: dayKey(e.ts), name: e.name, dose: e.dose || null })),
    meds: mine("bmed").filter(e => e.ts > Date.now() - 180 * D).map(e => ({ date: dayKey(e.ts), cat: e.cat, name: e.name, dose: e.dose || "" })),
    labs: H.labs.filter(x => x.subject === subj()).map(x => ({ date: x.day, test: x.name || x.code, value: +x.value, unit: x.unit, ref_low: x.ref_low, ref_high: x.ref_high })),
    history: p.conditions || "", allergies: p.allergies || "", long_term_meds: p.meds || ""
  };
}
/* ============ 每条记录的 AI 解读（体检 / 就诊 / 化验）：先看结果，再选「保留」；保留的可以重新分析或清除 ============
   格式和牧羊人的就诊解读一样（plain / agree / differ / questions），多了 advice（医生建议是什么意思、怎么做）和 follow（后续注意）。
   存在哪：小月亮的记录 → 记录里的 ai；牧羊人的就诊 → hl_visits.ai（牧羊人也显示）；某一天的化验 → 档案 data.ai_labdays[日期]。
   发给 AI 的：年龄、性别、体征和同龄正常范围、医生写的总结 / 建议、同一天的疫苗 / 用药 / 化验、之前几次的数；不发姓名、不发医院和医生的名字。 */
const REC_AI_OK = LS_PREFIX + ".recAiOk";
let AIP = null;   // 刚分析出来、还没决定保不保留的：{ k, ai }
const aiBody = a => recAiBody(a, t, esc);   // 提示词、解析、内容的画法在 js/record-ai.js（和小月亮同一份）
function aiSavedHTML(k, a, busy){
  return `<details class="gb-ai"><summary>✦ ${t("AI 解读")} <span class="small muted">${esc(String(a.at || "").slice(0, 10))}</span></summary><div class="gb-ai-in">${aiBody(a)}
    <div class="btns"><button type="button" class="ui-btn" data-size="sm" data-tone="ghost" data-act="gr-b-ai" data-k="${esc(k)}" ${busy ? "disabled" : ""}>${busy ? t("分析中…") : t("重新分析")}</button><button type="button" class="ui-btn" data-size="sm" data-tone="ghost" data-act="gr-b-aiclr" data-k="${esc(k)}">${t("清除")}</button></div>
    <p class="small muted">${t("AI 不是医生：意见不同时以医生为准，把它当成复诊时要问的问题。")}</p></div></details>`;
}
const ageOf = ts => { const m = ageMonths(S.childId, ts); return m == null ? null : m < 24 ? `${m} months` : `${Math.floor(m / 12)} years ${m % 12} months`; };
const sexOf = () => ({ m: "boy", f: "girl" }[genderOf()] || null);
const prevDays = (ts, n) => mine("baby").filter(e => e.ts < ts - D && (e.weight || e.length || e.bmi || e.bp_sys)).slice(0, n)
  .map(e => ({ date: dayKey(e.ts), weight_kg: e.weight ?? null, height_cm: e.length ?? null, bmi: e.bmi ?? null, weight_pct: e.wpct ?? null, height_pct: e.lpct ?? null }));
const labIn = x => ({ test: x.name || x.code, value: +x.value, unit: x.unit || "", ref_low: x.ref_low, ref_high: x.ref_high, flag: labFlag(x) });
/** 一条记录 → 发给 AI 的输入（不含姓名、医院、医生） */
function aiInput(k){
  const [kind, id] = [k.slice(0, 1), k.slice(2)];
  if (kind === "e") {
    const e = H.rows.find(r => r.id === id); if (!e) return null;
    const m = ageMonths(S.childId, e.ts), sx = genderOf() || null, d = dayKey(e.ts), hr = hrRange(m), bp = bpLimit(m, sx);
    const meas = Object.fromEntries(Object.entries({ weight_kg: e.weight, height_cm: e.length, head_cm: e.head, temp_c: e.temp, bmi: e.bmi, bp_systolic: e.bp_sys, bp_diastolic: e.bp_dia, pulse: e.pulse,
      weight_pct: e.wpct, height_pct: e.lpct, head_pct: e.headpct, bmi_pct: e.bmipct }).filter(([, v]) => v != null && v !== ""));
    const flags = ["pulse", "bp_sys", "bp_dia", "bmipct", "wpct", "lpct"].map(f => [f, vtFlag(f, e[f], m, sx)]).filter(([, v]) => v).map(([f, v]) => `${f}: ${v === "高" ? "high" : "low"}`);
    return { record: e.src === "儿科体检" ? "well-child checkup" : "sick / urgent visit", date: d, age: ageOf(e.ts), sex: sexOf(), measurements: meas,
      normal_ranges: { pulse: hr ? `${hr.lo}-${hr.hi}` : null, bp_screen_limit: bp ? `${bp.sys}/${bp.dia}` : null, bmi_band: e.bmipct != null ? bmiBand(+e.bmipct) : null, percentiles: "P3-P97 is the usual range" }, flags,
      doctor_summary_and_advice: e.note || "", vaccines_same_day: mine("vax").filter(v => dayKey(v.ts) === d).map(v => [v.name, v.dose].filter(Boolean).join(" ")),
      medicines_same_day: mine("bmed").filter(v => dayKey(v.ts) === d).map(v => [v.name, v.dose].filter(Boolean).join(" ")),
      labs_same_day: H.labs.filter(x => x.subject === subj() && String(x.day).slice(0, 10) === d).map(labIn), earlier: prevDays(e.ts, 3),
      history: ((profileRow() || {}).data || {}).conditions || "", allergies: ((profileRow() || {}).data || {}).allergies || "" };
  }
  if (kind === "v") {
    const v = H.visits.find(x => x.id === id); if (!v) return null;
    return { record: v.kind === "annual" ? "annual checkup" : "visit (" + v.kind + ")", date: v.day, age: ageOf(new Date(v.day + "T12:00:00").getTime()), sex: sexOf(), reason: v.reason || "", vitals: v.vitals || {},
      diagnosis: v.diagnosis || "", doctor_advice: v.advice || "", labs_same_day: H.labs.filter(x => x.visit_id === v.id || (x.subject === v.subject && String(x.day).slice(0, 10) === v.day)).map(labIn),
      history: ((profileRow() || {}).data || {}).conditions || "" };
  }
  const d = labDays().find(x => x.day === id); if (!d) return null;
  const all = H.labs.filter(x => x.subject === subj());
  return { record: "lab results", date: d.day, age: ageOf(new Date(d.day + "T12:00:00").getTime()), sex: sexOf(),
    labs: d.rows.map(x => ({ ...labIn(x), earlier: all.filter(y => (y.code || y.name) === (x.code || x.name) && String(y.day).slice(0, 10) < d.day).sort((a, b) => String(b.day).localeCompare(String(a.day))).slice(0, 3).map(y => ({ date: String(y.day).slice(0, 10), value: +y.value })) })),
    history: ((profileRow() || {}).data || {}).conditions || "" };
}
async function runAi(k){
  if (!aiReady()) { toast(t("还没填 API key：在 我的 → 咩咩咩 里设置")); return; }
  let ok = false; try { ok = localStorage.getItem(REC_AI_OK) === "1"; } catch (e) {}
  if (!ok) { if (!confirm(t("会把这条记录的体征、医生的总结和建议、同一天的化验 / 疫苗 / 用药和孩子的年龄发给你自己设置的 AI 服务商（不发姓名、医院和医生名字）。继续吗？"))) return; try { localStorage.setItem(REC_AI_OK, "1"); } catch (e) {} }
  const input = aiInput(k); if (!input) return;
  H.aiBusy = k; render(); if ($("#sheet").open && AIP) drawAiSheet(true);
  try {
    const ai = parseRecAi(await askText(REC_AI_SYSTEM(locale()), JSON.stringify(input), { json: true, maxTokens: 2200 }));
    if (!ai) throw new Error(t("AI 返回的格式不对，再试一次"));
    AIP = { k, ai };
    drawAiSheet(false); showSheet();
  } catch (e) { toast(t("分析失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { H.aiBusy = null; render(); }
}
function drawAiSheet(busy){
  if (!AIP) return;
  $("#sheetIn").innerHTML = `${head(`✦ ${esc(t("AI 解读"))}`)}<div class="panel gb-ai-in">${aiBody(AIP.ai)}</div>
    <div class="btns"><button type="button" class="ui-btn" data-tone="primary" data-act="gr-b-aikeep">${t("保留")}</button><button type="button" class="ui-btn" data-tone="ghost" data-act="gr-b-ai" data-k="${esc(AIP.k)}" ${busy ? "disabled" : ""}>${busy ? t("分析中…") : t("重新分析")}</button><button type="button" class="ui-btn" data-tone="ghost" data-act="gr-b-aidrop">${t("不要")}</button></div>
    <p class="small muted">${t("AI 不是医生：意见不同时以医生为准，把它当成复诊时要问的问题。保留后显示在这条记录下面，可以重新分析或清除。")}</p>`;
}
/** 保存 / 清除一条记录的解读（ai = null 是清除） */
async function storeAi(k, ai){
  const [kind, id] = [k.slice(0, 1), k.slice(2)];
  if (kind === "e") { const e = H.rows.find(r => r.id === id); if (!e) return false; const { ai: _, ...rest } = e; return putRow(ai ? { ...rest, ai } : rest); }
  if (kind === "v") {
    const { data, error } = await SB.client.from("hl_visits").update({ ai }).eq("id", id).select().single();
    if (error) { toast(/column|ai/i.test(error.message || "") ? t("就诊的 AI 解读要先在 Supabase 执行 baby-log 的 028_shepherd_visit_place_ai.sql") : t("没存上：{m}", { m: error.message })); return false; }
    H.visits = H.visits.map(x => (x.id === id ? data : x)); return true;
  }
  const cur = profileRow(), d = (cur || {}).data || {}, map = { ...(d.ai_labdays || {}) };
  if (ai) map[id] = ai; else delete map[id];
  const data = { ...d, ai_labdays: map };
  const { data: row, error } = await (cur ? SB.client.from("hl_profiles").update({ data }).eq("id", cur.id).select().single() : SB.client.from("hl_profiles").insert({ subject: subj(), data }).select().single());
  if (error) { toast(t("没存上：{m}", { m: error.message })); return false; }
  H.profiles = [...H.profiles.filter(p => p.id !== row.id), row]; return true;
}
/* ---- 录入化验（11-16）：和牧羊人的「录入化验」同一个样子——日期、套餐、整张表一次填；也可以拍化验单 / 贴文字，让 AI 把表填好再核对 ----
   LB.vals = { 项目代码: { value, unit, ref_low, ref_high } }；对不上内置项目的放 LB.extra = [{ name, value, unit, ref_low, ref_high }]。
   表里改的数字马上记进 LB（input 事件，不重画，光标不跳）；切换套餐不会丢。保存时只存填了数字的；同一天同一项已有的改成新填的数。
   参考范围不预填：内置的常见范围是成人的，孩子不一样；范围以化验单为准（AI 读图会带上单子上的范围，也可以手填）。 */
const LATT = "hs-labs";
let LB = null;
const lbFilled = v => !!v && v.value !== "" && v.value != null && !isNaN(+v.value);
const lbFlagOf = v => (lbFilled(v) ? labFlag({ value: +v.value, ref_low: numOr(v.ref_low), ref_high: numOr(v.ref_high) }) : null);
const lbCount = g => Object.entries(LB.vals).filter(([c, v]) => lbFilled(v) && LABS[c] && LABS[c].group === g).length + (g === "other" ? LB.extra.filter(lbFilled).length : 0);
const lbTotal = () => Object.keys(LAB_GROUPS).reduce((a, g) => a + lbCount(g), 0);
function openLabBatch(){
  if (!fid() || !H.hlOk) return;
  attachReset(LATT);
  LB = { day: dayKey(Date.now()), panel: "lipid", vals: {}, extra: [], fasting: false, busy: false, ai: false, aiOn: true };
  drawLb(); showSheet();
}
function lbRow(attr, label, v, unitDef){
  const f = lbFlagOf(v), cell = (k, val, cls, ph, aria, num = true) => `<input class="lb-in ${cls}" ${attr} data-lbf="${k}" type="text" ${num ? 'inputmode="decimal"' : ""} autocomplete="off" value="${esc(val ?? "")}" placeholder="${esc(t(ph))}" aria-label="${esc(aria)}">`;
  const nm = attr.startsWith("data-lbx") ? "" : label;
  return `<div class="lb-row ${f ? "flag-" + f : ""}" ${attr}><div class="lb-name">${attr.startsWith("data-lbx") ? cell("name", v.name, "lb-nm", "项目名称", t("项目名称"), false) : nm}<span class="lb-f">${f ? flagTxt(f) : ""}</span></div>
    <div class="lb-cells">${cell("value", v.value, "lb-v", "结果", `${nm || v.name || ""} ${t("结果")}`)}${cell("unit", v.unit ?? unitDef, "lb-u", "单位", t("单位"), false)}
      <span class="lb-rng">${cell("ref_low", v.ref_low, "lb-r", "下限", t("参考范围：下限（可不填）"))}<span aria-hidden="true">–</span>${cell("ref_high", v.ref_high, "lb-r", "上限", t("参考范围：上限（可不填）"))}</span></div></div>`;
}
function drawLb(){
  if (!LB) return;
  const g = LB.panel, items = Object.entries(LABS).filter(([, x]) => x.group === g), n = lbTotal();
  const rows = items.map(([c, x]) => lbRow(`data-lbk="${esc(c)}"`, esc(locale() === "en" ? x.en : t(x.name)), LB.vals[c] || {}, x.unit)).join("")
    + (g === "other" ? LB.extra.map((v, i) => lbRow(`data-lbx="${i}"`, "", v, "")).join("") : "");
  const shep = `https://dev-hyang.github.io/shepherd/#/health/labs?who=${encodeURIComponent(subj())}&new=lab`;   // 直接打开牧羊人里这个孩子的「录入化验」（牧羊人 2026-11-16.2 起）
  $("#sheetIn").innerHTML = `${head(`🧪 ${esc(t("录入化验"))}`)}
    <div class="seg ix-mode lb-mode" role="group" aria-label="${esc(t("录入方式"))}"><button type="button" data-lb="aitoggle" aria-pressed="${LB.aiOn}">✦ ${t("AI 录入")}</button><a href="${shep}" target="_blank" rel="noopener" title="${esc(t("在牧羊人里录入化验"))}">${t("在牧羊人里录入")} ↗</a></div>
    ${LB.aiOn ? `<div class="panel lb-ai"><p class="small muted" style="margin:0 0 8px">${t("拍化验单或门户网站的截图（可多张），或者粘贴文字，AI 把下面的表填好，你核对后保存。也可以不用 AI，直接填表。")}</p>
      ${attachHTML(LATT, { t, esc, textLabel: t("或者打字 / 粘贴"), ph: t("例：LDL 104 mg/dL（参考 <100），血红蛋白 12.1 g/dL（11.5–15.5）"), forceOpen: LB.busy })}
      <div class="btns" style="margin-top:0"><button type="button" class="ui-btn" data-tone="primary" data-lb="read" ${LB.busy ? "disabled" : ""}>${LB.busy ? t("正在读取…") : `✦ ${t("让 AI 读出来")}`}</button></div>
      <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("照片只在浏览器里压缩后发给你自己设置的 AI，不保存；不发孩子的名字。读出来的内容请核对。") : t("还没填 API key：在 我的 → 咩咩咩 里设置")}</p></div>` : ""}
    <div class="field"><label for="lb_day">${t("采样日期")}</label><input id="lb_day" type="date" data-lbd="day" max="${dayKey(Date.now())}" value="${esc(LB.day)}"></div>
    <div class="field"><div class="lab" id="lb_panel">${t("套餐")}</div><div class="seg lb-seg" role="group" aria-labelledby="lb_panel">${Object.entries(LAB_GROUPS).map(([k, l]) => `<button type="button" data-lb="panel" data-v="${k}" aria-pressed="${g === k}">${esc(t(l))}${lbCount(k) ? ` · ${lbCount(k)}` : ""}</button>`).join("")}</div></div>
    <div class="lb-tbl">${rows}</div>${g === "other" ? `<button type="button" class="chip" data-lb="extra">＋ ${t("加一项（单子上别的项目）")}</button>` : ""}
    <div class="field"><label class="check"><input type="checkbox" data-lbd="fasting" ${LB.fasting ? "checked" : ""}>${t("空腹采血")}</label></div>
    <p class="small muted lb-hint">${t("参考范围以化验单为准（孩子和成人不一样，这里不预填）。")}</p>
    <div class="btns"><button type="button" class="ui-btn" data-tone="primary" data-lb="save" ${n ? "" : "disabled"}>${n ? t("保存 {n} 项化验", { n }) : t("还没有要保存的")}</button></div>`;
}
/** 改了数字之后只更新提示、套餐上的数目和保存按钮（不重画，光标不跳） */
function lbRefresh(row){
  if (row) { const v = row.dataset.lbk !== undefined ? LB.vals[row.dataset.lbk] : LB.extra[+row.dataset.lbx], f = lbFlagOf(v || {});
    row.classList.remove("flag-high", "flag-low"); if (f) row.classList.add("flag-" + f); const el = row.querySelector(".lb-f"); if (el) el.innerHTML = f ? flagTxt(f) : ""; }
  const n = lbTotal(), btn = $("#sheetIn [data-lb=save]"); if (btn) { btn.disabled = !n; btn.textContent = n ? t("保存 {n} 项化验", { n }) : t("还没有要保存的"); }
  $("#sheetIn").querySelectorAll("[data-lb=panel]").forEach(b => { const k = b.dataset.v, c = lbCount(k); b.textContent = t(LAB_GROUPS[k]) + (c ? ` · ${c}` : ""); });
}
async function lbRead(){
  if (!attachHas(LATT)) { toast(t("先拍照 / 选图片，或者打一段话")); return; }
  if (!aiReady()) { toast(t("还没填 API key：在 我的 → 咩咩咩 里设置")); return; }
  let ok = false; try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (e) {}
  if (!ok) { if (!confirm(t("照片和文字会发给你自己设置的 AI 服务商来读取（提示里要求它不要读姓名、生日、地址）；不保存照片。继续吗？"))) return; try { localStorage.setItem(OK_KEY, "1"); } catch (e) {} }
  LB.busy = true; drawLb();
  try {
    const { images, text } = attachPayload(LATT);
    const r = parseIntake(await askText(INTAKE_SYSTEM, `Read this lab report: put every test row in "labs" with its value, unit and printed reference range.${text ? "\nParent's notes:\n" + text.slice(0, 12000) : ""}`, { json: true, images, maxTokens: 6000 }));
    if (!r || !r.labs.length) throw new Error(t("没读出化验项目，换一张清楚点的照片或多写几句试试"));
    if (!LB) return;
    // 单子里可能有好几个日期：这张表只放一天，取项目最多的那天（并列取最近的）；其余的请用「AI 录入体检」，它按日期一行一行读
    const today = dayKey(Date.now()), dayOf = x => x.day || r.day || LB.day, cnt = new Map();
    for (const x of r.labs) cnt.set(dayOf(x), (cnt.get(dayOf(x)) || 0) + 1);
    const best = [...cnt].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0];
    let skipped = 0;
    for (const x of r.labs) {
      if (dayOf(x) !== best) { skipped++; continue; }
      const code = LAB_BY_NAME.get(labNorm(x.name)), v = { value: String(x.value), unit: x.unit || (code ? LABS[code].unit : ""), ref_low: x.lo ?? "", ref_high: x.hi ?? "" };
      if (code) LB.vals[code] = v; else LB.extra.push({ name: x.name, ...v });
    }
    if (best <= today) LB.day = best;
    const counts = Object.keys(LAB_GROUPS).map(g => [g, lbCount(g)]).sort((a, b) => b[1] - a[1]);
    if (counts[0][1]) LB.panel = counts[0][0];
    LB.ai = true;
    toast(skipped ? t("读出来了；另外 {n} 项是别的日期，请用「AI 录入体检」按日期录入", { n: skipped }) : t("读出来了，请核对"));
  } catch (e) { toast(t("读取失败：{m}", { m: String((e && e.message) || e).slice(0, 100) })); }
  finally { if (LB) { LB.busy = false; drawLb(); } }
}
async function saveLb(){
  if (!LB.day) { toast(t("请填日期")); return; }
  if (LB.day > dayKey(Date.now())) { toast(t("日期不能晚于今天")); return; }
  const out = [];
  for (const [c, v] of Object.entries(LB.vals)) if (lbFilled(v) && LABS[c]) out.push({ code: c, name: "", value: +v.value, unit: (v.unit ?? LABS[c].unit) || "", ref_low: numOr(v.ref_low), ref_high: numOr(v.ref_high) });
  for (const v of LB.extra.filter(lbFilled)) {
    const nm = String(v.name || "").trim(); if (!nm) { toast(t("「其他」里填了结果的项目要写名字")); return; }
    const code = LAB_BY_NAME.get(labNorm(nm)) || "";
    out.push({ code, name: code ? "" : nm.slice(0, 80), value: +v.value, unit: String(v.unit || "").trim(), ref_low: numOr(v.ref_low), ref_high: numOr(v.ref_high) });
  }
  if (!out.length) { toast(t("请至少填一项结果")); return; }
  const rec = x => ({ ...x, subject: subj(), day: LB.day, ai_used: LB.ai, ...(LB.fasting ? { notes: t("空腹") } : {}) });
  const seen = x => H.labs.find(y => y.subject === subj() && String(y.day).slice(0, 10) === LB.day && labKeyOf(y) === labKeyOf(x)) || null;
  const fresh = out.filter(x => !seen(x)).map(rec), upd = out.filter(x => seen(x));
  if (fresh.length) { const { data, error } = await SB.client.from("hl_labs").insert(fresh).select(); if (error) { toast(t("化验没存上：{m}", { m: error.message })); return; } H.labs = [...H.labs, ...(data || [])]; }
  for (const x of upd) {
    const old = seen(x), { data, error } = await SB.client.from("hl_labs").update(rec(x)).eq("id", old.id).select().single();
    if (error) { toast(t("化验没存上：{m}", { m: error.message })); return; }
    H.labs = H.labs.map(y => (y.id === old.id ? data : y));
  }
  LB = null; closeSheet(); toast(t("已保存 {n} 项化验", { n: out.length })); render();
}
document.addEventListener("click", async ev => {
  const b = ev.target.closest && ev.target.closest("[data-lb]"); if (!b || !LB) return;
  switch (b.dataset.lb) {
    case "panel": LB.panel = b.dataset.v; drawLb(); return;
    case "extra": LB.extra.push({ name: "", value: "", unit: "", ref_low: "", ref_high: "" }); drawLb(); return;
    case "aitoggle": LB.aiOn = !LB.aiOn; drawLb(); return;
    case "read": await lbRead(); return;
    case "save": await saveLb(); return;
  }
});
document.addEventListener("input", ev => {
  const el = ev.target; if (!LB || !el.dataset || !el.closest || !el.closest("#sheetIn")) return;
  if (el.dataset.lbd === "day") { LB.day = el.value; return; }
  if (el.dataset.lbd === "fasting") { LB.fasting = el.checked; return; }
  const row = el.closest(".lb-row"); if (!row || el.dataset.lbf === undefined) return;
  const v = row.dataset.lbk !== undefined ? (LB.vals[row.dataset.lbk] ||= {}) : LB.extra[+row.dataset.lbx]; if (!v) return;
  v[el.dataset.lbf] = el.value; lbRefresh(row);
});
const VT_Q = "看看孩子的这些体征（体重、身高、BMI、血压、心率）：和同龄正常范围比怎么样？走势有没有要注意的？平时可以怎么做？什么情况要去看医生？";
function bodyAct(act, btn){
  if (act === "gr-profile") { openProfile(); return true; }
  if (act === "gr-body-reload") { loadBody(true); return true; }
  if (act === "gr-b-view") { BF.view = btn.dataset.v === "timeline" ? "timeline" : "list"; render(); return true; }
  if (act === "gr-b-vax") { editVax(btn.dataset.id); return true; }
  if (act === "gr-lab-open") { H.labKey = btn.dataset.k; S.tab = "gr-lab"; render(); window.scrollTo(0, 0); return true; }
  if (act === "gr-lab-edit") { const x = H.labs.find(y => y.id === btn.dataset.id); if (x) labForm(x); return true; }
  if (act === "gr-lab-add") { labForm(null, btn.dataset.k); return true; }
  if (act === "gr-lab-batch") { openLabBatch(); return true; }
  if (act === "gr-b-ai") { runAi(btn.dataset.k); return true; }
  if (act === "gr-b-aikeep") { if (AIP) storeAi(AIP.k, AIP.ai).then(ok => { if (ok) { AIP = null; closeSheet(); toast(t("已保留")); render(); } }); return true; }
  if (act === "gr-b-aidrop") { AIP = null; closeSheet(); return true; }
  if (act === "gr-b-aiclr") { if (confirm(t("清除这条 AI 解读？"))) storeAi(btn.dataset.k, null).then(ok => { if (ok) { toast(t("已清除")); render(); } }); return true; }
  if (act === "gr-b-med") { editMed(btn.dataset.id); return true; }
  if (act === "gr-vt-ask") { askAbout({ q: t(VT_Q), extra: vitalsContext(mine("baby"), vtCtx()), name: t("基本体征摘要"), from: "growth" }); return true; }
  return false;
}
const bodyReady = () => H.loaded;

export { bodyRowDesc, bodyTopicHTML, bodyAct, bodySummary, bodyReady, loadBody, labItemView };
