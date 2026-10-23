import { t } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { $, D, dayKey, esc } from "./core/util.js";
import { bars, curve, donut, stack } from "./charts.js";
import { vz, ve } from "./data/versions.js";
import { INTERVALS, fetchVersions, poolCfg, poolOf, progressOf } from "./hs.js";
import { head, showSheet } from "./sheet.js";
import { mrow } from "./me.js";

/* ============ 经文卡库：总览（图表）+ 列表（按类型分层）============
   筛选集成在一行：类型 / 状态 / 排序 / 搜索，都是下拉和输入框，没有标签条。
   总览的图表跟着“类型”走，点图上的色块、图例、柱子 = 套用对应的类型 + 状态筛选并切到列表。
   状态：没开始 → 新学（在学）→ 复习中（会背了，按 3、7、30、90、180 天复习）；放一放另算。 */
S.scrFilter = Object.assign({ kind: "all", st: "active", sort: "review", q: "", view: "list" }, S.scrFilter || {});

const KINDS = [["verse", "经文"], ["catechism", "问答"], ["hymn", "诗歌"]];
const kindOf = s => (s.kind === "catechism" ? "catechism" : s.kind === "hymn" ? "hymn" : "verse");
const ST = { learning: { name: "新学", color: "var(--honey)" }, learned: { name: "复习中", color: "var(--sage)" }, paused: { name: "放一放", color: "var(--muted)" }, none: { name: "没开始", color: "var(--line)" } };
const ST_KEY = { learning: "new", learned: "review", paused: "paused", none: "none" };   // 筛选值
const STATUS_OPTS = [["active", "进行中（新学 + 复习中）"], ["new", "新学（在学）"], ["review", "复习中（已会背）"], ["due", "今天要做 / 做过"], ["paused", "放一放"], ["none", "没开始"], ["all", "全部"]];
const SORT_OPTS = [["review", "按下次复习时间"], ["count", "按已复习次数"], ["lib", "按卡库顺序"]];
const days = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / D);

const statusOf = (s, cid) => { const p = progressOf(s.id, cid); return !p ? "none" : p.status === "paused" ? "paused" : p.status === "learning" ? "learning" : "learned"; };
const isDue = (s, cid, day) => { const p = progressOf(s.id, cid); return !!p && p.status !== "paused" && (p.last_on === day || (p.status === "learned" && !!p.next_review && p.next_review <= day)); };
function matches(s, cid, day, f){
  if (f.kind !== "all" && kindOf(s) !== f.kind) return false;
  const st = statusOf(s, cid);
  if (f.st === "active" && !(st === "learning" || st === "learned")) return false;
  if (f.st === "new" && st !== "learning") return false;
  if (f.st === "review" && st !== "learned") return false;
  if (f.st === "paused" && st !== "paused") return false;
  if (f.st === "none" && st !== "none") return false;
  if (f.st === "due" && !isDue(s, cid, day)) return false;
  const q = (f.q || "").trim().toLowerCase();
  return !q || `${s.ref}${s.text_zh}${s.text_en}`.toLowerCase().includes(q);
}
function sorted(list, cid, sort){
  const rank = { learned: "1", learning: "2", paused: "3", none: "4" };
  const key = s => { const p = progressOf(s.id, cid), st = statusOf(s, cid); return rank[st] + (st === "learned" ? (p && p.next_review) || "" : ""); };
  if (sort === "review") return [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  if (sort === "count") return [...list].sort((a, b) => ((progressOf(b.id, cid) || {}).reviews || 0) - ((progressOf(a.id, cid) || {}).reviews || 0));
  return list;
}

/* ---- 统计 ---- */
const SETTLE = 0.1625;   // 复习到点时估计还记得约 85%：S = 间隔 / -ln(0.85)
const stability = n => INTERVALS[Math.min(n, INTERVALS.length - 1)] / SETTLE;
function stats(cards, cid, day){
  const by = { learning: 0, learned: 0, paused: 0, none: 0 }, tiers = INTERVALS.map(() => 0), fc = Array(14).fill(0), months = {}, marks = [];
  for (const s of cards) {
    const st = statusOf(s, cid), p = progressOf(s.id, cid); by[st]++;
    if (!p) continue;
    if (st === "learned") {
      tiers[Math.min(p.reviews || 0, INTERVALS.length - 1)]++;
      if (p.next_review) fc[Math.min(13, Math.max(0, days(day, p.next_review)))]++;
      if (p.learned_on) {
        const since = days(p.learned_on, day), last = days(p.last_on || p.learned_on, day), v = Math.exp(-Math.max(0, last) / stability(p.reviews || 0));
        marks.push({ day: since, v, color: v < 0.85 ? "var(--rose)" : "var(--sage)", label: `${s.ref} · ${Math.round(v * 100)}%` });
      }
    }
    if (p.learned_on) { const m = p.learned_on.slice(0, 7); months[m] = (months[m] || 0) + 1; }
  }
  return { by, tiers, fc, months, marks };
}
// 理想复习锯齿：学会后每次按间隔复习，复习点 ≈ 85%，复习后回到 100%
function ladder(){
  const pts = [], rev = [0]; let at = 0;
  for (const iv of INTERVALS) { at += iv; rev.push(at); }
  for (let i = 0; i < rev.length - 1; i++) {
    const s = stability(i), a = rev[i], b = rev[i + 1];
    for (let k = 0; k <= 12; k++) { const d = a + (b - a) * k / 12; pts.push({ day: d, v: Math.exp(-(d - a) / s) }); }
  }
  return { curve: pts, ticks: rev };
}

/* ---- 总览 ---- */
function overviewHTML(all, cid, day, f){
  const cards = f.kind === "all" ? all : all.filter(s => kindOf(s) === f.kind);
  if (!cards.length) return `<div class="empty">${t("还没有经文卡。导入起步卡，或者添加你们自己选的经文。")}</div>`;
  const st = stats(cards, cid, day);
  const rows = (f.kind === "all" ? KINDS : KINDS.filter(([k]) => k === f.kind)).map(([k, name]) => {
    const own = cards.filter(s => kindOf(s) === k); if (!own.length) return null;
    const c = stats(own, cid, day).by;
    return { label: t(name), segs: Object.keys(ST).map(sk => ({ name: t(ST[sk].name), value: c[sk], color: ST[sk].color, drill: `${k}|${ST_KEY[sk]}` })) };
  }).filter(Boolean);
  const monthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return dayKey(d.getTime()).slice(0, 7); });
  let cum = Object.entries(st.months).filter(([m]) => m < monthKeys[0]).reduce((a, [, n]) => a + n, 0);
  const growth = monthKeys.map(m => { cum += st.months[m] || 0; return { label: t("{m}月", { m: +m.slice(5) }), value: cum, color: "var(--sage)", drill: `${f.kind}|review` }; });
  const forecast = st.fc.map((n, i) => ({ label: i === 0 ? t("今") : String(new Date(Date.now() + i * D).getDate()), value: n, color: i === 0 ? "var(--rose)" : "var(--sky)", drill: i === 0 ? `${f.kind}|due` : "" }));
  const tierBars = INTERVALS.map((iv, i) => ({ label: t("{n} 天", { n: iv }), value: st.tiers[i], color: "var(--sage)", drill: "" }));
  const lad = ladder(), overdue = st.marks.filter(m => m.v < 0.85).length;
  return `<div class="lib-grid">
    <section class="panel"><h3>${t("各类型进度")}</h3>${stack(rows, { title: t("各类型进度") })}
      <p class="legend-line">${Object.keys(ST).map(k => `<span><i style="background:${ST[k].color}"></i>${t(ST[k].name)}</span>`).join("")}</p></section>
    <section class="panel"><h3>${t("状态占比")}</h3>${donut(Object.keys(ST).map(sk => ({ name: t(ST[sk].name), value: st.by[sk], color: ST[sk].color, drill: `${f.kind}|${ST_KEY[sk]}` })), { center: cards.length, sub: t("张卡"), title: t("状态占比") })}</section>
    <section class="panel"><h3>${t("成果：累计会背")}</h3>${bars(growth, { title: t("最近 6 个月累计会背的卡") })}<p class="small muted">${t("按“会背了”的日期累计，只算现在仍在复习或会背的卡。")}</p></section>
    <section class="panel"><h3>${t("未来两周要复习")}</h3>${bars(forecast, { title: t("未来 14 天到期的复习") })}<p class="small muted">${t("红色是今天（含已逾期）；横轴是几号。复习排得太满就把“每批节数”调小。")}</p></section>
    <section class="panel"><h3>${t("复习阶梯")}</h3>${bars(tierBars, { title: t("按复习档位分布") })}<p class="small muted">${t("柱子 = 下次复习要隔多少天；越靠右越稳。")}</p></section>
    <section class="panel"><h3>${t("记忆曲线（估算）")}</h3>${curve(lad.curve, st.marks, lad.ticks, { title: t("记忆曲线") })}
      <p class="small muted">${t("蓝线：按 3、7、30、90、180 天复习的理想曲线（横轴是学会后第几天，开方刻度）；点：每张会背的卡现在大概记得多少，红点 = 已低于 85%、该复习了。")}${st.marks.length ? ` ${t("现在有 {n} 张在红线下。", { n: overdue })}` : ""}${t("这是按复习日期估算的，不是实测。")}</p></section>
  </div>`;
}

/* ---- 列表：按类型分层，每层一个折叠块 ---- */
function cardHTML(s, cid, day, name, pool){
  const p = progressOf(s.id, cid), st = statusOf(s, cid), mark = p && p.last_on === day ? (p.last_result === "ok" ? t("今天 ✓") : t("今天 ↻")) + " · " : "";
  const late = p && st === "learned" && p.next_review && p.next_review < day ? ` · <span class="lib-late">${t("已逾期 {n} 天", { n: days(p.next_review, day) })}</span>` : "";
  const state = st === "none" ? t("没开始") : st === "paused" ? t("放一放")
    : st === "learning" ? `${mark}${t("新学")}${pool && pool.ids.includes(s.id) ? ` · ${t("本批")}` : ""}`
      : `${mark}${t("复习中")} · ${t("已复习 {n} 次", { n: p.reviews || 0 })} · ${t("下次复习 {d}", { d: p.next_review || "—" })}`;
  const acts = !p ? `<button class="btn" data-act="scr-start" data-sid="${esc(s.id)}">${t("{name}开始背", { name })}</button>`
    : st === "paused" ? `<button class="btn primary" data-act="scr-resume" data-sid="${esc(s.id)}">${t("继续背")}</button><button class="chip" data-act="scr-reset" data-sid="${esc(s.id)}">${t("重新开始")}</button>`
      : `<button class="chip" data-act="scr-pause" data-sid="${esc(s.id)}">${t("先放一放")}</button><button class="chip" data-act="scr-reset" data-sid="${esc(s.id)}">${t("重新开始")}</button>`;
  return `<div class="card lib-card"><div class="row" style="align-items:flex-start"><div class="v"><b>${esc(s.ref)}</b> <span class="small muted lib-state"><i class="lib-dot" style="background:${ST[st].color}"></i>${state}${late}</span><div>${esc(s.text_zh)}<span class="small muted">${esc(vz(s))}</span></div><div class="small muted">${esc(s.text_en)}${esc(ve(s))}</div>${s.source ? `<div class="small muted">${esc(s.source)}</div>` : ""}</div></div>
    <div class="btns" style="margin-top:8px">${acts}
      <button class="chip" data-act="scr-week" data-sid="${esc(s.id)}" aria-pressed="${S.hs.settings.weekVerse === s.id}">${S.hs.settings.weekVerse === s.id ? t("本周经文 ✓") : t("设为本周经文")}</button>
      <button class="chip" data-act="scr-edit" data-sid="${esc(s.id)}">${t("编辑")}</button></div></div>`;
}
function listHTML(){
  const cid = S.childId, day = dayKey(Date.now()), f = S.scrFilter, name = esc(childName()), pool = poolOf(cid);
  const list = sorted(S.hs.scriptures.filter(s => matches(s, cid, day, f)), cid, f.sort);
  if (!list.length) return { n: 0, html: `<div class="empty">${f.st === "active" && f.kind === "all" && !f.q ? t("{name}现在没有在背的经文。到“没开始”里挑一张开始背，或等 8 点自动拉一批。", { name }) : t("这个筛选下没有卡。")}</div>` };
  const html = KINDS.map(([k, kn]) => {
    const own = list.filter(s => kindOf(s) === k); if (!own.length) return "";
    const c = Object.fromEntries(Object.keys(ST).map(x => [x, own.filter(s => statusOf(s, cid) === x).length]));
    return `<details class="lib-group" open><summary><b>${t(kn)}</b> <span class="small muted">${t("{n} 张", { n: own.length })} · ${Object.keys(ST).filter(x => c[x]).map(x => `${t(ST[x].name)} ${c[x]}`).join(" · ")}</span></summary>${own.map(s => cardHTML(s, cid, day, name, pool)).join("")}</details>`;
  }).join("");
  return { n: list.length, html };
}
/** 只刷新列表块（搜索框打字、排序、状态下拉用，不丢输入焦点） */
function renderLibList(){
  const host = $("#libList"); if (!host) return;
  const r = listHTML(); host.innerHTML = r.html;
  const n = $("#libCount"); if (n) n.textContent = t("共 {n} 张", { n: r.n });
}

const opt = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`;
/* 抬头只留三样：一行概况、视图切换 + “添加 / 设置”两个按钮、（点开才出现的）面板。
   添加：五种来源收成一个列表；设置：本批和译本放一起。面板同一时间只开一个，状态记在 S.scrFilter.menu。 */
function summaryLine(all, cid, day){
  const c = { learning: 0, learned: 0, paused: 0, none: 0 };
  all.forEach(s => { c[statusOf(s, cid)]++; });
  const due = all.filter(s => { const p = progressOf(s.id, cid); return !!p && p.status === "learned" && !!p.next_review && p.next_review <= day && p.last_on !== day; }).length;   // 到期还没做的复习
  return `<b>${esc(childName())}</b> · ${t("共 {n} 张", { n: all.length })} · ${t("新学")} ${c.learning} · ${t("复习中")} ${c.learned}${due ? ` · <span class="lib-late">${t("今天复习 {n}", { n: due })}</span>` : ""}${c.paused ? ` · ${t("放一放")} ${c.paused}` : ""}`;
}
function menuHTML(menu, cfg, pool, fv){
  if (menu === "add") {
    const row = (act, icon, title, desc) => mrow(`data-act="${act}"`, title, desc, icon);
    return `<div class="panel mlist lib-menu" role="region" aria-label="${t("添加经文卡")}">
      ${row("scr-add", "✎", t("手写一张"), t("自己输入出处和经文"))}
      ${row("scr-gen", "⌕", t("按出处生成"), t("贴几行出处，中英文经文自动抓取"))}
      ${row("scr-set", "▤", t("成套导入"), t("按主题的整套经文，只给出处，自动抓取"))}
      ${row("cc-set", "？", t("成套导入要理问答"), t("儿童要理问答 145 问（英文），一键自动抓取"))}
      ${row("ncc-import", "？", t("新城要理问答"), t("粘贴官方全文，生成 52 问"))}
      ${row("seed-scriptures", "★", t("起步经文卡"), t("补充导入和合本 / ESV 的起步卡"))}</div>`;
  }
  if (menu === "cfg") {
    return `<div class="panel lib-menu" role="region" aria-label="${t("设置")}">
      <h3>${t("本批")}</h3>
      <p class="small muted">${pool ? t("现在 {a}/{b} 节已会背。", { a: pool.done, b: pool.total }) : t("还没有本批，8 点会自动拉一批。")}${t("会背完自动拉下一批，下一批起按这里的设置。")}</p>
      <div class="lib-pool-cfg"><label>${t("每批")} <select id="poolBatch" aria-label="${t("每批节数")}">${Array.from({ length: 12 }, (_, i) => opt(String(i + 1), t("{n} 节", { n: i + 1 }), String(cfg.batch))).join("")}</select></label>
        <label>${t("问答占")} <select id="poolCat" aria-label="${t("问答占比")}">${[...new Set([0, 10, 20, 30, 40, 50, 70, 100, cfg.catShare])].sort((a, b) => a - b).map(v => opt(String(v), `${v}%`, String(cfg.catShare))).join("")}</select></label></div>
      <h3 style="margin-top:14px">${t("自动抓取经文")}</h3>
      <p class="small">${t("中文 {zh} · 英文 {en}", { zh: esc(fv.zh) + (fv.zhFallback ? t("（已回退）") : ""), en: esc(fv.en) + (fv.enFallback ? t("（{v} 需代理，已回退）", { v: esc(fv.wanted.en) }) : "") })}${S.hs.versions ? "" : `<br><span class="muted">${t("译本字段需要迁移 005")}</span>`}</p>
      <div class="btns" style="margin-top:0"><button class="btn" data-act="fetch-settings">${t("改译本与代理")}</button></div></div>`;
  }
  return "";
}
function openScriptures(){
  const cid = S.childId, all = S.hs.scriptures, fv = fetchVersions(), day = dayKey(Date.now()), f = S.scrFilter, cfg = poolCfg(), pool = poolOf(cid);
  const view = all.length ? f.view : "list", menu = f.menu || "";
  const tb = (key, icon, label) => `<button class="chip lib-tool" data-lm="${key}" aria-expanded="${menu === key}" aria-pressed="${menu === key}"><span aria-hidden="true">${icon}</span> ${label}</button>`;
  $("#sheetIn").innerHTML = `${head(t("经文卡库"))}
  ${all.length ? `<p class="lib-summary small">${summaryLine(all, cid, day)}</p>` : ""}
  <div class="lib-toolbar">${all.length ? `<div class="seg" role="group" aria-label="${t("视图")}"><button data-lv="chart" aria-pressed="${view === "chart"}">${t("总览")}</button><button data-lv="list" aria-pressed="${view === "list"}">${t("列表")}</button></div>` : ""}
    <span class="lib-tools">${tb("add", "＋", t("添加"))}${tb("cfg", "⚙", t("设置"))}</span></div>
  ${menuHTML(menu, cfg, pool, fv)}
  ${all.length ? "" : `<div class="empty">${t("还没有经文卡。点“添加”导入起步卡，或者加你们自己选的经文。")}</div>`}
  ${all.length ? `<div class="lib-filters"><label>${t("类型")} <select id="libKind">${opt("all", t("全部"), f.kind)}${KINDS.map(([k, n]) => opt(k, t(n), f.kind)).join("")}</select></label>
      ${view === "list" ? `<label>${t("状态")} <select id="libSt">${STATUS_OPTS.map(([v, l]) => opt(v, t(l), f.st)).join("")}</select></label>
      <label>${t("排序")} <select id="libSort">${SORT_OPTS.map(([v, l]) => opt(v, t(l), f.sort)).join("")}</select></label>
      <input type="search" id="libQ" value="${esc(f.q)}" placeholder="${t("搜索出处或经文")}" aria-label="${t("搜索")}">` : ""}</div>` : ""}
  ${all.length ? (view === "chart" ? overviewHTML(all, cid, day, f) : `<p class="small muted" id="libCount" style="margin:8px 0 0"></p><div id="libList"></div>`) : ""}`;
  showSheet();
  if (all.length && view === "list") renderLibList();
}

export { openScriptures, renderLibList };

/* ---- 补记背诵：在日历里选一天，把那天背过的卡记上（间隔从那天起算）----
   只给“那天还能做”的卡：在学的（记会背了），以及到那天已经到期的复习（记背出来了 / 再练练）；
   那天之后又做过的卡不列（不能把后来的进度改回去）。已记的可以撤销。 */
function openBackfill(date){
  const cid = S.childId, name = esc(childName());
  const mine = S.hs.progress.filter(p => p.child_id === cid && p.status !== "paused").map(p => ({ p, s: S.hs.scriptures.find(x => x.id === p.scripture_id) })).filter(x => x.s);
  const done = mine.filter(x => x.p.last_on === date), later = x => x.p.last_on && x.p.last_on >= date;
  const learn = mine.filter(x => x.p.status === "learning" && !later(x)), due = mine.filter(x => x.p.status === "learned" && x.p.next_review && x.p.next_review <= date && !later(x)).sort((a, b) => (a.p.next_review < b.p.next_review ? -1 : 1));
  const row = (x, acts) => `<div class="card lib-card"><div class="row" style="align-items:flex-start"><div class="v"><b>${esc(x.s.ref)}</b> <span class="small muted">${x.p.status === "learning" ? t("新学") : t("已复习 {n} 次 · 原定 {d}", { n: x.p.reviews || 0, d: x.p.next_review || "—" })}</span><div class="small">${esc(x.s.text_zh)}</div></div></div><div class="btns" style="margin-top:6px">${acts}</div></div>`;
  const b = (op, sid, label, cls = "") => `<button class="btn ${cls}" data-act="bf-do" data-op="${op}" data-sid="${esc(sid)}" data-date="${esc(date)}">${label}</button>`;
  $("#sheetIn").innerHTML = `${head(t("补记背诵") + " · " + esc(date))}
  <p class="small muted">${t("给{name}补上 {d} 那天背的：复习间隔从那天算起，之后的复习日期会自动排好。", { name, d: esc(date) })}</p>
  ${done.length ? `<h2>${t("这天已记")}</h2>${done.map(x => row(x, `<span class="small">${x.p.last_result === "ok" ? "✓" : "↻"}</span><button class="chip" data-act="bf-undo" data-sid="${esc(x.s.id)}" data-date="${esc(date)}">${t("撤销")}</button>`)).join("")}` : ""}
  <h2>${t("新学")}</h2>${learn.length ? learn.map(x => row(x, b("learned", x.s.id, t("会背了"), "primary"))).join("") : `<p class="small muted">${t("没有在学的经文。")}</p>`}
  <h2>${t("复习")}</h2>${due.length ? due.map(x => row(x, b("remember", x.s.id, t("背出来了"), "primary") + b("again", x.s.id, t("再练练")))).join("") : `<p class="small muted">${t("这天没有到期的复习。")}</p>`}`;
  showSheet();
}

export { openBackfill };
