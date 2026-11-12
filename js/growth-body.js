import { aiReady, askText } from "./ai.js";
import { SB } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { t } from "./core/i18n.js";
import { selectAll } from "./core/paged.js";
import { S, ageMonths, childName, ownerOf } from "./core/state.js";
import { $, D, dayKey, esc, toast } from "./core/util.js";
import { INTAKE_SYSTEM, VAX_NAMES, parseIntake } from "./intake-lib.js";
import { attachHTML, attachHas, attachPayload, attachReset } from "./attach.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { bars } from "./charts.js";
import { render } from "./views.js";

/* ============ 成长 · 🩺 身体与健康（2026-11-11） ============
   数据不另建表，和姊妹应用共用一份：
     · 小月亮的记录（entries）：宝宝健康（体重、身高、头围、体温；来源 = 自己记录 / 儿科体检 / 看病急诊，带医院和医生总结）、疫苗接种、宝宝用药、里程碑；
     · 牧羊人的健康表（hl_*，subject = "c:" + 孩子 id）：化验（hl_labs）、牧羊人里给孩子记的就诊（hl_visits）、档案里的病史 / 过敏 / 长期用药（hl_profiles.data）。
   页面：身高体重、体检与就诊（上次年度体检多久了）、疫苗、化验、病史 / 过敏 / 用药几张卡；
   「AI 一次录入体检 / 就诊」和小月亮同一套（js/intake-lib.js 两边同一份）：拍小结或打一段话 → 核对 → 一次存成几条小月亮记录；
   「量一次身高体重」是同一张表的手填模式（来源 = 自己记录）。病史 / 过敏 / 用药存在牧羊人的档案里，两边看到的是同一份。
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
  finally { H.loading = false; if (S.tab === "growth") render(); }
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
  return "";
}
const labFlag = x => (x.ref_high != null && +x.value > +x.ref_high ? "high" : x.ref_low != null && +x.value < +x.ref_low ? "low" : null);
function labLatest(){ const by = new Map(); for (const x of H.labs.filter(x => x.subject === subj()).sort((a, b) => String(a.day).localeCompare(String(b.day)))) by.set(x.code || x.name, x); return [...by.values()]; }
/** 动作按钮一排（和主题页的「＋ 记一笔」同一个位置、同一个样式） */
const top = btns => `<div class="gr-top"><div class="gr-adds">${btns}</div></div>`;
const aiBtn = (primary = true) => `<button type="button" class="btn ${primary ? "primary" : ""} sm" data-ix="open" data-src="儿科体检">✦ ${t("AI 录入体检")}</button>`;
const rec = (icon, title, when, meta, note) => `<div class="task"><span class="bar" style="background:var(--slate)"></span><div class="main" style="cursor:default"><span class="title">${icon} <b>${esc(title)}</b> <span class="small muted num">${esc(when)}</span></span>${meta ? `<span class="meta">${esc(meta)}</span>` : ""}${note ? `<span class="meta gr-note">${esc(note)}</span>` : ""}</div><span class="acts"></span></div>`;
const recs = (title, rows, foot) => `<section class="gr-sec"><div class="gr-sh"><h2>${t(title)} <span class="small muted gr-n">${t("{n} 条", { n: rows.length })}</span></h2></div>
  <div class="panel">${rows.length ? `<div class="tasks">${rows.join("")}</div>` : `<div class="empty">${t("还没有记录。")}</div>`}</div>${foot ? `<p class="small muted gr-foot">${foot}</p>` : ""}</section>`;
const EDIT_IN_BL = () => t("这些记录和小月亮是同一份，要改或删请在小月亮里操作。");
function statTile(label, value, sub, color, attrs = "", on = false){
  const tag = attrs ? "button" : "div";
  return `<${tag} ${attrs ? 'type="button"' : ""} class="gr-tile ${attrs ? "" : "static"}" ${attrs} ${attrs ? `aria-pressed="${on}"` : ""} style="--c:${color}"><span class="gr-tl">${esc(label)}</span><span class="gr-tv num">${value}</span><span class="gr-td"><span class="small muted">${esc(sub)}</span></span></${tag}>`;
}

function bodyTopicHTML(id){
  if (!fid()) return "";
  if (!ensure()) return `<p class="small muted" role="status">${H.err ? t("读取失败：{m}", { m: esc(H.err.slice(0, 80)) }) : t("正在读取…")}</p>`;
  return ({ "gr-size": sizePage, "gr-visits": visitsPage, "gr-vax": vaxPage, "gr-labs": labsPage, "gr-history": historyPage }[id] || (() => ""))();
}
let sizeMetric = "weight";
function sizePage(){
  const rows = mine("baby").filter(e => e.weight || e.length), w = rows.filter(e => e.weight), l = rows.filter(e => e.length);
  const delta = (list, k) => (list.length > 1 ? `${t("上次")} ${show(k, list[1][k])}` : list.length ? day(list[0].ts) : t("还没有"));
  const tiles = `<div class="gr-tiles">${statTile(t("体重"), w.length ? esc(show("weight", w[0].weight)) : "–", delta(w, "weight"), "var(--sky)", 'data-act="gr-size-m" data-v="weight"', sizeMetric === "weight")}
    ${statTile(t("身高"), l.length ? esc(show("length", l[0].length)) : "–", delta(l, "length"), "var(--sage)", 'data-act="gr-size-m" data-v="length"', sizeMetric === "length")}</div>`;
  const series = (sizeMetric === "weight" ? w : l).slice(0, 12).reverse();
  const chart = series.length > 1 ? `<div class="panel gr-chart"><div class="gr-ch-h"><b>${t(sizeMetric === "weight" ? "体重" : "身高")}</b> <span class="small muted">${unit(sizeMetric)} · ${t("最近 {n} 次", { n: series.length })}</span></div>
    ${bars(series.map(e => ({ label: dayKey(e.ts).slice(5).replace("-", "/"), value: Math.round(toDisp(sizeMetric, e[sizeMetric]) * 10) / 10, color: sizeMetric === "weight" ? "var(--sky)" : "var(--sage)" })), { title: t("走势") })}</div>` : "";
  return `${top(`<button type="button" class="btn primary sm" data-ix="open" data-src="自己记录" data-manual="1">＋ ${t("量身高体重")}</button>${aiBtn(false)}`)}${tiles}${chart}
    ${recs("记录", rows.map(e => rec("📏", [e.weight && show("weight", e.weight), e.length && show("length", e.length)].filter(Boolean).join(" · "), day(e.ts), t(e.src && e.src !== "自己记录" ? e.src : "在家量"), e.note)), `${EDIT_IN_BL()} ${t("生长百分位以儿科医生的生长曲线为准。")}`)}`;
}
/** 就诊：小月亮里来源是体检 / 看病的「宝宝健康」+ 牧羊人里给孩子记的就诊 */
function visitsAll(){
  const a = mine("baby").filter(e => e.src && e.src !== "自己记录").map(e => ({ ts: e.ts, annual: e.src === "儿科体检", kind: t(e.src), where: e.clinic || "", text: e.note || "", m: [e.weight && show("weight", e.weight), e.length && show("length", e.length), e.temp && show("temp", e.temp)].filter(Boolean).join(" · ") }));
  const b = H.visits.filter(v => v.subject === subj()).map(v => ({ ts: new Date(v.day + "T12:00:00").getTime(), annual: v.kind === "annual", kind: t(v.kind === "annual" ? "年度体检" : "就诊"), where: v.provider || "", text: [v.diagnosis, v.advice].filter(Boolean).join(" · "), m: "" }));
  return [...a, ...b].sort((x, y) => y.ts - x.ts);
}
function visitsPage(){
  const list = visitsAll(), a = list.find(v => v.annual), m = ageMonths(), gap = a ? monthsAgo(a.ts) : null, due = m != null && m >= 36 && (gap == null || gap >= 12);
  const tiles = `<div class="gr-tiles">${statTile(t("上次体检"), a ? esc(day(a.ts)) : "–", a ? t("{n} 个月前", { n: gap }) : t("还没有体检记录"), due ? "var(--honey)" : "var(--sage)")}
    ${statTile(t("就诊次数"), String(list.length), t("全部记录"), "var(--slate)")}</div>`;
  return `${top(aiBtn())}${due ? `<p class="gr-due"><span class="pill warn">${t("该做年度体检了")}</span> <span class="small muted">${t("3 岁以后一般每年一次儿科体检。")}</span></p>` : ""}${tiles}
    ${recs("记录", list.map(v => rec(v.annual ? "🩺" : "🤒", v.kind, day(v.ts), [v.where, v.m].filter(Boolean).join(" · "), v.text)), EDIT_IN_BL())}`;
}
function vaxPage(){
  const list = mine("vax");
  return `${top(aiBtn())}<div class="gr-tiles">${statTile(t("接种"), String(list.length), list.length ? t("最近 {d}", { d: day(list[0].ts) }) : t("还没有接种记录"), "#3F8F8B")}</div>
    ${recs("记录", list.map(e => rec("💉", t(e.name || "疫苗"), day(e.ts), [e.dose && t(e.dose), e.site && t(e.site), e.reaction && e.reaction !== "无" && t("反应：{r}", { r: t(e.reaction) })].filter(Boolean).join(" · "), e.note)), `${EDIT_IN_BL()} ${t("正式凭证以接种本、医院或学校要求的官方记录为准。")}`)}`;
}
function labsPage(){
  const btn = `<a class="btn primary sm" href="https://dev-hyang.github.io/shepherd/" target="_blank" rel="noopener">🧪 ${t("在牧羊人里录入化验")} ↗</a>`;
  if (!H.hlOk) return `${top(btn)}<div class="panel gr-empty"><p class="small muted" style="margin:0">${t("化验在牧羊人里记；数据库还没有牧羊人的健康表（迁移 026）。")}</p></div>`;
  const latest = labLatest(), bad = latest.filter(labFlag).length, all = H.labs.filter(x => x.subject === subj());
  const hist = x => all.filter(y => (y.code || y.name) === (x.code || x.name)).sort((a, b) => String(b.day).localeCompare(String(a.day))).slice(1, 4).map(y => `${+(+y.value).toFixed(2)}（${String(y.day).slice(5).replace("-", "/")}）`).join("、");
  const range = x => (x.ref_low != null || x.ref_high != null ? t("参考 {r}", { r: [x.ref_low, x.ref_high].map(v => (v == null ? "" : v)).join("–") }) : "");
  return `${top(btn)}<div class="gr-tiles">${statTile(t("项目"), String(latest.length), t("每项最新一次"), "var(--slate)")}${statTile(t("超出范围"), String(bad), bad ? t("下次就诊时问医生") : t("都在范围内"), bad ? "var(--rose)" : "var(--sage)")}</div>
    ${recs("每项最新一次", latest.map(x => { const f = labFlag(x), h = hist(x); return rec(f ? "⚠️" : "🧪", `${x.name || x.code} ${+(+x.value).toFixed(2)} ${x.unit || ""}${f ? ` · ${t(f === "high" ? "偏高" : "偏低")}` : ""}`, String(x.day).replace(/-/g, "/"), [range(x), h && t("之前：{s}", { s: h })].filter(Boolean).join(" · "), x.notes); }),
      t("化验在牧羊人里录入和修改（可以拍化验单），这里自动显示。范围以化验单为准。"))}`;
}
function historyPage(){
  const p = (profileRow() || {}).data || {}, meds = mine("bmed").filter(e => e.ts > Date.now() - 180 * D);
  const row = (label, v) => `<div class="gr-kv"><span class="muted">${t(label)}</span><span>${v ? esc(v) : `<span class="muted">—</span>`}</span></div>`;
  return `${top(`<button type="button" class="btn primary sm" data-act="gr-profile">✎ ${t("编辑病史 / 过敏 / 用药")}</button>`)}
    <div class="panel gr-kvs">${row("过敏", p.allergies)}${row("病史", p.conditions)}${row("长期用药", p.meds)}${row("备注", p.notes)}</div>
    <p class="small muted gr-foot">${t("有食物 / 药物过敏、哮喘、湿疹这类情况，记在这里，给医生、学校、AI 分析都用得上。和牧羊人的档案是同一份。")}</p>
    ${recs("最近半年的维生素 / 用药", meds.map(e => rec("💧", [t(e.cat || ""), e.name].filter(Boolean).join(" · "), day(e.ts), e.dose, e.note)), EDIT_IN_BL())}`;
}

/* ---- 病史 / 过敏 / 用药：存在牧羊人的档案（hl_profiles.data），两边同一份 ---- */
function openProfile(){
  if (!H.hlOk) { toast(t("数据库还没有牧羊人的健康表（迁移 026）")); return; }
  const cur = profileRow(), d = (cur || {}).data || {};
  openForm(`📋 ${esc(childName())} · ${t("病史 / 过敏 / 用药")}`, [
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

function openIntake(src, manual){
  X = { src: src || "儿科体检", ts: Date.now(), child: S.childId, clinic: "", note: "", weight: null, length: null, head: null, temp: null,
    vaccines: [], meds: [], milestones: [], read: !!manual, busy: false };
  attachReset(ATT);
  draw(); showSheet();
}
const sel = (k, opts, v, label) => `<select data-ixk="${k}" aria-label="${esc(t(label))}"><option value="">${esc(t(label))}</option>${opts.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(t(o))}</option>`).join("")}</select>`;
function draw(){
  const vit = VITALS.map(([k, l]) => { const dv = X[k] == null ? "" : String(Math.round(toDisp(k, X[k]) * 100) / 100);
    return `<div class="field"><label for="ix_${k}">${t(l)}（${unit(k)}）</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-dim="1" data-orig="${dv}" value="${dv}"></div>`; }).join("");
  const row = (list, i, inner) => `<div class="ix-row ${list[i].on ? "" : "off"}"><label class="check ix-on"><input type="checkbox" data-ixon="${i}" ${list[i].on ? "checked" : ""} aria-label="${esc(t("保存这一条"))}"></label><div class="ix-cells">${inner}</div></div>`;
  const vax = X.vaccines.map((v, i) => row(X.vaccines, i, `<input type="text" list="ixvax" data-ixk="name" value="${esc(v.name)}" aria-label="${esc(t("疫苗名称"))}" placeholder="${esc(t("疫苗名称"))}">${sel("dose", VAX_DOSE, v.dose, "剂次")}${sel("site", VAX_SITE, v.site, "接种部位")}`)).join("");
  const meds = X.meds.map((m, i) => row(X.meds, i, `${sel("cat", MED_CAT, m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("名称"))}" placeholder="${esc(t("名称"))}"><input type="text" data-ixk="dose" value="${esc(m.dose)}" aria-label="${esc(t("剂量"))}" placeholder="${esc(t("剂量"))}">`)).join("");
  const ms = X.milestones.map((m, i) => row(X.milestones, i, `${sel("cat", MS_CAT, m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("做到了什么"))}" placeholder="${esc(t("做到了什么"))}">`)).join("");
  const n = count(), home = X.src === "自己记录";
  const read = home && X.read && !attachHas(ATT) ? "" : `<div class="panel ix-read"><p class="small muted" style="margin:0 0 8px">${t("拍就诊小结、体检单或疫苗本（可多张），或者打 / 粘贴一段话：量了多少、打了什么针、医生说了什么。AI 读出来后在下面核对，一次保存成几条记录。")}</p>
    ${attachHTML(ATT, { t, esc, textLabel: t("或者打字 / 粘贴"), ph: t("例：体重 20 kg，身高 112 cm，打了流感疫苗（左上臂），医生说发育正常，注意少吃甜食、每天户外 1 小时，明年再来") })}
    <div class="btns" style="margin-top:0"><button type="button" class="btn primary" data-ix="read" ${X.busy ? "disabled" : ""}>${X.busy ? t("正在读取…") : `✦ ${t("让 AI 读出来")}`}</button>${X.read ? "" : `<button type="button" class="btn" data-ix="manual">${t("不用 AI，直接填")}</button>`}</div>
    <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("照片只在浏览器里压缩后发给你自己设置的 AI，不保存；不发孩子的名字。读出来的内容请核对。") : t("还没填 API key：在 我的 → 咩咩咩 里设置")}</p></div>`;
  const form = !X.read ? "" : `
    <div class="field"><div class="lab" id="ix_src">${t("记录来源")}</div><div class="seg" role="group" aria-labelledby="ix_src">${["儿科体检", "看病/急诊", "自己记录"].map(o => `<button type="button" data-ix="src" data-v="${o}" aria-pressed="${X.src === o}">${t(o === "自己记录" ? "在家量" : o)}</button>`).join("")}</div></div>
    <div class="ix-two"><div class="field"><label for="ix_ts">${t("时间")}</label><input id="ix_ts" type="datetime-local" data-ixf="ts" max="${toLocal(Date.now())}" value="${toLocal(X.ts)}"></div>
      ${home ? "" : `<div class="field"><label for="ix_clinic">${t("医院 / 医生")}</label><input id="ix_clinic" type="text" data-ixf="clinic" value="${esc(X.clinic)}"></div>`}</div>
    <h3 class="ix-h">🌡 ${t("体征")}</h3><div class="ix-vitals">${vit}</div>
    <div class="field"><label for="ix_note">${t(home ? "备注" : "医生的总结 / 建议")}</label><textarea id="ix_note" data-ixf="note" placeholder="${esc(t(home ? "穿不穿鞋、什么时候量的…" : "医生说了什么、要注意什么、下次什么时候来…"))}">${esc(X.note)}</textarea></div>
    ${home ? "" : `<h3 class="ix-h">💉 ${t("疫苗")} <button type="button" class="chip" data-ix="add-vax">＋ ${t("加一针")}</button></h3><div class="ix-list" data-ixlist="vaccines">${vax || `<p class="small muted">${t("这次没有打针就留空。")}</p>`}</div>
    <h3 class="ix-h">💧 ${t("维生素 / 用药")} <button type="button" class="chip" data-ix="add-med">＋ ${t("加一种")}</button></h3><div class="ix-list" data-ixlist="meds">${meds || `<p class="small muted">${t("医生开了维生素 D、铁剂或药，就加在这里。")}</p>`}</div>
    <h3 class="ix-h">⭐ ${t("里程碑")} <button type="button" class="chip" data-ix="add-ms">＋ ${t("加一个")}</button></h3><div class="ix-list" data-ixlist="milestones">${ms || `<p class="small muted">${t("医生提到的发育情况，可以顺手记下。")}</p>`}</div>`}
    <div class="btns"><button type="button" class="btn primary" data-ix="save" ${n ? "" : "disabled"}>${n ? t("保存 {n} 条", { n }) : t("还没有要保存的")}</button><button type="button" class="btn" data-ix="close">${t("取消")}</button></div>`;
  $("#sheetIn").innerHTML = `${head(`${home ? "📏" : "✦"} ${esc(t(home ? "量一次身高体重" : "AI 一次录入体检 / 就诊"))}`)}<p class="small muted ix-who">${t("记录给")} <b>${esc(childName(X.child))}</b></p>${read}${form}
    <datalist id="ixvax">${VAX_NAMES.map(v => `<option value="${esc(t(v))}">`).join("")}</datalist>`;
}
function readIx(){
  const box = $("#sheetIn"); if (!box || !X) return;
  box.querySelectorAll("[data-ixf]").forEach(el => {
    const k = el.dataset.ixf;
    if (k === "ts") { const v = fromLocal(el.value); if (v) X.ts = v; }
    else if (el.dataset.dim) { if (el.value !== el.dataset.orig) X[k] = fromDisp(k, el.value); }
    else X[k] = el.value;
  });
  box.querySelectorAll("[data-ixlist]").forEach(list => {
    const arr = X[list.dataset.ixlist];
    list.querySelectorAll(".ix-row").forEach((r, i) => { const o = arr[i]; if (!o) return; o.on = r.querySelector("[data-ixon]").checked; r.querySelectorAll("[data-ixk]").forEach(el => { o[el.dataset.ixk] = el.value.trim(); }); });
  });
}
const keepVitals = () => VITALS.some(([k]) => X[k] != null) || X.note.trim() || X.clinic.trim();
const listed = () => (X.src === "自己记录" ? [] : [...X.vaccines, ...X.meds, ...X.milestones].filter(x => x.on && x.name));
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
    const r = parseIntake(await askText(INTAKE_SYSTEM, `Read this pediatric visit.${text ? "\nParent's notes:\n" + text.slice(0, 12000) : ""}`, { json: true, images, maxTokens: 3000 }));
    if (!r) throw new Error(t("没读出内容，换一张清楚点的照片或多写几句试试"));
    if (!X) return;
    readIx();
    if (r.day) { const d = new Date(r.day + "T09:00:00").getTime(); if (d <= Date.now()) X.ts = d; }
    if (r.src) X.src = r.src; else if (X.src === "自己记录" && (r.vaccines.length || r.note)) X.src = "儿科体检";
    for (const k of ["weight", "length", "head", "temp"]) if (r[k] != null) X[k] = r[k];
    if (r.clinic) X.clinic = r.clinic;
    const next = r.next ? t("下次：{s}", { s: r.next }) : "";
    if (r.note || next) X.note = [X.note.trim(), r.note, next].filter(Boolean).join("\n");
    X.vaccines.push(...r.vaccines.map(v => ({ on: true, name: v.name, dose: v.dose || "", site: v.site || "" })));
    X.meds.push(...r.meds.map(m => ({ on: true, cat: m.cat, name: m.name, dose: m.dose })));
    X.milestones.push(...r.milestones.map(m => ({ on: true, cat: m.cat, name: m.name })));
    X.read = true; toast(t("读出来了，请核对"));
  } catch (e) { toast(t("读取失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { if (X) { X.busy = false; draw(); } }
}
/** 存成小月亮的记录（entries），和小月亮里一条条记的一样，小月亮里也能看到、能改 */
async function save(){
  readIx();
  if (X.ts > Date.now() + 60000) { toast(t("时间不能晚于现在")); return; }
  const now = Date.now(), id = i => "hsix-" + now.toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5);
  const base = { ts: X.ts, child: X.child, updated: now }, clinic = (X.clinic || "").trim(), rows = [];
  if (keepVitals()) rows.push({ type: "baby", src: X.src, clinic: X.src === "自己记录" ? "" : clinic, ...Object.fromEntries(VITALS.map(([k]) => [k, X[k]]).filter(([, v]) => v != null)), note: X.note.trim() });
  if (X.src !== "自己记录") {
    for (const v of X.vaccines) if (v.on && v.name) rows.push({ type: "vax", name: v.name, dose: v.dose, site: v.site, clinic, reaction: "无" });
    for (const m of X.meds) if (m.on && m.name) rows.push({ type: "bmed", cat: m.cat || "药物", name: m.name, dose: m.dose, note: t("{src}时医生开的", { src: t(X.src) }) });
    for (const m of X.milestones) if (m.on && m.name) rows.push({ type: "milestone", cat: m.cat || "认知", name: m.name, note: t("{src}时医生看到的", { src: t(X.src) }) });
  }
  if (!rows.length) return;
  const out = rows.map((r, i) => { const data = { ...base, ...r, id: id(i) }; for (const k of Object.keys(data)) if (data[k] === "" || data[k] == null) delete data[k];
    return { family_id: fid(), id: data.id, type: data.type, ts: data.ts, updated: now, deleted: false, data }; });
  const { error } = await SB.client.from("entries").upsert(out, { onConflict: "family_id,id" });
  if (error) { toast(t("没记上：{m}", { m: error.message })); return; }
  H.rows = [...out.map(o => ({ ...o.data, id: o.id, type: o.type, ts: o.ts })), ...H.rows];
  X = null; closeSheet(); toast(t("已保存 {n} 条", { n: out.length })); render();
}

document.addEventListener("click", async ev => {
  const b = ev.target.closest && ev.target.closest("[data-ix]"); if (!b) return;
  const act = b.dataset.ix;
  if (act === "open") { if (!fid()) return; openIntake(b.dataset.src, !!b.dataset.manual); return; }
  if (!X) return;
  readIx();
  switch (act) {
    case "close": X = null; closeSheet(); return;
    case "read": await aiRead(); return;
    case "manual": X.read = true; break;
    case "src": X.src = b.dataset.v; break;
    case "add-vax": X.vaccines.push({ on: true, name: "", dose: "", site: "" }); break;
    case "add-med": X.meds.push({ on: true, cat: "维生素D", name: "", dose: "" }); break;
    case "add-ms": X.milestones.push({ on: true, cat: "大运动", name: "" }); break;
    case "save": await save(); return;
  }
  draw();
});
document.addEventListener("change", ev => {
  if (!X || !ev.target.closest || !ev.target.closest("#sheetIn") || !$("#sheetIn [data-ix=save]")) return;
  readIx(); const n = count(), btn = $("#sheetIn [data-ix=save]");
  btn.disabled = !n; btn.textContent = n ? t("保存 {n} 条", { n }) : t("还没有要保存的");
  const row = ev.target.closest(".ix-row"); if (row && ev.target.matches("[data-ixon]")) row.classList.toggle("off", !ev.target.checked);
});

/** 给 AI 分析用（第 ③ 版）：这个孩子的身体与健康摘要（不含姓名） */
function bodySummary(){
  if (!H.loaded) return null;
  const p = (profileRow() || {}).data || {};
  return {
    growth: mine("baby").filter(e => e.weight || e.length).slice(0, 8).map(e => ({ date: dayKey(e.ts), weight_kg: e.weight || null, height_cm: e.length || null })),
    visits: visitsAll().slice(0, 8).map(v => ({ date: dayKey(v.ts), kind: v.annual ? "checkup" : "visit", notes: v.text.slice(0, 500) })),
    vaccines: mine("vax").slice(0, 20).map(e => ({ date: dayKey(e.ts), name: e.name, dose: e.dose || null })),
    meds: mine("bmed").filter(e => e.ts > Date.now() - 180 * D).map(e => ({ date: dayKey(e.ts), cat: e.cat, name: e.name, dose: e.dose || "" })),
    labs: H.labs.filter(x => x.subject === subj()).map(x => ({ date: x.day, test: x.name || x.code, value: +x.value, unit: x.unit, ref_low: x.ref_low, ref_high: x.ref_high })),
    history: p.conditions || "", allergies: p.allergies || "", long_term_meds: p.meds || ""
  };
}
function bodyAct(act, btn){
  if (act === "gr-profile") { openProfile(); return true; }
  if (act === "gr-size-m") { sizeMetric = btn.dataset.v === "length" ? "length" : "weight"; render(); return true; }
  if (act === "gr-body-reload") { loadBody(true); return true; }
  return false;
}
const bodyReady = () => H.loaded;

export { bodyRowDesc, bodyTopicHTML, bodyAct, bodySummary, bodyReady, loadBody };
