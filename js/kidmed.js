import { SB } from "./core/auth.js";
import { t } from "./core/i18n.js";
import { S, childName, ownerOf } from "./core/state.js";
import { $, D, dayKey, esc, hm, newId, toast } from "./core/util.js";
import { saveSettings } from "./hs.js";
import { TIMINGS, timingText } from "./med-advice.js";
import { cleanRules, heroOff, heroOn, kidRules, medsOf, nameChoices, recentMeds, weekCounts } from "./kidmed-lib.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { render } from "./views.js";

/* ============ 今天页顶部：孩子的「距上次用药」大卡片 ============
   一张卡 = 当前孩子最近一次用药多久了、哪种药、下次可服时间、服药时机和医嘱、其他药各自多久、近 7 天每天几次。
   「记一次用药」可以指定哪天几点（补记）；记录是小月亮同一种「宝宝用药」记录（成长 → 病史 · 过敏 · 用药 里查、改、删）。
   设置（每种药的最短间隔 / 服药时机 / 医嘱，每个孩子要不要显示这张卡）在「用药设置」里；康复了点「不再显示」。逻辑见 kidmed-lib.js。 */
const KM = (S.km ||= { rows: [], key: "", loading: false, draft: null });
const fid = () => S.family && S.family.id;
const settings = () => S.hs.settings || {};
const legacy = () => ownerOf({});
const myMeds = () => medsOf(KM.rows, S.childId, legacy());
const repaint = () => { if (S.tab === "today" && !$("#sheet").open) render(); };

/** 最近 30 天全家的用药记录读一次（卡片和「是否自动显示」都靠它）；存了新记录就重读 */
async function ensureKidMeds(){
  const f = fid(); if (!f || !SB.client || KM.loading || KM.key === f) return;
  KM.loading = true;
  try {
    const r = await SB.client.from("entries").select("id,ts,data").eq("family_id", f).eq("type", "bmed").eq("deleted", false).gte("ts", Date.now() - 30 * D).order("ts", { ascending: false }).limit(300);
    if (r.error) throw r.error;
    KM.rows = (r.data || []).map(x => ({ ...(x.data || {}), id: x.id, type: "bmed", ts: +x.ts })); KM.key = f;
  } catch (e) { KM.key = ""; console.error(e); }
  finally { KM.loading = false; repaint(); }
}
const bigDur = ms => { const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d}<small>${t("天")}</small>${h % 24}<small>${t("小时")}</small>` : h ? `${h}<small>${t("小时")}</small>${m % 60}<small>${t("分")}</small>` : `${m}<small>${t("分钟")}</small>`; };

function nextPill(info){
  if (!info.next) return "";
  return info.next > Date.now() ? `<span class="side">${t("{time} 后可再服", { time: hm(info.next) })}</span>` : `<span>${t("已过医嘱间隔")}</span>`;
}
const ago = ms => { const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? t("{n} 天", { n: d }) : h ? t("{n} 小时", { n: h }) : t("{n} 分钟", { n: m }); };
/** 其他药各自多久（一行，放不下就省略号）：「其他：益生菌 5 小时前 · 维生素D 1 天前」 */
const othersLine = rec => (rec.length ? `${t("其他")}：${rec.map(r => `${r.name} ${t("{ago}前", { ago: ago(Date.now() - r.at) })}`).join(" · ")}` : "");
/** 近 7 天每天几次：小柱子，放在大数字右边（读屏用 aria-label 念出具体数字） */
function weekBars(meds){
  const w = weekCounts(meds), top = Math.max(1, ...w);
  return `<div class="km-week" role="img" aria-label="${esc(t("近 7 天每天用药次数：{v}", { v: w.join("、") }))}">${w.map(n => `<i style="height:${Math.round(4 + n / top * 18)}px" title="${n}"></i>`).join("")}</div>`;
}
/** 今天页顶部的这一张（和名字卡差不多高：标题、大数字 + 小柱子、一行说明、一行小字、一排按钮）；这个孩子没开（或还没读到）就是空字符串 */
function kidMedSlideHTML(){
  ensureKidMeds();
  const cid = S.childId; if (!cid || KM.key !== fid()) return "";
  const rules = kidRules(settings()), meds = myMeds().filter(e => !heroOff(e, rules));   // 设置里关掉顶部卡片的药（已康复 / 不吃了）不再进这张卡
  if (!heroOn(settings(), cid, meds)) return "";
  const rec = recentMeds(meds, rules), top = rec[0];
  const head2 = `<div class="lbl">💊 ${esc(childName())} · ${t("距上次用药")}</div>`;
  const acts = `<div class="medact"><button class="hbtn" data-act="km-add">${t("记一次")}</button><button class="hbtn" data-tab="gr-meds">${t("历史")}</button><button class="hbtn icon" data-act="km-settings" aria-label="${esc(t("用药设置"))}" title="${esc(t("用药设置"))}">⚙</button><button class="hbtn" data-act="km-off" title="${esc(t("康复了不用再看时点这里；在「用药设置」里能重新打开"))}">${t("隐藏")}</button></div>`;
  if (!top) return `<section class="hero kmhero" aria-label="${esc(t("用药"))}"><div class="moon"></div>${head2}<div class="big num">${t("还没记录")}</div><div class="meta"><span>${t("点「记一次」开始记")}</span></div>${acts}</section>`;
  const how = [timingText(top.info.tm, t), top.info.note].filter(Boolean).join(" · "), sub = [how, othersLine(rec.slice(1))].filter(Boolean).join("　"), e = top.entry;
  return `<section class="hero kmhero${top.info.next && top.info.next <= Date.now() ? "" : top.info.next ? " wait" : ""}" aria-label="${esc(t("用药"))}"><div class="moon"></div>${head2}
    <div class="km-row"><div class="big num">${bigDur(Date.now() - top.at)}</div>${weekBars(meds)}</div>
    <div class="meta"><span class="km-what">${esc(top.name)}${e.dose ? ` ${esc(e.dose)}` : ""} · ${t("上次 {time}", { time: hm(top.at) })}</span>${nextPill(top.info)}</div>
    ${sub ? `<div class="km-sub" title="${esc(sub)}">${esc(sub)}</div>` : ""}${acts}</section>`;
}

/* ---- 记一次用药（可补记哪天几点） ---- */
const toTs = (day, time) => { const [y, m, d] = day.split("-").map(Number), [h, mi] = /^\d{1,2}:\d{2}$/.test(time || "") ? time.split(":").map(Number) : [12, 0]; return new Date(y, m - 1, d, h, mi).getTime(); };
async function putMed(e){
  const d = { ...e, updated: Date.now() }; for (const k of Object.keys(d)) if (d[k] === "" || d[k] == null) delete d[k];
  const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: d.id, type: "bmed", ts: d.ts, updated: d.updated, deleted: false, data: d }, { onConflict: "family_id,id" });
  if (error) { toast(t("没记上：{m}", { m: error.message })); return false; }
  KM.key = ""; if (S.gb) S.gb.key = "";   // 卡片和「成长 → 病史 · 过敏 · 用药」都重读
  return true;
}
function openAdd(){
  const names = nameChoices(kidRules(settings()), myMeds()), now = Date.now();
  openForm(`💊 ${childName()} · ${t("记一次用药")}`, [
    { k: "name", label: "药名", list: names.map(n => t(n)), ph: "退烧药 / 益生菌…" }, { k: "dose", label: "剂量", ph: "如 5ml" },
    { k: "timing", label: "服药时机（按医嘱 / 说明书）", type: "seg", opts: TIMINGS.map(x => [x === "不限" ? "" : x, x]) }, { k: "mins", label: "饭前 / 饭后多少分钟（选填）", type: "num" },
    { k: "day", label: "日期（补记选过去的）", type: "date", past: true }, { k: "time", label: "时间", type: "time" }, { k: "note", label: "备注", type: "text" }
  ], { name: "", dose: "", timing: "", mins: null, day: dayKey(now), time: hm(now), note: "" }, async f => {
    if (!f.name) { toast(t("填一下药名")); return; }
    const ts = toTs(f.day || dayKey(now), f.time); if (ts > Date.now() + 60e3) { toast(t("时间不能晚于现在")); return; }
    const ok = await putMed({ id: newId(), type: "bmed", ts, child: S.childId, cat: "药物", name: f.name, dose: f.dose, timing: f.timing, mins: ["饭前", "饭后"].includes(f.timing) ? f.mins : null, note: f.note });
    if (ok) { closeSheet(); toast(t("已记录")); ensureKidMeds(); }
  });
}

/* ---- 用药设置：每种药的规则 + 每个孩子要不要显示这张卡 ---- */
function readRules(){
  const rows = []; document.querySelectorAll("#sheetIn [data-kr]").forEach(el => { (rows[+el.dataset.kr] ||= {})[el.dataset.kk] = el.value.trim(); });
  if (rows.length) KM.draft = rows.map(r => r || {});
}
function drawSettings(){
  const rules = KM.draft || (KM.draft = kidRules(settings()).map(r => ({ ...r }))), hero = (settings().kidMeds || {}).hero || {};
  const f = (i, k, label, extra) => `data-kr="${i}" data-kk="${k}" aria-label="${esc(t(label))}" ${extra}`;
  const rows = rules.map((r, i) => `<div class="medrule"><div class="row2"><input type="text" ${f(i, "name", "药名", `value="${esc(r.name || "")}" placeholder="${esc(t("药名"))}"`)}><input type="number" inputmode="decimal" ${f(i, "hours", "最短间隔（小时）", `value="${esc(r.hours || "")}" placeholder="${esc(t("间隔（小时）"))}"`)}></div>
    <div class="row2"><select ${f(i, "timing", "服药时机", "")}>${TIMINGS.map(o => `<option value="${o === "不限" ? "" : o}" ${(r.timing || "") === (o === "不限" ? "" : o) ? "selected" : ""}>${esc(t(o))}</option>`).join("")}</select><input type="number" inputmode="numeric" ${f(i, "mins", "饭前 / 饭后多少分钟", `value="${esc(r.mins || "")}" placeholder="${esc(t("饭前 / 饭后几分钟"))}"`)}></div>
    <select ${f(i, "hero", "顶部卡片", "")}><option value="" ${r.hero === "off" ? "" : "selected"}>${esc(t("显示在顶部卡片"))}</option><option value="off" ${r.hero === "off" ? "selected" : ""}>${esc(t("不显示在顶部卡片（已康复 / 不吃了）"))}</option></select>
    <input type="text" ${f(i, "note", "医嘱备注", `value="${esc(r.note || "")}" placeholder="${esc(t("医嘱备注，如：发烧超过 38.5℃ 再吃"))}"`)}><button type="button" class="chip" data-act="km-rule-del" data-i="${i}">${t("删除这一种")}</button></div>`).join("");
  const kids = S.children.map(c => { const on = heroOn(settings(), c.id, medsOf(KM.rows, c.id, legacy())); return `<button type="button" class="chip" data-act="km-hero" data-cid="${esc(c.id)}" aria-pressed="${on}">${esc(c.name || t("宝宝"))}${on ? ` · ${t("显示中")}` : ""}</button>`; }).join("");
  $("#sheetIn").innerHTML = `${head(esc(t("用药设置")))}
    <p class="small muted">${t("按医嘱或说明书填每种药的最短间隔、服药时机和备注。今天页的用药卡会据此显示下次可以服药的时间；没填的只显示距上次多久。")}</p>
    ${rows || `<p class="small muted">${t("还没有填任何药。")}</p>`}<div class="btns"><button type="button" class="btn" data-act="km-rule-add">＋ ${t("添加一种药")}</button></div>
    <div class="lab" style="margin-top:14px">${t("今天页顶部显示用药卡的孩子")}</div><div class="chips km-kids" role="group">${kids}</div>
    <p class="small muted">${t("没设过的孩子：最近 14 天有用药记录就自动显示；康复后点「不再显示」或在这里关掉，随时能再打开。")}</p>
    <div class="btns"><button class="btn primary" data-act="km-save">${t("保存")}</button></div>`;
}
const openSettings = () => { KM.draft = null; drawSettings(); showSheet(); ensureKidMeds(); };
const setHero = async (cid, on) => { const cur = settings().kidMeds || {}; await saveSettings({ kidMeds: { ...cur, hero: { ...(cur.hero || {}), [cid]: on } } }); };

/** 点击分发（events.js 把 km- 开头的 data-act 交给这里） */
async function kmAct(act, d){
  switch (act) {
    case "km-add": openAdd(); break;
    case "km-settings": openSettings(); break;
    case "km-range": S.kmRange = +d.d; break;   // 成长 → 用药记录与趋势 的 14 / 30 / 90 天（events 随后重画）
    case "km-off": await setHero(S.childId, false); toast(t("已不再显示；在「用药设置」里能重新打开")); render(); break;
    case "km-rule-add": readRules(); (KM.draft ||= []).push({ name: "", hours: "", timing: "", mins: "", note: "", hero: "" }); drawSettings(); break;
    case "km-rule-del": readRules(); (KM.draft ||= []).splice(+d.i, 1); drawSettings(); break;
    case "km-hero": readRules(); await setHero(d.cid, !heroOn(settings(), d.cid, medsOf(KM.rows, d.cid, legacy()))); drawSettings(); break;
    case "km-save": { readRules(); const cur = settings().kidMeds || {}; await saveSettings({ kidMeds: { ...cur, rules: cleanRules(KM.draft) } }); KM.draft = null; closeSheet(); toast(t("已保存")); break; }
  }
}
export { kidMedSlideHTML, kmAct, ensureKidMeds };
