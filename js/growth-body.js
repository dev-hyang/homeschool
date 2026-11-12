import { aiReady, askText } from "./ai.js";
import { SB } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { t } from "./core/i18n.js";
import { selectAll } from "./core/paged.js";
import { S, ageMonths, childName, ownerOf } from "./core/state.js";
import { $, D, dayKey, esc, toast } from "./core/util.js";
import { INTAKE_SYSTEM, VAX_NAMES, parseIntake } from "./intake-lib.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
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

/* ---- 页面 ---- */
function bodyHTML(){
  if (!fid()) return "";
  if (!H.loaded) { loadBody(); return `<p class="small muted" role="status">${H.err ? t("读取失败：{m}", { m: esc(H.err.slice(0, 80)) }) : t("正在读取…")}</p>`; }
  const acts = `<div class="btns gb-acts"><button class="btn primary" data-ix="open" data-src="儿科体检">✦ ${t("AI 一次录入体检 / 就诊")}</button>
    <button class="btn" data-ix="open" data-src="自己记录" data-manual="1">📏 ${t("量一次身高体重")}</button><button class="btn" data-act="gr-profile">✎ ${t("病史 / 过敏 / 用药")}</button></div>`;
  return `${acts}<div class="gr-cards">${[growthCard(), visitCard(), vaxCard(), labCard(), historyCard()].join("")}</div>
    <p class="small muted">${t("和小月亮、牧羊人是同一份记录：体征、就诊、疫苗、用药在小月亮里也能看到和修改；化验在牧羊人里录入（可拍化验单）。生长百分位以儿科医生的生长曲线为准。")}</p>`;
}
const card = (title, right, body) => `<div class="panel gr-card"><div class="gr-card-h"><b>${title}</b>${right || ""}</div>${body}</div>`;
function growthCard(){
  const rows = mine("baby").filter(e => e.weight || e.length);
  if (!rows.length) return card(`📏 ${t("身高体重")}`, "", `<p class="small muted" style="margin:0">${t("还没有记录。点上面的「量一次身高体重」，或者录入一次体检。")}</p>`);
  const lw = rows.find(e => e.weight), ll = rows.find(e => e.length);
  const big = (k, e) => (e ? `<span class="gb-big"><b class="num">${esc(show(k, e[k]))}</b><small class="muted">${t(k === "weight" ? "体重" : "身高")} · ${day(e.ts)}</small></span>` : "");
  const tbl = rows.slice(0, 6).map(e => `<tr><td class="num">${day(e.ts)}</td><td class="num">${e.weight ? esc(show("weight", e.weight)) : ""}</td><td class="num">${e.length ? esc(show("length", e.length)) : ""}</td></tr>`).join("");
  return card(`📏 ${t("身高体重")}`, "", `<div class="gb-bigs">${big("weight", lw)}${big("length", ll)}</div>
    <div class="scroll-x"><table class="gb-tbl"><thead><tr><th>${t("日期")}</th><th>${t("体重")}</th><th>${t("身高")}</th></tr></thead><tbody>${tbl}</tbody></table></div>`);
}
/** 就诊：小月亮里来源是体检 / 看病的「宝宝健康」+ 牧羊人里给孩子记的就诊 */
function visitsAll(){
  const a = mine("baby").filter(e => e.src && e.src !== "自己记录").map(e => ({ ts: e.ts, annual: e.src === "儿科体检", kind: t(e.src), where: e.clinic || "", text: e.note || "" }));
  const b = H.visits.filter(v => v.subject === subj()).map(v => ({ ts: new Date(v.day + "T12:00:00").getTime(), annual: v.kind === "annual", kind: t(v.kind === "annual" ? "年度体检" : "就诊"), where: v.provider || "", text: [v.diagnosis, v.advice].filter(Boolean).join(" · ") }));
  return [...a, ...b].sort((x, y) => y.ts - x.ts);
}
function visitCard(){
  const list = visitsAll(), annual = list.find(v => v.annual), m = ageMonths();
  const gap = annual ? monthsAgo(annual.ts) : null, due = m != null && m >= 36 && (gap == null || gap >= 12);
  const line = annual ? t("上次体检 {d}，{n} 个月前", { d: day(annual.ts), n: gap }) : t("还没有体检记录");
  return card(`🩺 ${t("体检与就诊")}`, due ? `<span class="pill warn">${t("该做年度体检了")}</span>` : "", `<p class="small" style="margin:0 0 6px">${esc(line)}</p>
    ${list.length ? `<ul class="gb-list">${list.slice(0, 5).map(v => `<li><b class="num">${day(v.ts)}</b> ${esc(v.kind)}${v.where ? ` <span class="small muted">· ${esc(v.where)}</span>` : ""}${v.text ? `<br><span class="small muted">${esc(v.text.slice(0, 140))}${v.text.length > 140 ? "…" : ""}</span>` : ""}</li>`).join("")}</ul>` : ""}`);
}
function vaxCard(){
  const list = mine("vax");
  return card(`💉 ${t("疫苗")}`, list.length ? `<span class="small muted">${t("共 {n} 次", { n: list.length })}</span>` : "", list.length
    ? `<ul class="gb-list">${list.slice(0, 6).map(e => `<li><b class="num">${day(e.ts)}</b> ${esc(t(e.name || "疫苗"))}${e.dose ? ` <span class="small muted">· ${esc(t(e.dose))}</span>` : ""}</li>`).join("")}</ul>`
    : `<p class="small muted" style="margin:0">${t("还没有接种记录。录入体检时打的针会一起记下。")}</p>`);
}
function labCard(){
  if (!H.hlOk) return card(`🧪 ${t("化验")}`, "", `<p class="small muted" style="margin:0">${t("化验在牧羊人里记；数据库还没有牧羊人的健康表（迁移 026）。")}</p>`);
  const by = new Map(); for (const x of H.labs.filter(x => x.subject === subj()).sort((a, b) => String(a.day).localeCompare(String(b.day)))) by.set(x.code || x.name, x);
  const flag = x => (x.ref_high != null && +x.value > +x.ref_high ? "high" : x.ref_low != null && +x.value < +x.ref_low ? "low" : null);
  const rows = [...by.values()];
  return card(`🧪 ${t("化验")}`, `<a class="chip" href="https://dev-hyang.github.io/shepherd/" target="_blank" rel="noopener">${t("牧羊人")} ↗</a>`, rows.length
    ? `<ul class="gb-list">${rows.slice(0, 8).map(x => { const f = flag(x); return `<li>${esc(x.name || x.code)} <b class="num">${esc(+(+x.value).toFixed(2))}</b> <span class="small muted">${esc(x.unit || "")} · ${esc(String(x.day).replace(/-/g, "/"))}</span>${f ? ` <span class="pill warn">${t(f === "high" ? "偏高" : "偏低")}</span>` : ""}</li>`; }).join("")}</ul>`
    : `<p class="small muted" style="margin:0">${t("还没有化验。血常规、铅、维生素 D 这类结果在牧羊人里拍化验单录入，这里会自动出现。")}</p>`);
}
function historyCard(){
  const p = (profileRow() || {}).data || {}, meds = [...new Map(mine("bmed").filter(e => e.ts > Date.now() - 120 * D).map(e => [e.name || e.cat, e])).values()];
  const row = (label, v) => (v ? `<p style="margin:0 0 4px"><span class="small muted">${t(label)}：</span>${esc(v)}</p>` : "");
  const any = p.conditions || p.allergies || p.meds || p.notes || meds.length;
  return card(`📋 ${t("病史 / 过敏 / 用药")}`, `<button class="chip" data-act="gr-profile">${t("编辑")}</button>`, any
    ? `${row("病史", p.conditions)}${row("过敏", p.allergies)}${row("长期用药", p.meds)}${row("备注", p.notes)}${meds.length ? row("最近的维生素 / 用药", meds.map(e => [e.name || t(e.cat || ""), e.dose].filter(Boolean).join(" ")).join("、")) : ""}`
    : `<p class="small muted" style="margin:0">${t("没有记过病史和过敏。有食物 / 药物过敏、哮喘、湿疹这类情况，记在这里，给医生、学校、AI 分析都用得上。")}</p>`);
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
const OK_KEY = LS_PREFIX + ".intakeOk";
let X = null;
const VAX_DOSE = ["第1剂", "第2剂", "第3剂", "第4剂", "第5剂", "加强"], VAX_SITE = ["左大腿", "右大腿", "左上臂", "右上臂", "口服"];
const MED_CAT = ["维生素D", "铁剂", "益生菌", "药物"], MS_CAT = ["大运动", "精细动作", "语言", "社交情绪", "认知", "自理"];
const VITALS = [["weight", "体重"], ["length", "身高"], ["head", "头围"], ["temp", "体温"]];
const toLocal = ts => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromLocal = s => { const v = new Date(s).getTime(); return isNaN(v) ? null : v; };

function openIntake(src, manual){
  X = { src: src || "儿科体检", ts: Date.now(), child: S.childId, clinic: "", note: "", weight: null, length: null, head: null, temp: null,
    vaccines: [], meds: [], milestones: [], files: [], text: "", read: !!manual, busy: false };
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
  const read = home && X.read && !X.files.length && !X.text ? "" : `<div class="panel ix-read"><p class="small muted" style="margin:0 0 8px">${t("拍就诊小结、体检单或疫苗本（可多张），或者打 / 粘贴一段话：量了多少、打了什么针、医生说了什么。AI 读出来后在下面核对，一次保存成几条记录。")}</p>
    <div class="btns" style="margin-top:0"><button type="button" class="btn" data-ix="pick">📷 ${X.files.length ? t("已选 {n} 张，重新选", { n: X.files.length }) : t("拍照 / 选图片")}</button></div>
    <div class="field"><label for="ix_text">${t("或者打字 / 粘贴")}</label><textarea id="ix_text" data-ixf="text" placeholder="${esc(t("例：体重 20 kg，身高 112 cm，打了流感疫苗（左上臂），医生说发育正常，注意少吃甜食、每天户外 1 小时，明年再来"))}">${esc(X.text)}</textarea></div>
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
  $("#sheetIn").innerHTML = `${head(`${home ? "📏" : "✦"} ${esc(t(home ? "量一次身高体重" : "AI 一次录入体检 / 就诊"))} · ${esc(childName(X.child))}`)}${read}${form}
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

async function shrink(file, max = 1800){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(t("这张图片打不开"))); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return { mime: "image/jpeg", b64: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
  } finally { URL.revokeObjectURL(url); }
}
function pick(){
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
  inp.onchange = () => { readIx(); X.files = [...inp.files].slice(0, 6); draw(); };
  inp.click();
}
async function aiRead(){
  readIx();
  if (!X.files.length && !X.text.trim()) { toast(t("先拍照 / 选图片，或者打一段话")); return; }
  if (!aiReady()) { toast(t("还没填 API key：在 我的 → 咩咩咩 里设置")); return; }
  let ok = false; try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (e) {}
  if (!ok) { if (!confirm(t("照片和文字会发给你自己设置的 AI 服务商来读取（提示里要求它不要读姓名、生日、地址）；不保存照片。继续吗？"))) return; try { localStorage.setItem(OK_KEY, "1"); } catch (e) {} }
  X.busy = true; draw();
  try {
    const images = []; for (const f of X.files) images.push(await shrink(f));
    const r = parseIntake(await askText(INTAKE_SYSTEM, `Read this pediatric visit.${X.text.trim() ? "\nParent's notes:\n" + X.text.trim().slice(0, 8000) : ""}`, { json: true, images, maxTokens: 3000 }));
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
    case "pick": pick(); return;
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
function bodyAct(act){
  if (act === "gr-profile") { openProfile(); return true; }
  if (act === "gr-body-reload") { loadBody(true); return true; }
  return false;
}
const bodyReady = () => H.loaded;

export { bodyHTML, bodyAct, bodySummary, bodyReady, loadBody };
