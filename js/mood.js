import { SB } from "./core/auth.js";
import { t } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { $, H, esc, hm, toast } from "./core/util.js";
import { render } from "./views.js";

/* ============ 今天页的「情绪」小卡片：随手记一笔 ============
   点一下表情就记一条，不弹表单；想多写一句起因，先在输入框里写好再点表情。
   记在小月亮的 entries 里（type = mood，字段和小月亮「情绪」记录一样：level / kind / trigger），
   所以小月亮的趋势、情绪管理页读到的是同一份数据。每条带 child，记给顶上选中的孩子。 */
const MOODS = [["开心", "😄", 5], ["平静", "🙂", 4], ["低落", "😔", 2], ["烦躁生气", "😠", 2], ["焦虑压力", "😰", 2], ["委屈难过", "😢", 2]];
const emoji = k => (MOODS.find(m => m[0] === k) || [])[1] || "🌤";
const SRC_NOTE = "来自家庭学堂 · 今天";
S.mood = { rows: [], loaded: false, loading: false };
const fid = () => S.family && S.family.id;
const ready = () => !!(SB.client && fid() && S.hs.loaded);
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

async function loadMood(){
  if (!ready() || S.mood.loading) return;
  S.mood.loading = true;
  const { data, error } = await SB.client.from("entries").select("id,ts,data").eq("family_id", fid()).eq("type", "mood").eq("deleted", false).gte("ts", dayStart()).order("ts", { ascending: false }).limit(60);
  S.mood.loading = false;
  if (error) { console.warn("mood", error.message); return; }
  const before = JSON.stringify(S.mood.rows.map(r => r.id));
  S.mood.rows = (data || []).map(r => ({ id: r.id, ts: +r.ts, data: r.data || {} })); S.mood.loaded = true;
  if (JSON.stringify(S.mood.rows.map(r => r.id)) !== before && S.tab === "today" && !$("#sheet").open) render();
}

function moodHTML(){
  if (!ready()) return "";
  if (!S.mood.loaded) loadMood();
  const cid = S.childId, mine = S.mood.rows.filter(r => (r.data.child || "") === cid).slice(0, 6);
  const last = mine.length ? `<div class="mood-log" aria-label="${esc(t("今天记过的"))}">${mine.map(r => `<span class="mood-pill">${hm(r.ts)} ${emoji(r.data.kind)} ${esc(t(r.data.kind || ""))}${r.data.trigger ? ` · ${esc(r.data.trigger)}` : ""}<button type="button" class="mood-x" data-act="mood-del" data-id="${esc(r.id)}" aria-label="${esc(t("删除"))}">×</button></span>`).join("")}</div>` : "";
  return `<h2>${t("情绪")}</h2><div class="panel mood-card">
    <div class="small muted" style="margin-bottom:8px">${t("{n} 现在心情怎么样？点一下就记一笔。", { n: esc(childName()) })}</div>
    <div class="mood-row" role="group" aria-label="${esc(t("情绪"))}">${MOODS.map(([k, e]) => `<button type="button" class="mood-btn" data-act="mood-add" data-k="${esc(k)}"><span class="mood-e" aria-hidden="true">${e}</span><span>${esc(t(k))}</span></button>`).join("")}</div>
    <input id="moodTrig" class="mood-trig" maxlength="60" placeholder="${esc(t("起因（选填）：考试、和朋友闹矛盾……"))}" aria-label="${esc(t("起因（选填）"))}">
    ${last}</div>`;
}

async function moodAct(act, btn){
  if (!ready()) return;
  if (act === "mood-add") {
    const m = MOODS.find(x => x[0] === btn.dataset.k); if (!m) return;
    const trig = ($("#moodTrig") && $("#moodTrig").value.trim()) || "", now = Date.now(), id = "hsmood-" + now.toString(36) + Math.random().toString(36).slice(2, 6);
    const data = { id, type: "mood", ts: now, updated: now, child: S.childId, level: m[2], kind: m[0], note: SRC_NOTE, ...(trig ? { trigger: trig } : {}) };
    const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: "mood", ts: now, updated: now, deleted: false, data }, { onConflict: "family_id,id" });
    if (error) { console.error(error); toast(t("没记上：{m}", { m: error.message })); return; }
    S.mood.rows.unshift({ id, ts: now, data }); toast(t("已记下：{k}", { k: `${m[1]} ${t(m[0])}` })); render();
  } else if (act === "mood-del") {
    const r = S.mood.rows.find(x => x.id === btn.dataset.id); if (!r) return;
    const now = Date.now(), { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: r.id, type: "mood", ts: r.ts, updated: now, deleted: true, data: { ...r.data, updated: now } }, { onConflict: "family_id,id" });
    if (error) { console.error(error); toast(t("没删掉：{m}", { m: error.message })); return; }
    S.mood.rows = S.mood.rows.filter(x => x.id !== r.id); render();
  }
}
const isMoodAct = act => act.startsWith("mood-");

export { moodHTML, moodAct, isMoodAct, loadMood };
