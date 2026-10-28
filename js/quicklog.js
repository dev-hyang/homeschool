import { SB } from "./core/auth.js";
import { t } from "./core/i18n.js";
import { S, ageMonths, childName } from "./core/state.js";
import { $, esc, hm, toast } from "./core/util.js";
import { saveSettings } from "./hs.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { render } from "./views.js";

/* ============ 今天页「记一笔」：一排格子，点哪个就是哪种记录的入口 ============
   和小月亮的「快速记录」一样：格子只是入口，点开是那种记录的表单（字段与小月亮同一类型一致），详细内容以记录为准。
   记在小月亮的 entries 里（type = mood / potty / food / activity，data 里的字段名和小月亮一样），所以两边看到的是同一份。
   每条带 child，记给顶上选中的孩子；表单里「时间」默认现在，可以补记今天早些时候的。格子下面列出这个孩子今天记过的，点一条改 / 删。 */
const seg = (k, label, opts, extra = {}) => ({ k, label, type: "seg", opts: opts.map(o => (Array.isArray(o) ? o : [o, o])), ...extra });
const mealByHour = () => { const h = new Date().getHours(); return h < 10 ? "早餐" : h < 15 ? "午餐" : h < 17 ? "加餐" : "晚餐"; };
/* 卡片池：age = [起, 止) 月龄（推荐给这个年龄段），opt = 默认不放进格子（要用自己到「自定义」里加）。
   每个孩子自己选哪几格（S.hs.settings.quickTiles[孩子 id]）；没选过就用当前年龄的推荐。type / kind / 字段和小月亮一致。 */
const ACT_FIELDS = (what, ph) => () => [{ k: "minutes", label: "时长（分钟）", type: "num" }, { k: "what", label: what, type: "text", ph }, { k: "note", label: "备注", type: "area", ph: "表现、感受…" }];
const TILES = [
  { id: "mood", type: "mood", icon: "🌤", label: "情绪", desc: "心情打几分、什么起因、怎么调整的", age: [36, 1200], preset: () => ({ level: "4", kind: "平静" }), fields: () => [
    seg("level", "心情（1 很低落 – 5 很好）", [["1", "😢 1"], ["2", "😔 2"], ["3", "😐 3"], ["4", "🙂 4"], ["5", "😄 5"]], { raw: true }),
    seg("kind", "状态", ["平静", "开心", "低落", "烦躁生气", "焦虑压力", "委屈难过"]),
    { k: "trigger", label: "起因", type: "text", ph: "考试、和朋友闹矛盾、被批评…" }, { k: "how", label: "怎么调整的", type: "text", ph: "聊聊、运动、听音乐、独处…" },
    { k: "note", label: "心里话 / 备注", type: "area", ph: "孩子说的、你观察到的…" }] },
  { id: "potty", type: "potty", icon: "🚽", label: "如厕", desc: "如厕训练：尿 / 便、在哪儿、是不是自己提出", age: [18, 72], preset: () => ({ what: "尿", where: "小马桶" }), fields: () => [
    seg("what", "内容", ["尿", "便", "尿+便", "坐了没出"]), seg("where", "在哪儿", ["小马桶", "马桶", "尿裤里", "裤子湿了"]),
    { k: "self", label: "自己提出要去", type: "check" }, { k: "note", label: "备注", type: "text" }] },
  { id: "meal", type: "food", icon: "🍚", label: "吃饭", desc: "哪一餐、吃了多少、吃饭专不专心", age: [12, 96], preset: () => ({ meal: mealByHour() }), fields: () => [
    seg("meal", "哪一餐", ["早餐", "午餐", "晚餐", "加餐"]), { k: "foods", label: "吃了什么", type: "text", ph: "米饭、青菜、鸡蛋…" },
    seg("amount", "吃了多少", ["尝一口", "几口", "一半", "大部分", "吃完"]), seg("focus", "吃饭时", ["专心吃", "边吃边玩", "离座走动", "要人追着喂"]),
    { k: "minutes", label: "用餐时长（分钟）", type: "num" }, { k: "note", label: "备注", type: "text", ph: "喜欢 / 不喜欢、呛咳…" }] },
  { id: "outdoor", type: "activity", kind: "户外", icon: "🌳", label: "户外", desc: "公园、骑车、运动，记个时长", age: [12, 1200], preset: () => ({ kind: "户外" }), fields: ACT_FIELDS("内容", "公园、骑车、和谁一起…") },
  { id: "read", type: "activity", kind: "阅读", icon: "📚", label: "阅读", desc: "读了什么书、读了多久", age: [24, 1200], preset: () => ({ kind: "阅读" }), fields: ACT_FIELDS("书名 / 内容", "书名、和谁一起读…") },
  { id: "screen", type: "activity", kind: "屏幕", icon: "📱", label: "屏幕", desc: "看了多久、看的什么，帮你心里有数", age: [48, 1200], preset: () => ({ kind: "屏幕" }), fields: ACT_FIELDS("内容", "视频、游戏、作业…") },
  { id: "speech", type: "speech", icon: "💬", label: "语言", desc: "新词、短句、会问问题", age: [12, 48], opt: 1, preset: () => ({ kind: "新词" }), fields: () => [
    seg("kind", "类型", ["新词", "短句", "会指认", "听懂指令", "会问问题"]), { k: "words", label: "说了什么", type: "text", ph: "妈妈 / 要抱抱 / 这是什么…" },
    seg("lang", "语言", ["中文", "英文", "其他"]), { k: "note", label: "备注", type: "text" }] },
  { id: "companion", type: "companion", icon: "🤗", label: "陪伴", desc: "谁陪孩子做了什么、多久", age: [48, 1200], opt: 1, preset: () => ({ kind: "谈心" }), fields: () => [
    seg("kind", "做什么", ["谈心", "游戏", "运动", "外出", "一起读书", "一起吃饭", "其他"]), seg("who", "谁陪的", ["爸爸", "妈妈", "爸爸妈妈", "其他家人"]),
    { k: "minutes", label: "时长（分钟）", type: "num" }, { k: "what", label: "内容", type: "text", ph: "聊了什么、玩了什么…" }, { k: "note", label: "备注", type: "area", ph: "孩子的反应、想记住的话…" }] },
  { id: "social", type: "social", icon: "👫", label: "社交", desc: "和朋友相处、矛盾、帮助别人", age: [60, 1200], opt: 1, preset: () => ({ kind: "和朋友相处" }), fields: () => [
    seg("kind", "情况", ["和朋友相处", "发生矛盾", "帮助别人", "认识新朋友", "团体活动", "网络社交"]), { k: "who", label: "和谁", type: "text", ph: "同学、队友、邻居…" },
    { k: "how", label: "怎么处理的", type: "text", ph: "道歉、聊开了、找老师…" }, { k: "note", label: "备注", type: "area", ph: "发生了什么、孩子的感受…" }] }
];
const TYPES = [...new Set(TILES.map(x => x.type))];
const tileOf = r => TILES.find(x => x.type === r.data.type && (!x.kind || x.kind === r.data.kind)) || TILES.find(x => x.type === r.data.type);
const ageRange = x => { const f = m => (m % 12 ? +(m / 12).toFixed(1) : m / 12), [a, b] = x.age; return b >= 1200 ? t("{a} 岁起", { a: f(a) }) : t("{a}–{b} 岁", { a: f(a), b: f(b) }); };
const recommended = (x, m = ageMonths()) => m == null || (m >= x.age[0] && m < x.age[1]);
/** 这个孩子现在显示哪几格：自己选过的按选的；没选过的用当前年龄的推荐（不含 opt） */
function tilesFor(cid = S.childId){
  const pref = ((S.hs.settings || {}).quickTiles || {})[cid];
  return pref ? TILES.filter(x => pref.includes(x.id)) : TILES.filter(x => !x.opt && recommended(x));
}
S.ql = { rows: [], loaded: false, loading: false };
const fid = () => S.family && S.family.id;
const ready = () => !!(SB.client && fid() && S.hs.loaded);
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

async function loadQuick(){
  if (!ready() || S.ql.loading) return;
  S.ql.loading = true;
  const { data, error } = await SB.client.from("entries").select("id,ts,data").eq("family_id", fid()).in("type", TYPES).eq("deleted", false).gte("ts", dayStart()).order("ts", { ascending: false }).limit(120);
  S.ql.loading = false;
  if (error) { console.warn("quicklog", error.message); return; }
  const sig = rows => JSON.stringify(rows.map(r => [r.id, r.ts]));
  const rows = (data || []).map(r => ({ id: r.id, ts: +r.ts, data: r.data || {} })), changed = sig(rows) !== sig(S.ql.rows);
  S.ql.rows = rows; S.ql.loaded = true;
  if (changed && S.tab === "today" && !$("#sheet").open) render();
}

/** 一条记录的一行小字 */
function summary(r){
  const d = r.data, v = x => (x == null || x === "" ? "" : t(String(x)));
  switch (d.type) {
    case "mood": return [v(d.kind), d.trigger, d.how].filter(Boolean).join(" · ");
    case "potty": return [v(d.what), v(d.where), d.self ? t("自己提出要去") : ""].filter(Boolean).join(" · ");
    case "food": return [v(d.meal), d.foods, v(d.amount), v(d.focus)].filter(Boolean).join(" · ");
    default: return [v(d.kind), d.minutes ? t("{n} 分钟", { n: d.minutes }) : "", d.what].filter(Boolean).join(" · ");
  }
}

function quickHTML(){
  if (!ready() || !S.childId) return "";
  if (!S.ql.loaded) loadQuick();
  const mine = S.ql.rows.filter(r => (r.data.child || "") === S.childId);
  const list = mine.length ? `<ul class="ql-list" aria-label="${esc(t("今天记过的"))}">${mine.slice(0, 8).map(r => { const tl = tileOf(r) || {}; return `<li><button type="button" class="ql-row" data-act="ql-edit" data-id="${esc(r.id)}"><span aria-hidden="true">${tl.icon || "📝"}</span><b>${hm(r.ts)}</b><span class="ql-sum">${esc(summary(r))}</span></button></li>`; }).join("")}</ul>` : "";
  return `<h2>${t("记一笔")}</h2><div class="panel ql-card">
    <div class="ql-top"><span class="small muted">${t("给 {n} 记一笔：点一格，填几项就行。", { n: esc(childName()) })}</span><button type="button" class="chip" data-act="ql-cfg">⚙ ${t("自定义")}</button></div>
    <div class="ql-grid" role="group" aria-label="${esc(t("记一笔"))}">${tilesFor().map(x => `<button type="button" class="ql-tile" data-act="ql-new" data-id="${x.id}"><span class="ql-ico" aria-hidden="true">${x.icon}</span><span>${esc(t(x.label))}</span></button>`).join("")}</div>
    ${list}</div>`;
}

async function save(tile, old, f){
  if (!ready()) return;
  const now = Date.now(), base = new Date(old ? old.ts : now), m = /^(\d{1,2}):(\d{2})$/.exec(f.at || "");
  if (m) base.setHours(+m[1], +m[2], 0, 0);
  const ts = Math.min(base.getTime(), now + 60e3), id = old ? old.id : "hsql-" + now.toString(36) + Math.random().toString(36).slice(2, 6);
  const data = { ...(old ? old.data : {}), id, type: tile.type, ts, updated: now, child: old ? old.data.child : S.childId };
  for (const fl of tile.fields()) { const x = f[fl.k]; if (x == null || x === "" || x === false) delete data[fl.k]; else data[fl.k] = fl.k === "level" ? +x : x; }
  if (tile.kind && !old) data.kind = tile.kind;   // 新记的按格子定类型；改小月亮里记的别的活动不动它的类型
  const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: tile.type, ts, updated: now, deleted: false, data }, { onConflict: "family_id,id" });
  if (error) { console.error(error); toast(t("没记上：{m}", { m: error.message })); return; }
  S.ql.rows = [{ id, ts, data }, ...S.ql.rows.filter(x => x.id !== id)].sort((a, b) => b.ts - a.ts);
  closeSheet(); toast(t("已记下")); render();
}
async function remove(old){
  const now = Date.now(), { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: old.id, type: old.data.type, ts: old.ts, updated: now, deleted: true, data: { ...old.data, updated: now } }, { onConflict: "family_id,id" });
  if (error) { console.error(error); toast(t("没删掉：{m}", { m: error.message })); return; }
  S.ql.rows = S.ql.rows.filter(x => x.id !== old.id); closeSheet(); render();
}
const timeField = { k: "at", label: "时间", type: "time" };

/* ---- 自定义：每个孩子自己选哪几格；列出全部卡片，带介绍和推荐年龄，当前年龄推荐的标「推荐」 ---- */
function openQuickSettings(){
  const on = new Set(tilesFor().map(x => x.id)), m = ageMonths();
  $("#sheetIn").innerHTML = `${head(esc(t("自定义「记一笔」")))}
  <p class="small muted">${t("给 {n} 选今天页要放的格子。年龄不同常用的不一样：小的记如厕、吃饭，大的记情绪、阅读、屏幕。已经记过的不受影响。", { n: esc(childName()) })}</p>
  <div class="ql-pool">${TILES.map(x => `<button type="button" class="ql-opt" data-act="ql-toggle" data-id="${x.id}" aria-pressed="${on.has(x.id)}"><span class="ql-ico" aria-hidden="true">${x.icon}</span><span class="ql-opt-t"><b>${esc(t(x.label))}</b>${recommended(x, m) ? ` <span class="pill lv">${t("推荐")}</span>` : ""}<small>${esc(t(x.desc))} · ${esc(ageRange(x))}</small></span><span class="ql-chk" aria-hidden="true">${on.has(x.id) ? "✓" : ""}</span></button>`).join("")}</div>
  <div class="btns"><button class="btn" data-act="ql-reset">${t("恢复推荐")}</button><button class="btn primary" data-act="ql-done">${t("完成")}</button></div>`;
  showSheet();
}
async function setTiles(ids){
  const all = { ...((S.hs.settings || {}).quickTiles || {}) };
  if (ids) all[S.childId] = ids; else delete all[S.childId];
  try { await saveSettings({ quickTiles: all }); } catch (e) { return; }
  openQuickSettings();
}

function quickAct(act, btn){
  if (act === "ql-cfg") { if (S.childId) openQuickSettings(); return; }
  if (act === "ql-toggle") { const id = btn.dataset.id, cur = tilesFor().map(x => x.id), next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; return setTiles(TILES.map(x => x.id).filter(x => next.includes(x))); }
  if (act === "ql-reset") return setTiles(null);
  if (act === "ql-done") { closeSheet(); return; }
  if (!ready()) return;
  if (act === "ql-new") {
    const tile = TILES.find(x => x.id === btn.dataset.id); if (!tile) return;
    openForm(`${tile.icon} ${t(tile.label)} · ${childName()}`, [timeField, ...tile.fields()], { at: hm(Date.now()), ...tile.preset() }, f => save(tile, null, f));
  } else if (act === "ql-edit") {
    const r = S.ql.rows.find(x => x.id === btn.dataset.id), tile = r && tileOf(r); if (!tile) return;
    const vals = { ...r.data, at: hm(r.ts) }; if (vals.level != null) vals.level = String(vals.level);
    openForm(`${tile.icon} ${t(tile.label)}`, [timeField, ...tile.fields()], vals, f => save(tile, r, f), () => { if (confirm(t("删除这一条？"))) remove(r); });
  }
}
const isQuickAct = act => act.startsWith("ql-");

export { quickHTML, quickAct, isQuickAct, loadQuick };
