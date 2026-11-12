import { aiReady, askText } from "./ai.js";
import { LS_PREFIX } from "./core/config.js";
import { locale, t } from "./core/i18n.js";
import { S, ageMonths, stageOf } from "./core/state.js";
import { D, dayKey, esc, toast } from "./core/util.js";
import { B, flowContext, genderOf, mineRows } from "./flows-trend.js";
import { bodyReady, bodySummary, loadBody } from "./growth-body.js";
import { REVIEW_SYSTEM, hasInput, parseReview, reviewInput } from "./growth-review-lib.js";
import { attachHTML, attachPayload } from "./attach.js";
import { metricsList } from "./growth.js";
import { ensureMonth, learnedCount, monthData, saveSettings, unitProgress } from "./hs.js";
import { render } from "./views.js";

/* ============ 成长 · ✦ AI 身心灵分析（2026-11-11） ============
   成长页最上面一块（三大块都看得到），把这个孩子的身体与健康、习惯与情绪、学习与培训、属灵生活放在一起看，
   给出：先说做得好的、最值得加强的 1–4 件，再分身体 / 心理情绪 / 属灵 / 学习各自做得好的、要加强的、这周可以做的，以及问儿科医生的、家长怎么配合的。
   三种范围（逻辑和提示词在 growth-review-lib.js）：全盘 · 最近两周 · 需要留意。
   发给用户自己的 AI，不带姓名；只用当前登录的人看得到的记录（设成「仅我」的别人的记录本来就读不到）。
   属灵：小月亮打开了信仰模块，或者这里有敬拜 / 背经 / 睡前敬拜的记录，才分析这一块。
   结果按孩子、按范围存在家庭学堂的设置里（hs_family.settings.aiReview），全家看到同一份。 */
const AI_OK = LS_PREFIX + ".reviewOk";
const MODES = [["whole", "全盘分析", "🧭"], ["recent", "最近两周", "🗓"], ["watch", "需要留意", "🔎"]];
const AREA = { body: ["🩺", "身体"], mind: ["🌱", "心理情绪"], spirit: ["🕊", "属灵"], learning: ["📚", "学习与培训"] };
const R = (S.gv ||= { mode: "whole", busy: null, open: null });
const lang = () => (locale() === "en" ? "en" : "zh");
const saved = () => (((S.hs.settings || {}).aiReview || {})[S.childId] || {});

/* ---- 收集这个孩子的摘要（不带姓名） ---- */
const inWin = (date, a, b) => { const ts = new Date(String(date).slice(0, 10) + "T12:00:00").getTime(); return ts >= a && ts < b; };
async function spiritOf(days){
  const cid = S.childId, now = Date.now(), a = now - days * D, months = [...new Set([dayKey(now).slice(0, 7), dayKey(a).slice(0, 7)])];
  await Promise.all(months.map(ensureMonth));
  const md = months.map(monthData).filter(Boolean);
  const devo = md.flatMap(m => m.devotions).filter(d => d.done && inWin(d.date, a, now + D) && (!(d.children || []).length || d.children.includes(cid)));
  const bed = md.flatMap(m => m.bedtime || []).filter(l => inWin(l.date, a, now + D));
  const faithOn = !!(S.family && S.family.settings && S.family.settings.faith && S.family.settings.faith.on);
  const learned = learnedCount(cid);
  if (!faithOn && !devo.length && !bed.length && !learned) return null;
  return { window_days: days, family_worship_days: new Set(devo.map(d => d.date)).size, bedtime_worship_nights: new Set(bed.map(l => l.date)).size, verses_memorized_total: learned };
}
async function learningOf(days){
  const cid = S.childId, now = Date.now(), cur = [now - days * D, now + D], prev = [now - 2 * days * D, now - days * D];
  const out = {};
  if (S.hs.phase2) {
    const units = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active), ids = new Set(units.map(u => u.id));
    const done = S.hs.lessons.filter(l => ids.has(l.unit_id) && l.status === "done" && l.done_on);
    out.lessons_cur = done.filter(l => inWin(l.done_on, ...cur)).length; out.lessons_prev = done.filter(l => inWin(l.done_on, ...prev)).length;
    out.units_in_progress = units.filter(u => { const p = unitProgress(u.id); return p.done < p.total; }).map(u => ({ subject: u.subject, title: u.title, progress: `${unitProgress(u.id).done}/${unitProgress(u.id).total}` })).slice(0, 10);
    out.goals = S.hs.goals.filter(g => g.child_id === cid).map(g => ({ goal: g.title, reached: !!g.achieved_on })).slice(0, 12);
  }
  const months = [...new Set([dayKey(now).slice(0, 7), dayKey(now - days * D).slice(0, 7)])];
  await Promise.all(months.map(ensureMonth));
  const tasks = months.map(monthData).filter(Boolean).flatMap(m => m.tasks).filter(x => x.status === "done" && (x.child_id == null || x.child_id === cid) && inWin(x.date, ...cur));
  const bySubj = {}; for (const x of tasks) bySubj[x.subject] = (bySubj[x.subject] || 0) + (+x.minutes || 0);
  out.study_tasks_done = tasks.length; out.study_minutes_by_subject = bySubj;
  const cls = mineRows().filter(e => e.type === "activity" && e.kind === "课外班" && +e.ts >= now - 60 * D), by = {};
  for (const e of cls.sort((x, y) => x.ts - y.ts)) { const k = e.what || "class"; by[k] = { sessions: ((by[k] || {}).sessions || 0) + 1, minutes: ((by[k] || {}).minutes || 0) + (+e.minutes || 0), latest_progress: e.progress || (by[k] || {}).latest_progress || "" }; }
  if (Object.keys(by).length) out.classes_last_60_days = by;
  return out;
}
async function gather(mode){
  const days = mode === "recent" ? 14 : 30;
  if (!bodyReady()) { await loadBody(); for (let i = 0; i < 40 && !bodyReady(); i++) await new Promise(r => setTimeout(r, 250)); }
  const now = Date.now(), lows = mineRows().filter(e => e.type === "mood" && +e.level > 0 && +e.level <= 2 && +e.ts >= now - days * D).map(e => [e.kind, e.trigger].filter(Boolean).join("：")).filter(Boolean);
  const raw = { today: dayKey(now), days, age_months: ageMonths(), stage: stageOf().key, sex: genderOf() || null,
    metrics: metricsList(days), flows: flowContext({ days }), low_moods: lows, body: bodySummary() || {}, learning: await learningOf(days), spirit: await spiritOf(days) };
  return { raw, input: reviewInput(mode, raw), spirit: !!raw.spirit };
}

/* ---- 面板 ---- */
function reviewHTML(){
  if (!S.childId || !S.hs.loaded) return "";
  const m = MODES.some(([k]) => k === R.mode) ? R.mode : "whole", a = saved()[m], busy = R.busy === m + "|" + S.childId;
  const open = R.open == null ? !a : R.open;
  const seg = `<div class="seg mini gr-rv-modes" role="group" aria-label="${esc(t("分析范围"))}">${MODES.map(([k, l, ic]) => `<button type="button" data-act="gr-rv-mode" data-v="${k}" aria-pressed="${m === k}"><span aria-hidden="true">${ic}</span> ${t(l)}</button>`).join("")}</div>`;
  const scope = { whole: t("看：身体与健康的全部记录、近 30 天的日常（和前 30 天比）、学习与培训、敬拜和背经。"), recent: t("看：近 14 天和前 14 天比，加上最近两个月的体检 / 就诊。"), watch: t("只看挑出来要留意的：变差的趋势、超出范围的化验、该做的体检、过敏病史、低落的情绪、停下来的课程。") }[m];
  const btn = `<button type="button" class="btn ${a ? "" : "primary"}" data-act="gr-rv-run" ${busy || !aiReady() ? "disabled" : ""}>${busy ? t("分析中…") : a ? t("重新分析") : t("开始分析")}</button>`;
  return `<details class="panel gr-rv" ${open ? "open" : ""}><summary><b>✦ ${t("AI 身心灵分析")}</b>${a ? ` <small class="muted">${t("{d} 分析", { d: String(a.at).slice(0, 10).replace(/-/g, "/") })}</small>` : ` <small class="muted">${t("身体、情绪、属灵、学习一起看，给下一步建议")}</small>`}</summary>
    ${seg}<p class="small muted gr-rv-scope">${esc(scope)}</p>
    ${attachHTML("hs-review", { t, esc, collapsible: true, summary: t("补充信息（可选）：自己写几句、拍照或上传文件"), textLabel: t("补充说明"), ph: t("例：最近晚上总说怕黑；老师说上课坐不住；医生建议多吃含铁的食物…"), hint: t("会和记录一起发给 AI 参考，比如成绩单、医生的单子、孩子的画、你观察到的变化。照片不保存。") })}
    ${a ? resultHTML(a) : ""}
    <div class="btns" style="margin-top:6px">${btn}</div>
    <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("发给你自己设置的 AI：年龄、性别和上面说的记录摘要，不发名字。只是建议，不是诊断；身体的问题以儿科医生为准。") : t("还没填 API key：在 我的 → 咩咩咩 里设置")}</p></details>`;
}
const ul = (cls, mark, arr) => (arr && arr.length ? `<ul class="gr-rv-ul ${cls}">${arr.map(x => `<li><span aria-hidden="true">${mark}</span> ${esc(x)}</li>`).join("")}</ul>` : "");
function resultHTML(a){
  const pri = a.priorities && a.priorities.length ? `<b class="gr-rv-h">${t("最值得加强的")}</b><ol class="gr-rv-pri">${a.priorities.map(p => { const [ic, l] = AREA[p.area] || AREA.mind;
    return `<li><span class="gr-rv-ic" aria-hidden="true">${ic}</span><div><span class="gr-rv-ft"><b>${esc(p.title)}</b><span class="pill lv">${t(l)}</span></span>${p.why ? `<small class="muted">${esc(p.why)}</small>` : ""}${p.action ? `<span class="gr-rv-do">→ ${esc(p.action)}</span>` : ""}</div></li>`; }).join("")}</ol>` : "";
  const boxes = Object.keys(AREA).map(k => { const x = a[k]; if (!x || !(x.good.length || x.improve.length || x.actions.length)) return ""; const [ic, l] = AREA[k];
    return `<div class="gr-rv-box"><b>${ic} ${t(l)}</b>${ul("good", "✓", x.good)}${ul("imp", "↗", x.improve)}${ul("do", "→", x.actions)}</div>`; }).join("");
  const extra = [a.doctor && a.doctor.length ? `<div class="gr-rv-box"><b>🩺 ${t("问儿科医生")}</b>${ul("", "•", a.doctor)}</div>` : "", a.parents && a.parents.length ? `<div class="gr-rv-box"><b>🤝 ${t("家长可以怎么配合")}</b>${ul("", "•", a.parents)}</div>` : ""].join("");
  return `${a.summary ? `<p class="gr-rv-sum">${esc(a.summary)}</p>` : ""}${pri}${boxes || extra ? `<div class="gr-rv-grid">${boxes}${extra}</div>` : ""}`;
}

async function run(){
  const m = R.mode, cid = S.childId;
  if (!aiReady()) { toast(t("还没填 API key：在 我的 → 咩咩咩 里设置")); return; }
  if (!B.loaded) { toast(t("记录还在读取，稍等几秒再试")); return; }
  let ok = false; try { ok = localStorage.getItem(AI_OK) === "1"; } catch (e) {}
  if (!ok) { if (!confirm(t("会把孩子的年龄、性别，以及身体、日常、学习、敬拜记录的摘要发给你自己设置的 AI 服务商（不发名字）。继续吗？"))) return; try { localStorage.setItem(AI_OK, "1"); } catch (e) {} }
  R.busy = m + "|" + cid; R.open = true; render();
  try {
    const { input, spirit } = await gather(m);
    const extra = attachPayload("hs-review");   // 补充信息：手动写的话、照片、PDF、文字文件（js/attach.js）
    if (extra.text) input.parent_notes = extra.text.slice(0, 6000);
    if (!hasInput(m, input) && !extra.text && !extra.images.length) throw new Error(t("这个范围还没有记录可以分析"));
    const o = parseReview(await askText(REVIEW_SYSTEM(lang(), m, { spirit }), JSON.stringify(input), { json: true, maxTokens: 3500, images: extra.images }), { spirit });
    if (!o) throw new Error(t("AI 返回的格式不对，再试一次"));
    const all = { ...((S.hs.settings || {}).aiReview || {}) };
    all[cid] = { ...(all[cid] || {}), [m]: { ...o, at: new Date().toISOString(), watch: m === "watch" ? input.items.length : undefined } };
    await saveSettings({ aiReview: all });
    toast(t("分析好了"));
  } catch (e) { toast(t("分析失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { R.busy = null; render(); }
}
/** 面板上的动作（growth.js 的 growthAct 交过来） */
async function reviewAct(act, btn){
  switch (act) {
    case "gr-rv-mode": R.mode = btn.dataset.v; R.open = true; render(); return true;
    case "gr-rv-run": await run(); return true;
  }
  return false;
}
document.addEventListener("toggle", ev => { if (ev.target && ev.target.classList && ev.target.classList.contains("gr-rv")) R.open = ev.target.open; }, true);
export { reviewHTML, reviewAct };
