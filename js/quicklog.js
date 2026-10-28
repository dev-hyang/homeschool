import { SB } from "./core/auth.js";
import { t } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { $, esc, hm, toast } from "./core/util.js";
import { closeSheet, openForm } from "./sheet.js";
import { render } from "./views.js";

/* ============ 今天页「记一笔」：一排格子，点哪个就是哪种记录的入口 ============
   和小月亮的「快速记录」一样：格子只是入口，点开是那种记录的表单（字段与小月亮同一类型一致），详细内容以记录为准。
   记在小月亮的 entries 里（type = mood / potty / food / activity，data 里的字段名和小月亮一样），所以两边看到的是同一份。
   每条带 child，记给顶上选中的孩子；表单里「时间」默认现在，可以补记今天早些时候的。格子下面列出这个孩子今天记过的，点一条改 / 删。 */
const seg = (k, label, opts, extra = {}) => ({ k, label, type: "seg", opts: opts.map(o => (Array.isArray(o) ? o : [o, o])), ...extra });
const mealByHour = () => { const h = new Date().getHours(); return h < 10 ? "早餐" : h < 15 ? "午餐" : h < 17 ? "加餐" : "晚餐"; };
const TILES = [
  { id: "mood", type: "mood", icon: "🌤", label: "情绪", preset: () => ({ level: "4", kind: "平静" }), fields: () => [
    seg("level", "心情（1 很低落 – 5 很好）", [["1", "😢 1"], ["2", "😔 2"], ["3", "😐 3"], ["4", "🙂 4"], ["5", "😄 5"]], { raw: true }),
    seg("kind", "状态", ["平静", "开心", "低落", "烦躁生气", "焦虑压力", "委屈难过"]),
    { k: "trigger", label: "起因", type: "text", ph: "考试、和朋友闹矛盾、被批评…" }, { k: "how", label: "怎么调整的", type: "text", ph: "聊聊、运动、听音乐、独处…" },
    { k: "note", label: "心里话 / 备注", type: "area", ph: "孩子说的、你观察到的…" }] },
  { id: "potty", type: "potty", icon: "🚽", label: "如厕", preset: () => ({ what: "尿", where: "小马桶" }), fields: () => [
    seg("what", "内容", ["尿", "便", "尿+便", "坐了没出"]), seg("where", "在哪儿", ["小马桶", "马桶", "尿裤里", "裤子湿了"]),
    { k: "self", label: "自己提出要去", type: "check" }, { k: "note", label: "备注", type: "text" }] },
  { id: "meal", type: "food", icon: "🍚", label: "吃饭", preset: () => ({ meal: mealByHour() }), fields: () => [
    seg("meal", "哪一餐", ["早餐", "午餐", "晚餐", "加餐"]), { k: "foods", label: "吃了什么", type: "text", ph: "米饭、青菜、鸡蛋…" },
    seg("amount", "吃了多少", ["尝一口", "几口", "一半", "大部分", "吃完"]), seg("focus", "吃饭时", ["专心吃", "边吃边玩", "离座走动", "要人追着喂"]),
    { k: "minutes", label: "用餐时长（分钟）", type: "num" }, { k: "note", label: "备注", type: "text", ph: "喜欢 / 不喜欢、呛咳…" }] },
  { id: "outdoor", type: "activity", icon: "🌳", label: "户外", preset: () => ({ kind: "户外" }), fields: () => [
    { k: "minutes", label: "时长（分钟）", type: "num" }, { k: "what", label: "内容", type: "text", ph: "公园、骑车、和谁一起…" }, { k: "note", label: "备注", type: "area", ph: "表现、感受…" }] }
];
const TYPES = [...new Set(TILES.map(x => x.type))];
const tileOf = r => TILES.find(x => x.type === r.data.type);
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
    <div class="small muted" style="margin-bottom:8px">${t("给 {n} 记一笔：点一格，填几项就行。", { n: esc(childName()) })}</div>
    <div class="ql-grid" role="group" aria-label="${esc(t("记一笔"))}">${TILES.map(x => `<button type="button" class="ql-tile" data-act="ql-new" data-id="${x.id}"><span class="ql-ico" aria-hidden="true">${x.icon}</span><span>${esc(t(x.label))}</span></button>`).join("")}</div>
    ${list}</div>`;
}

async function save(tile, old, f){
  if (!ready()) return;
  const now = Date.now(), base = new Date(old ? old.ts : now), m = /^(\d{1,2}):(\d{2})$/.exec(f.at || "");
  if (m) base.setHours(+m[1], +m[2], 0, 0);
  const ts = Math.min(base.getTime(), now + 60e3), id = old ? old.id : "hsql-" + now.toString(36) + Math.random().toString(36).slice(2, 6);
  const data = { ...(old ? old.data : {}), id, type: tile.type, ts, updated: now, child: old ? old.data.child : S.childId };
  for (const fl of tile.fields()) { const x = f[fl.k]; if (x == null || x === "" || x === false) delete data[fl.k]; else data[fl.k] = fl.k === "level" ? +x : x; }
  if (tile.type === "activity" && !old) data.kind = "户外";   // 新记的是户外；改小月亮里记的别的活动（阅读等）不动它的类型
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

function quickAct(act, btn){
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
