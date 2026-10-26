/* ============ 咩咩咩 · 在家教育的 AI 问询页 ============
   和爱家小助手的「咩咩咩」同一套思路：有 key（填在本页的「AI 设置」里，只存本机）就直接出答案；没 key 就把问题连同孩子
   最近的学习情况拼成提示词，一键复制到任一 AI。场景 chips 各带一句默认问题和对应的上下文摘要。
   发出去的只有统计和计划信息：年龄与阶段、今日任务（领域、分钟、完成几项）、近一周完成率、经文背诵进度、今天的读经段落。
   不含孩子姓名（一律写「孩子」）、不含备注和任务里的自由文本。调用层在 js/ai.js（复制自牧羊人）。 */
import { PROVIDERS, aiReady, aiSettings, askText, providerOf, saveAiSettings, testAi } from "./ai.js";
import { t, locale } from "./core/i18n.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { D, dayKey, esc, toast } from "./core/util.js";
import { subject } from "./data/subjects.js";
import { devotionDraft, dueReviews, isOffDay, learnedCount, learningCards, routine, scripture, tasksFor, todayPassage, todayPlan } from "./hs.js";
import { render } from "./views.js";

/** 咩咩图标：一只白绒绒的小羊咩咩，额头上一枚珊瑚红的字母 Y（四个应用同一只；颜色固定，深浅色主题下都一样），随文字大小缩放 */
const aiIcon = (size = 22) => `<svg class="ai-ico" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <ellipse cx="9" cy="37" rx="8.5" ry="4.6" transform="rotate(-24 9 37)" fill="#F6D5C3" stroke="#2C3A4B" stroke-width="2.6"/>
  <ellipse cx="55" cy="37" rx="8.5" ry="4.6" transform="rotate(24 55 37)" fill="#F6D5C3" stroke="#2C3A4B" stroke-width="2.6"/>
  <g fill="#fff" stroke="#2C3A4B" stroke-width="2.6"><circle cx="32" cy="14" r="10.5"/><circle cx="19" cy="20" r="8.5"/><circle cx="45" cy="20" r="8.5"/><circle cx="13" cy="31" r="7.5"/><circle cx="51" cy="31" r="7.5"/><circle cx="16" cy="43" r="7"/><circle cx="48" cy="43" r="7"/><circle cx="24" cy="51" r="7"/><circle cx="40" cy="51" r="7"/><circle cx="32" cy="53" r="7"/><circle cx="32" cy="32" r="17"/></g><g fill="#fff"><circle cx="32" cy="14" r="10.5"/><circle cx="19" cy="20" r="8.5"/><circle cx="45" cy="20" r="8.5"/><circle cx="13" cy="31" r="7.5"/><circle cx="51" cy="31" r="7.5"/><circle cx="16" cy="43" r="7"/><circle cx="48" cy="43" r="7"/><circle cx="24" cy="51" r="7"/><circle cx="40" cy="51" r="7"/><circle cx="32" cy="53" r="7"/><circle cx="32" cy="32" r="17"/></g>
  <ellipse cx="32" cy="41" rx="13" ry="12" fill="#F6D5C3" stroke="#2C3A4B" stroke-width="2.4"/>
  <circle cx="27" cy="39.5" r="2.1" fill="#2C3A4B"/><circle cx="37" cy="39.5" r="2.1" fill="#2C3A4B"/>
  <path d="M32 44.5v1.6M29.3 48q2.7 2.4 5.4 0" fill="none" stroke="#2C3A4B" stroke-width="1.9" stroke-linecap="round"/>
  <circle cx="23.2" cy="44.5" r="1.9" fill="#F4A3B1" opacity=".9"/><circle cx="40.8" cy="44.5" r="1.9" fill="#F4A3B1" opacity=".9"/>
  <path d="M25.5 11.5l6.5 8 6.5-8M32 19.5v9" fill="none" stroke="#D9655F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const st = () => (S.ask ||= { q: "", busy: false, answer: null, error: null, withContext: true, cfg: false, draft: null, extra: "", extraName: "", mode: "", ctxKeys: null });

/* ---- 场景：一句默认问题 + 要带上的上下文块 ---- */
const TOPICS = [
  { id: "today", icon: "📅", name: "今天的课怎么调", q: "看看孩子今天的任务和已经完成的部分，剩下的时间怎么安排更合适？哪些可以合并、顺延或缩短？", ctx: ["child", "today", "week"] },
  { id: "verse", icon: "📖", name: "背经文的方法", q: "孩子正在背这些经文，按他的年龄，有什么好用的背诵和复习方法？怎么让复习不枯燥？", ctx: ["child", "scripture"] },
  { id: "focus", icon: "🧸", name: "孩子不配合、坐不住", q: "孩子最近上课不太配合、注意力不集中。结合他的年龄和最近一周的完成情况，我可以怎么调整节奏和方式？", ctx: ["child", "today", "week"] },
  { id: "stuck", icon: "🧩", name: "某一科卡住了", q: "从最近一周各科的完成情况看，哪一科明显落后？可能是什么原因，怎么换个方法或降低难度？", ctx: ["child", "week", "subjects"] },
  { id: "devotion", icon: "🕊", name: "带领家庭敬拜", q: "今天家庭敬拜要读这段经文，给这个年龄的孩子，怎么讲、问什么问题、做什么小活动？", ctx: ["child", "devotion"] },
  { id: "review", icon: "📈", name: "本周回顾与下周计划", q: "根据这周每天的完成情况和各科时长，帮我做一个简短的回顾，并给下周的安排提两三条建议。", ctx: ["child", "week", "subjects"] },
  { id: "pace", icon: "🌿", name: "节奏与休息", q: "孩子每天的课时量和连续上课的天数是否合适？这个年龄一天学多久、怎么安排休息比较好？", ctx: ["child", "week"] },
];
// 可直接打开的 AI 网页（手机上是通用链接，装了 App 会拉起 App）
const AI_SITES = [
  ["ChatGPT", "https://chatgpt.com/"], ["DeepSeek", "https://chat.deepseek.com/"], ["Claude", "https://claude.ai/new"],
  ["豆包", "https://www.doubao.com/chat/"], ["通义千问", "https://www.tongyi.com/"], ["Kimi", "https://www.kimi.com/"], ["Gemini", "https://gemini.google.com/app"],
];

/* ---- 上下文：只有统计和计划，不带姓名、备注 ---- */
const minutesOf = x => { const r = x.routine_id && routine(x.routine_id); return +x.minutes || (r && +r.minutes) || 0; };
function ctxChild(){ return `孩子 ${ageText()}，${stageOf().name}阶段。`; }
function ctxToday(){
  const day = dayKey(Date.now()), list = tasksFor(day, S.childId), now = new Date();
  if (!list.length) return `今天（${day}）没有安排任务${isOffDay(day) ? "，是休息日" : ""}。现在 ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}。`;
  const done = list.filter(x => x.status === "done"), left = list.filter(x => x.status === "todo");
  const line = x => `${subject(x.subject).short}${minutesOf(x) ? ` ${minutesOf(x)} 分钟` : ""}（${x.status === "done" ? "已完成" : x.status === "skip" ? "跳过" : "未做"}）`;
  return `今天（${day}）安排 ${list.length} 项：${list.map(line).join("、")}。已完成 ${done.length} 项，还剩 ${left.length} 项约 ${left.reduce((a, x) => a + minutesOf(x), 0)} 分钟。现在 ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}。`;
}
function weekStats(){
  const today = dayKey(Date.now()), from = dayKey(Date.now() - 6 * D), cid = S.childId;
  const tasks = (S.hs.tasks || []).filter(x => x.date >= from && x.date <= today && (x.child_id == null || x.child_id === cid));
  const by = {}; const days = {};
  for (const x of tasks) {
    const b = by[x.subject] ||= { done: 0, skip: 0, missed: 0, min: 0 }, d = days[x.date] ||= { done: 0, total: 0 };
    d.total++;
    if (x.status === "done") { b.done++; b.min += minutesOf(x); d.done++; } else if (x.status === "skip") b.skip++; else if (x.date < today) b.missed++;
  }
  const dayList = Object.keys(days).sort();
  // 连续上课天数：从今天往回数，有任务且不是休息日
  let streak = 0; for (let i = 0; i < 14; i++) { const d = dayKey(Date.now() - i * D); if (isOffDay(d)) continue; if (days[d]) streak++; else if (d !== today) break; }
  const total = tasks.length, done = tasks.filter(x => x.status === "done").length, minutes = tasks.filter(x => x.status === "done").reduce((a, x) => a + minutesOf(x), 0);
  return { by, days, dayList, streak, total, done, minutes };
}
function ctxWeek(){
  const w = weekStats();
  if (!w.total) return "最近一周没有任务记录。";
  const perDay = w.dayList.map(d => `${d.slice(5)} ${w.days[d].done}/${w.days[d].total}`).join("，");
  return `最近一周（含今天）共 ${w.total} 项任务，完成 ${w.done} 项（${Math.round(w.done / w.total * 100)}%），学习约 ${w.minutes} 分钟，有学习的日子平均 ${Math.round(w.minutes / Math.max(1, w.dayList.length))} 分钟；每天完成情况：${perDay}。连续上课 ${w.streak} 天。`;
}
function ctxSubjects(){
  const w = weekStats(); const rows = Object.entries(w.by);
  if (!rows.length) return "";
  return "最近一周各科：" + rows.map(([k, b]) => `${subject(k).label} 完成 ${b.done} 次${b.skip ? `、跳过 ${b.skip}` : ""}${b.missed ? `、漏做 ${b.missed}` : ""}${b.min ? `、约 ${b.min} 分钟` : ""}`).join("；") + "。";
}
function ctxScripture(){
  const cid = S.childId, plan = todayPlan(cid), learning = learningCards(cid).map(x => x.s.ref), due = dueReviews(cid).length;
  const wv = S.hs.settings.weekVerse ? scripture(S.hs.settings.weekVerse) : null;
  const parts = [`已会背 ${learnedCount(cid)} 节`];
  if (learning.length) parts.push(`正在背：${learning.slice(0, 5).join("、")}${learning.length > 5 ? ` 等 ${learning.length} 节` : ""}`);
  parts.push(`今天安排 ${plan.total} 节（新学 ${plan.rows.filter(x => x.kind === "learn").length}，复习 ${plan.rows.filter(x => x.kind === "review").length}），已做 ${plan.done}`);
  if (due) parts.push(`到期待复习 ${due} 节`);
  if (plan.backlog) parts.push(`复习积压 ${plan.backlog.queued} 节，最久拖了 ${plan.backlog.oldest} 天`);
  if (wv) parts.push(`本周经文：${wv.ref}`);
  return `经文背诵：${parts.join("；")}。复习按 3、7、30、90、180 天的间隔自动安排。`;
}
function ctxDevotion(){
  const d = devotionDraft(), tp = todayPassage();
  const ref = d.passage || (tp ? tp.ref : "");
  return ref ? `今天家庭敬拜的读经段落：${ref}${tp && tp.note && !d.passage ? `（${tp.note}）` : ""}${d.done ? "，今天已经敬拜过了" : ""}。` : "今天还没选读经段落。";
}
const CTX = { child: ctxChild, today: ctxToday, week: ctxWeek, subjects: ctxSubjects, scripture: ctxScripture, devotion: ctxDevotion };
const loaded = () => !!(S.hs && S.hs.loaded && S.childId);   // 没登录 / 没孩子：问题照问，只是不带学习情况
function contextText(keys){ if (!loaded()) return ""; return keys.map(k => CTX[k] && CTX[k]()).filter(Boolean).join("\n"); }
// 哪个场景的问题就带哪些块；自己写的问题带全部
function ctxFor(q){ const a = st(); if (a.ctxKeys) return a.ctxKeys; const tp = TOPICS.find(x => t(x.q) === q || x.q === q); return tp ? tp.ctx : Object.keys(CTX); }

const answerLang = () => ({ en: "English", "zh-TW": "繁體中文" })[locale()] || "简体中文";
/* 从定制流程（睡前安然、冲突管理、趋势）带着记录来问：系统提示换成「家庭教养顾问」，附带的记录摘要放在 st().extra 里 */
function familySystem(){
  return `你是一位温和、谨慎的儿童发展与家庭教养顾问，服务基督徒家庭，认同「安抚多过刑罚，不等于不管教：安抚是为了恢复孩子的安全感，管教是为了帮助孩子学习正确的行为」。用${answerLang()}回答家长。
依据孩子的年龄段和下面给出的记录（孩子和大人两方面都要看），按这个顺序回答，每部分 1–3 句，总共 350 字（英文 250 词）以内：
1. 可能的原因（结合年龄，不贴标签）；
2. 对已经试过的做法的评价：哪些值得继续、哪些可以调整；
3. 接下来可以试的 2–3 条具体做法，和一句可以对孩子说的话；
4. 给家长自己的一句提醒（包括大人当时的状态，必要时提到换人接手、事后向孩子道歉修复）。
不建议体罚、羞辱、威胁或制造恐惧；不做诊断；涉及安全、持续而严重的情况，建议找儿科医生或儿童心理专业人员。只在有依据时引用给出的数据。`;
}
function systemPrompt(){
  if (st().mode === "family") return familySystem();
  return `你是一位谨慎、温和的在家教育（homeschool）顾问，用${answerLang()}回答家长。
依据孩子的年龄和下面给出的学习情况，给出具体、可操作的建议；尊重家长的判断，不下结论、不贴标签。
控制在 250 字（英文 180 词）以内，分 2–4 个短段落或要点；只在确有依据时引用给出的数据。
如果问题超出教育范畴（医疗、心理诊断等），提醒家长咨询专业人士。`;
}
function userPrompt(q, withContext){ const a = st(), c = withContext ? [contextText(ctxFor(q)), a.extra].filter(Boolean).join("\n") : ""; return c ? `${c}\n\n问题：${q}` : q; }
const promptText = (q, withContext) => `${systemPrompt()}\n\n${userPrompt(q, withContext)}`;

/* ---- 页面 ---- */
function renderAnswer(text){
  const lines = esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split("\n");
  let out = "", list = null;
  const flush = () => { if (list) { out += `<${list.tag}>${list.items.map(x => `<li>${x}</li>`).join("")}</${list.tag}>`; list = null; } };
  for (const ln of lines) {
    const m = ln.match(/^\s*(?:[-*•]|(\d+)[.、)])\s+(.*)$/);
    if (m) { const tag = m[1] ? "ol" : "ul"; if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; } list.items.push(m[2]); continue; }
    flush();
    if (ln.trim()) out += /^#+\s/.test(ln) ? `<h4>${ln.replace(/^#+\s/, "")}</h4>` : `<p>${ln}</p>`;
  }
  flush();
  return `<div class="ai-text">${out}</div>`;
}
/* 页面版式完全照小月亮 js/ask.js：场景 chips → 一个面板（输入框、勾选、按钮，点「换模型 / 填 API key」才在面板里展开 AI 设置）→ 回答 → 「会发送什么」折叠块。 */
function cfgHTML(){
  const a = st(), d = a.draft, p = providerOf(d.provider), s = aiSettings(), own = !s.borrowed && !!s.key;
  return `<div class="ai-cfg">
    <div class="lab">${t("服务商")}</div>
    <div class="chips" style="margin-top:4px">${PROVIDERS.map(x => `<button type="button" class="chip" data-act="ask-prov" data-v="${x.id}" aria-pressed="${d.provider === x.id}">${esc(t(x.name))}</button>`).join("")}</div>
    <p class="small muted" style="margin:0">${esc(t(p.hint || ""))}${p.signup ? ` <a href="${p.signup}" target="_blank" rel="noopener">${t("去申请 key")}</a>` : ""}</p>
    ${s.borrowed && !d.key ? `<p class="small muted">${t("现在沿用的是爱家小助手里填的 key；在这里填一个就改用自己的。")}</p>` : ""}
    <label class="small muted" for="askKey">API key</label><input id="askKey" type="password" autocomplete="off" value="${esc(d.key || "")}" placeholder="${t("只存在这台设备的浏览器里")}">
    <label class="small muted" for="askModel">${t("模型（留空用默认 {m}）", { m: p.model || "" })}</label><input id="askModel" type="text" autocomplete="off" value="${esc(d.model || "")}">
    ${p.id === "custom" ? `<label class="small muted" for="askBase">${t("接口地址（到 /v1 为止）")}</label><input id="askBase" type="url" autocomplete="off" value="${esc(d.base || "")}" placeholder="https://…/v1">` : ""}
    <div class="btns"><button type="button" class="btn primary" data-act="ask-save">${t("保存")}</button><button type="button" class="btn" data-act="ask-test">${t("测试连接")}</button>${own ? `<button type="button" class="btn" data-act="ask-clear">${t("清除 key")}</button>` : ""}<button type="button" class="btn" data-act="ask-cfg">${t("收起")}</button></div></div>`;
}
function viewAsk(){
  const a = st(), ready = aiReady();
  const topics = TOPICS.map(x => `<button type="button" class="chip" data-act="ask-topic" data-topic="${x.id}" aria-pressed="${a.q === t(x.q)}">${x.icon} ${t(x.name)}</button>`).join("");
  const sites = AI_SITES.map(([n, u]) => `<a class="chip" href="${u}" target="_blank" rel="noopener noreferrer">${t("打开{n}", { n: t(n) })}</a>`).join("");
  const sent = a.withContext ? [loaded() ? contextText(ctxFor(a.q)) : "", a.extra].filter(Boolean).join("\n") : "";
  return `<h2>${aiIcon(26)} ${t("咩咩咩")} <span class="small muted" style="font-family:var(--f-body);font-weight:400">${loaded() ? `${esc(childName())} · ${esc(ageText())}` : t("登录并进入家庭后，回答会结合孩子的学习情况")}</span></h2>
  <p class="small muted">${ready ? t("问孩子在家教育里的任何事：今天的课怎么调、经文怎么背、孩子不配合怎么办。会附上孩子的年龄、今日任务、近一周完成情况和背诵进度（不含备注和姓名），答案就在下面出现。") : t("还没填 API key：点「复制提示词」，会把问题连同孩子最近的学习情况一起复制，打开任一 AI 粘贴即可；也可以点「填 API key」，直接在这里出答案。")}</p>
  <div class="chips" role="group" aria-label="${t("常见场景")}">${topics}</div>
  ${a.extra ? `<div class="alert info ask-extra"><span>${t("已附带：{n}（点下面「会发送什么」看原文）", { n: esc(a.extraName || t("定制流程的记录摘要")) })}</span> <button type="button" class="chip" data-act="ask-extra-clear">${t("不带这个")}</button></div>` : ""}
  <form id="askForm" class="panel ask" onsubmit="return false">
    <textarea name="q" rows="3" maxlength="1000" placeholder="${t("例如：数学连续两周都没做完，是不是排多了？")}">${esc(a.q)}</textarea>
    <label class="chk" ${loaded() ? "" : "hidden"}><input type="checkbox" name="ctx" ${a.withContext ? "checked" : ""}> <span class="small">${a.extra ? t("附带孩子最近的情况和上面的记录摘要（含你写的处理办法，不含姓名和备注）") : t("附带孩子最近的学习情况（只有统计和计划，不含姓名和备注）")}</span></label>
    <div class="btns">${ready ? `<button type="submit" class="btn primary" data-act="ask-send" ${a.busy ? "disabled" : ""}>${a.busy ? t("思考中…") : t("发送")}</button>` : ""}
      <button type="button" class="btn ${ready ? "" : "primary"}" data-act="ask-copy">${t("复制提示词")}</button>
      <button type="button" class="btn" data-act="ask-cfg">${ready ? t("换模型") : t("填 API key")}</button></div>
    ${a.error ? `<p class="small" role="alert" style="color:var(--rose);margin:8px 0 0">${esc(a.error)}</p>` : ""}
    ${a.cfg ? cfgHTML() : ""}
  </form>
  ${ready ? "" : `<div class="panel"><p class="small muted" style="margin:0 0 8px">${t("复制后打开任一 AI 粘贴（手机上会直接打开已安装的 App）：")}</p><div class="ai-sites">${sites}</div></div>`}
  ${a.answer ? `<div class="panel ai-answer"><div class="ai-head">${aiIcon(20)} <b>${t("咩咩的回答")}</b><button type="button" class="chip" data-act="ask-copy-answer">${t("复制")}</button></div>${renderAnswer(a.answer)}
    <p class="small muted" style="margin:8px 0 0">${t("AI 回答仅供参考，教育与孩子的具体情况请以家长判断为准。")}</p></div>` : ""}
  <details class="more"><summary>${t("会发送什么")}<span class="small muted">${t("学习情况摘要原文")}</span></summary><div class="panel"><pre class="ai-ctx">${esc(sent || (loaded() ? t("没勾选「附带孩子最近的学习情况」：只发送你写的问题。") : t("还没登录：只发送你写的问题。")))}</pre></div></details>`;
}

/* ---- 动作 ---- */
const form = () => document.getElementById("askForm");
function readInputs(){
  const f = form(), a = st();
  if (f) { a.q = f.elements.q.value.trim(); a.withContext = f.elements.ctx.checked; }
  if (a.draft) { const v = id => (document.getElementById(id) || {}).value; const k = v("askKey"), m = v("askModel"), b = v("askBase"); if (k != null) a.draft.key = k.trim(); if (m != null) a.draft.model = m.trim(); if (b != null) a.draft.base = b.trim(); }
}
async function askAct(act, el){
  const a = st(); readInputs();
  switch (act) {
    case "ask-topic": { const tp = TOPICS.find(x => x.id === el.dataset.topic); if (tp) { a.q = t(tp.q); a.answer = null; a.error = null; a.extra = ""; a.extraName = ""; a.mode = ""; a.ctxKeys = null; } render(); break; }
    case "ask-extra-clear": a.extra = ""; a.extraName = ""; a.mode = ""; a.ctxKeys = null; render(); break;
    case "ask-send": {
      if (!a.q) { a.error = t("先写一句要问的"); render(); break; }
      a.busy = true; a.error = null; render();
      try { a.answer = await askText(systemPrompt(), userPrompt(a.q, a.withContext), { maxTokens: 1500, temperature: 0.4 }); }
      catch (e) { a.error = e.message; }
      finally { a.busy = false; render(); }
      break; }
    case "ask-copy": {
      if (!a.q) { toast(t("先写一句要问的")); break; }
      const text = promptText(a.q, a.withContext);
      try { await navigator.clipboard.writeText(text); toast(t("提示词已复制，打开任一 AI 粘贴即可")); } catch (e) { window.prompt(t("复制下面的提示词"), text); }
      break; }
    case "ask-copy-answer": if (a.answer) { try { await navigator.clipboard.writeText(a.answer); toast(t("已复制")); } catch (e) { /* 忽略 */ } } break;
    case "ask-cfg": { a.cfg = !a.cfg; if (a.cfg && !a.draft) { const s = aiSettings(); a.draft = { provider: s.provider, key: s.borrowed ? "" : s.key || "", model: s.model || "", base: s.base || "" }; } if (!a.cfg) a.draft = null; render(); break; }
    case "ask-prov": if (a.draft) { a.draft.provider = el.dataset.v; render(); } break;
    case "ask-save": { if (!a.draft) break; if (!a.draft.key && !aiSettings().borrowed) { toast(t("请填 API key")); break; } saveAiSettings(a.draft); a.cfg = false; a.draft = null; toast(t("已保存")); render(); break; }
    case "ask-test": { if (!a.draft) break; if (!a.draft.key && !aiSettings().borrowed) { toast(t("请填 API key")); break; } if (a.draft.key) saveAiSettings(a.draft); el.disabled = true;
      try { await testAi(); toast(t("连接成功 ✓")); } catch (e) { toast(String(e.message || e).slice(0, 160)); } render(); break; }
    case "ask-clear": { const s = aiSettings(); saveAiSettings({ provider: s.provider, key: "", model: "", base: "" }); a.draft = a.draft ? { ...a.draft, key: "" } : null; toast(t("已清除")); render(); break; }
    default: return false;
  }
  return true;
}

/** 带着记录来问：q 是预填的问题，extra 是记录摘要（会随提问一起发送，页面上能看到原文），from 是返回的上一层页签 */
function askAbout({ q, extra, name, from }){
  const a = st(); Object.assign(a, { q, extra: extra || "", extraName: name || "", mode: "family", ctxKeys: [], answer: null, error: null, withContext: true });
  (S.from ||= {}).ask = from || "flows"; S.tab = "ask"; render(); window.scrollTo(0, 0);
}

export { viewAsk, askAct, askAbout, aiIcon, TOPICS };
