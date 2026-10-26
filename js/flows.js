import { aiReady, askText } from "./ai.js";
import { askAbout } from "./ask.js";
import { t, tc } from "./core/i18n.js";
import { S, ageText, childName } from "./core/state.js";
import { D, dayKey, esc, newId, toast } from "./core/util.js";
import { parseRef } from "./data/bible.js";
import { OUTCOMES, PRINCIPLES } from "./data/bedtime.js";
import { BANDS, BAND_NAME, BL_KINDS, FLOWS, SIDES, STAGE_NAME, contentFor, relOf } from "./data/flows.js";
import { EMOTIONS } from "./data/emotions.js";
import { activeSteps, cfg, deleteEvent, ensureVerse, h2, isCf, isEm, kidName, kids, lastLog, migrateHTML, offlineHTML, outcomeLabel, retryVerse, saveCfg, saveEvent, scheduleRender, sidesHint, sidesLine, sitStats, totalMin, verseError, verseText } from "./bedtime.js";
import { B, allConflicts, bandKey, blStats, flowContext, genderOf, hasBl, hubAskHTML, mineRows, pull, pullButtonHTML, sitOf } from "./flows-trend.js";
import { saveSettings } from "./hs.js";
import { mrow } from "./me.js";
import { angerHTML } from "./principle.js";
import { recordsHTML } from "./recfilter.js";
import { closeSheet, drawForm, getForm, openForm, readForm } from "./sheet.js";
import { render } from "./views.js";

/* ============ 定制流程（资源页下的一层）：睡前安然 + 冲突管理 + 情绪管理 + 趋势与分析 + 以后补充的流程 ============
   冲突管理 = 一件事发生了，当场怎么处理（打人、抢东西、顶嘴、排挤……，也能自己加）；
   情绪管理 = 一种持续的情绪、态度或习惯，平时怎么陪伴（嫉妒、焦虑、厌学、屏幕、成瘾、时事、青春期）。两边内容不重复，有关联的互相指一下。
   两页用同一套「话题卡」：按孩子的年龄段（2 岁前 / 2–3 / 3–5 / 5–8 / 9–12 / 13 岁起）把这个年龄段常见的放前面，较少见的折叠起来；
   做法、怎么说也按年龄段换（比如 6 岁已经很少咬人，所以「咬人」折叠到「较少见」里）；设置里选了性别的，再显示一句性别相关的提示。
   每张卡：解释、做法、怎么说、不要、经文全文（中英文）、何时找专业人员、小月亮里的表现、「不管用？问一问咩咩咩」。

   记录怎么回填（冲突管理；两个方向，规则很简单）：
   ① 家庭学堂 → 小月亮（自动）：在这里「记一笔」时，同时往小月亮写一条「情绪行为」（每个参加的孩子一条），不用再到小月亮手动记。
      小月亮那条的 id 固定（hscf-记录id-孩子id），所以在这里改这笔会更新它、删这笔会把它标成已删，不会重复。可在页面上关掉。
   ② 小月亮 → 家庭学堂（只读，不回写）：这里读小月亮已有的记录（包括你在小月亮手动记的）来显示次数和趋势；读到的不会再写回去，也不会复制一份。
      默认自动：每次打开这几页，先在后台拉一次，按钮灰色；拉完提示「已同步最新小月亮记录」；停在页面上、小月亮那边又有新记录时，点按钮再拉。
   补记：过去的日子也能补，小月亮那条的时间落在那天中午。情绪管理的记录只存在家庭学堂，不写进小月亮（小月亮里的「情绪」是孩子自己记的）。 */
const cfEvents = () => S.bt.events.filter(isCf);
const emEvents = () => S.bt.events.filter(isEm);
const trendText = (a, b) => a > b ? `<span class="bt-up">▲ ${t("比上个 30 天多 {n}", { n: a - b })}</span>` : a < b ? `<span class="bt-down">▼ ${t("比上个 30 天少 {n}", { n: b - a })}</span>` : `<span class="muted">${t("和上个 30 天一样")}</span>`;
const BLK = ["发脾气", "哭闹", "分离焦虑", "害怕", "打人/咬人", "分享合作", "开心"];
const genderName = g => g === "f" ? t("女孩") : g === "m" ? t("男孩") : "";

/* ============ 定制流程：入口页 ============ */
function viewFlows(){
  const c = cfg(), last = lastLog(), today = dayKey(Date.now()), d30 = dayKey(Date.now() - 29 * D);
  const n30 = cfEvents().filter(e => e.date >= d30).length, m30 = emEvents().filter(e => e.date >= d30).length, logs30 = S.bt.logs.filter(l => l.date >= d30).length;
  const desc = {
    bedtime: `${t("{n} 步 · 约 {m} 分钟", { n: activeSteps(c).length, m: totalMin(c) })} · ${!last ? t("还没做过") : last.date === today ? t("今晚已完成 · {n} 分钟", { n: last.actual_min }) : t("上次 {d} · {n} 分钟", { d: last.date, n: last.actual_min })}`,
    conflict: n30 ? t("{k} 种状况 · 近 30 天记了 {n} 次", { k: allConflicts(c).length, n: n30 }) : t("{k} 种状况：打人、抢东西、顶嘴、排挤……按孩子的年龄段看，也能自己加", { k: allConflicts(c).length }),
    emotion: m30 ? t("{k} 个话题 · 近 30 天记了 {n} 次", { k: EMOTIONS.length, n: m30 }) : t("{k} 个话题：嫉妒、焦虑、厌学、屏幕、成瘾、时事、青春期", { k: EMOTIONS.length }),
    trend: t("近 30 天：睡前 {a} 晚 · 冲突 {b} 次；入睡时间、大人和孩子的状态", { a: logs30, b: n30 })
  };
  return `${h2(t("定制流程"))}
  <p class="small muted">${t("把家里反复出现的情境做成「流程 + 模板 + 记录」：事先想好怎么做、怎么说，当场照着做，事后记一笔，过几周回头看哪些做法值得继续。每个流程是下面的一个子层级，以后会陆续补充。")}</p>
  ${hubAskHTML()}
  <div class="panel mlist" style="margin-top:10px">${FLOWS.map(f => mrow(`data-tab="${f.tab}"`, t(f.name), desc[f.id] || esc(tc(f.desc)), f.icon)).join("")}</div>`;
}

/* ============ 话题卡 ============ */
/* 引用经文：中英文全文都抓（按设置里的抓取译本），存在本机；抓失败的记住原因、10 分钟内不重试，行内有「再试」 */
function verseBlock(ref){
  if (!ref || !parseRef(ref)) return ref ? `<p class="small muted" style="margin:4px 0 0">${t("经文")}：${esc(tc(ref))}</p>` : "";
  const rows = ["zh", "en"].map(l => {
    const v = verseText(ref, l); if (v) return `<p class="cf-verse">${esc(v.text)} <span class="small muted">（${esc(v.version)}）</span></p>`;
    const err = verseError(ref, l); if (err) return `<p class="small" style="color:var(--rose);margin:2px 0">${l === "en" ? "EN" : "中"}：${t("没抓到")}（${esc(err)}） <button class="chip" data-act="cf-verse-retry" data-ref="${esc(ref)}">${t("再试")}</button></p>`;
    ensureVerse(ref, l).then(r => { if (r) scheduleRender(); });
    return `<p class="small muted" style="margin:2px 0">${navigator.onLine ? t("正在抓取经文…") : t("离线，还没抓到这段")}</p>`;
  }).join("");
  return `<div class="cf-verse-box"><div class="small"><b>${t("经文")} · ${esc(tc(ref))}</b></div>${rows}</div>`;
}
const tableHTML = tb => `<div class="scroll-x" style="margin-top:8px"><table class="cf-table"><thead><tr>${tb.head.map(h => `<th>${esc(tc(h))}</th>`).join("")}</tr></thead><tbody>${tb.rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? " class=\"cf-k\"" : ""}>${esc(tc(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

function topicCard(s, band){
  const x = contentFor(s, band), bl = hasBl(s) ? blStats(s) : null, mine = sitStats(s.id), keep = mine.keep, g = genderOf();
  const em = s.id.startsWith("em-"), others = BANDS.filter(b => b !== band && s.why && s.why[b]);
  const gtext = s.gender && g && s.gender[g];
  const blLine = !bl ? "" : B.loaded
    ? (s.bl.minutes ? (bl.cur || bl.prev ? `<b>${t("小月亮里")}</b>：${t("近 30 天屏幕共 {a} 分钟，日均 {b} 分钟", { a: bl.sumMin, b: bl.dayAvg })} ${trendText(bl.sumMin, bl.prevSum)}` : `<span class="muted">${t("小月亮里近 60 天没有屏幕记录（在小月亮「活动 → 屏幕」记）")}</span>`)
      : (bl.cur || bl.prev ? `<b>${t("小月亮里")}</b>：${s.bl.good ? t("近 30 天记了 {n} 次分享合作", { n: bl.cur }) : t("近 30 天 {n} 次", { n: bl.cur })} ${trendText(bl.cur, bl.prev)}${bl.avgMin != null ? ` · ${t("平均 {n} 分钟", { n: bl.avgMin })}` : ""}${bl.how.length ? `<br>${t("家里记过的处理办法")}：${esc(bl.how.join("；"))}` : ""}` : `<span class="muted">${t("小月亮里近 60 天没有相关记录")}</span>`))
    : `<span class="muted">${B.loading ? t("正在同步小月亮…") : B.err ? t("读不到小月亮的记录") : ""}</span>`;
  return `<div class="panel bt-sit"><div class="bt-card-row"><div><b>${esc(tc(s.when))}</b>${s.only && !g ? ` <span class="pill lv">${s.only === "f" ? t("女孩") : t("男孩")}</span>` : ""}${s.custom ? ` <span class="pill lv">${t("自家")}</span>` : ""}<div class="small muted">${esc(tc(s.short || ""))}</div></div><button class="btn primary sm" data-act="cf-ev-add" data-kind="${em ? "em" : "cf"}" data-sit="${esc(s.id)}">${t("记一笔")}</button></div>
    ${x.why ? `<p class="cf-why"><b>${esc(childName())} · ${esc(ageText())}（${esc(BAND_NAME[band])}）</b><br>${esc(tc(x.why))}</p>` : ""}
    ${gtext ? `<p class="small" style="margin:4px 0"><b>${genderName(g)}</b>：${esc(tc(gtext))}</p>` : ""}
    ${others.length ? `<details class="cf-others"><summary class="small muted">${t("其他年龄段怎么看")}</summary>${others.map(k => `<p class="small"><b>${esc(BAND_NAME[k])}</b>　${esc(tc(s.why[k]))}</p>`).join("")}</details>` : ""}
    ${s.table ? tableHTML(s.table) : ""}
    <div class="lab small" style="margin-top:8px">${em ? t("平时怎么陪伴") : t("怎么做")}</div>
    <ol class="bt-steps">${x.steps.map(y => `<li>${esc(tc(y))}</li>`).join("")}</ol>
    ${x.say ? `<p class="bt-say">「${esc(tc(x.say))}」</p>` : ""}
    ${x.avoid ? `<p class="small" style="color:var(--rose);margin:4px 0 0">${t("不要")}：${esc(tc(x.avoid))}</p>` : ""}
    ${[s.verse, ...(s.verses2 || [])].map(verseBlock).join("")}
    ${x.flag ? `<details class="cf-others"><summary class="small muted">${t("什么时候要找专业人员")}</summary><p class="small">${esc(tc(x.flag))}</p></details>` : ""}
    ${blLine || mine.cur || mine.total ? `<div class="bt-trend small">${blLine}${mine.cur || mine.total ? `${blLine ? "<br>" : ""}<b>${t("这里")}</b>：${mine.cur ? t("近 30 天记了 {n} 次", { n: mine.cur }) + ` ${trendText(mine.cur, mine.prev)}` : t("近 30 天没记")}${mine.calmRate != null ? ` · ${t("平静下来 {p}%", { p: mine.calmRate })}` : ""}${mine.avgMin != null ? ` · ${t("平均 {n} 分钟", { n: mine.avgMin })}` : ""}` : ""}</div>` : ""}
    ${keep.length ? `<div class="bt-keep"><b class="small">${t("我们家验证过的做法")}</b>${keep.map(e => `<div class="small">✓ ${esc(e.approach)} <span class="muted">· ${e.date}</span></div>`).join("")}</div>` : ""}
    <div class="btns" style="margin-top:8px"><button class="chip ask-chip" data-act="cf-ask" data-id="${esc(s.id)}">${t("🐑 不管用？问一问咩咩咩")}</button>${s.custom ? `<button class="chip" data-act="cf-sit-edit" data-id="${esc(s.id)}">${t("编辑")}</button>` : ""}</div></div>`;
}
/** 这个年龄段常见的在前，较少见的（以及性别不符的）折叠在后 */
function groupedCards(list, band){
  const g = genderOf(), mismatch = s => !!(s.only && g && s.only !== g);
  const common = list.filter(s => !mismatch(s) && relOf(s, band) >= 1).sort((a, b) => relOf(b, band) - relOf(a, band)), rare = list.filter(s => mismatch(s) || relOf(s, band) < 1);
  return `${common.map(s => topicCard(s, band)).join("") || `<p class="small muted">${t("这个年龄段没有特别常见的，下面是较少见的。")}</p>`}
    ${rare.length ? `<details class="cf-rare"><summary><b>${t("这个年龄段较少见 / 不适用")}</b> <span class="small muted">${t("{n} 种，点开看", { n: rare.length })}</span></summary><p class="small muted" style="margin:6px 0">${t("例如 6 岁已经很少咬人。展开看也可以，里面有这个年龄段该怎么看。")}</p>${rare.map(s => topicCard(s, band)).join("")}</details>` : ""}`;
}
const genderChips = () => { const g = genderOf(); return `<div class="chips cf-gender" role="group" aria-label="${t("性别（可选）")}"><span class="small muted" style="align-self:center">${t("{name} 的性别（可选，让内容更贴近）", { name: esc(childName()) })}</span>${[["m", "男孩"], ["f", "女孩"], ["", "不设置"]].map(([v, l]) => `<button type="button" class="chip" data-act="cf-gender" data-v="${v}" aria-pressed="${g === v}">${t(l)}</button>`).join("")}</div>`; };
const recordRow = (e, evTab) => { const s = sitOf(e.situation);
  return `<div class="task"><span class="bar" style="background:${e.outcome === "calm" ? "var(--sage)" : e.outcome === "worse" ? "var(--rose)" : "var(--honey)"}"></span>
    <button class="main" data-act="cf-ev-edit" data-id="${esc(e.id)}"><span class="title">${esc(e.date)} · ${esc(tc(s ? s.when : t("其他")))}${e.keep ? " ★" : ""}</span><span class="meta">${(e.children || []).map(kidName).join("、")}${e.outcome ? ` · ${outcomeLabel(e.outcome)}` : ""}${e.minutes != null ? ` · ${t("{n} 分钟", { n: e.minutes })}` : ""}${sidesLine(e)}${e.title ? `<br>${t("起因")}：${esc(e.title)}` : ""}${e.approach ? `<br>${esc(e.approach)}` : ""}</span></button>
    <span class="acts"><button class="chip" data-act="cf-ev-keep" data-id="${esc(e.id)}" aria-pressed="${!!e.keep}">${e.keep ? t("值得继续 ★") : t("值得继续")}</button></span></div>`; };

/* ============ 冲突管理 ============ */
function viewConflict(){
  const band = bandKey(), c = cfg(), rows = mineRows(), list = allConflicts(c);
  const counts = BLK.map(k => { const now = Date.now(), c30 = now - 30 * D, mine = rows.filter(e => e.type === "behavior" && e.kind === k); return { k, cur: mine.filter(e => e.ts >= c30).length, prev: mine.filter(e => e.ts < c30).length }; });
  const top = list.map(s => ({ s, st: blStats(s) })).filter(x => !(x.s.bl && x.s.bl.good) && x.st.cur > 0).sort((a, b) => b.st.cur - a.st.cur)[0];
  return `${h2(t("冲突管理"), `${esc(childName())} · ${esc(ageText())}（${esc(BAND_NAME[band])}）`)}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : sidesHint()}
  <div class="panel bt-principle"><p style="margin-top:0"><b>${esc(tc(PRINCIPLES.core))}</b></p>
    ${PRINCIPLES.verses.map(v => `<p class="small"><b>${esc(tc(v.ref))}</b> ${esc(tc(v.zh))}<br><span class="muted">${esc(v.en)}</span></p>`).join("")}
    <p class="small muted" style="margin-bottom:0">${t("冲突管理讲的是「事情发生了，当场怎么办」；持续的情绪和习惯（嫉妒、焦虑、屏幕……）在「情绪管理」。以下依据儿童发展的一般共识（AAP、CDC 等的公开育儿建议），只作参考，不是诊断。每个孩子不一样；持续而严重时，请找儿科医生或儿童心理专业人员。")}</p></div>
  ${angerHTML()}
  ${genderChips()}

  <h2>${t("小月亮里的表现")}</h2>
  <div class="panel">
    ${!B.loaded ? `<p class="small muted" style="margin:0">${B.loading ? t("正在同步小月亮…") : B.err ? t("读不到小月亮的记录：") + esc(B.err) : ""}</p>`
      : rows.length ? `<div class="scroll-x"><table><thead><tr><th>${t("情绪行为")}</th><th class="num">${t("近 30 天")}</th><th class="num">${t("上个 30 天")}</th></tr></thead><tbody>${counts.map(x => `<tr><td>${esc(t(x.k))}</td><td class="num">${x.cur}</td><td class="num">${x.prev}</td></tr>`).join("")}</tbody></table></div>
        <p class="small" style="margin:8px 0 0">${top ? t("按小月亮的记录，最近最常出现的是「{s}」（近 30 天 {n} 次）。先从它开始看下面的做法。", { s: tc(top.s.when), n: top.st.cur }) : t("这个孩子近 30 天在小月亮里没有相关的情绪行为记录。")}</p>`
      : `<p class="small muted" style="margin:0">${t("小月亮里近 60 天还没有这个孩子的「情绪行为 / 社交」记录。在这里记一笔会自动同步过去，也可以去小月亮手动记。")}</p>`}
    <div class="btns" style="margin-top:8px">${pullButtonHTML()}<button class="chip" data-tab="flow-trend" data-from="flow-conflict">${t("看趋势图")}</button></div>
    <p class="small muted" style="margin:6px 0 0">${t("打开这一页时会自动在后台从小月亮拉一次；停在这里、小月亮那边又有新记录时，点按钮再拉。")}</p></div>

  <h2>${t("记录怎么回填")}</h2>
  <div class="panel">
    <p class="small" style="margin-top:0"><b>${t("在这里记一笔 → 自动写进小月亮")}</b><br>${t("每笔、每个孩子写一条「情绪行为」（起因、怎么处理的、持续几分钟）。在这里改这笔，小月亮那条跟着改；删了，那条也删，不会重复。不用再到小月亮手动记一遍。自己加的状况按你选的类别写。")}</p>
    <p class="small"><b>${t("小月亮里已有的记录 → 这里只读")}</b><br>${t("你在小月亮手动记的，这里下次打开就能看到，用来显示次数、趋势和家里用过的办法。这里读到的不会再写回去，也不会复制一份。")}</p>
    <p class="small" style="margin-bottom:0"><b>${t("补记")}</b>：${t("过去的日子也能补，小月亮那条的时间落在那天中午。")}</p>
    <div class="btns"><button class="chip" data-act="cf-mirror" aria-pressed="${c.mirrorConflict}">${c.mirrorConflict ? t("记一笔时同步到小月亮 ✓") : t("记一笔时同步到小月亮")}</button></div></div>

  <h2>${t("常见状况")}</h2>
  <div class="btns" style="margin-top:0"><button class="btn sm" data-act="cf-sit-add">＋ ${t("自定义状况")}</button></div>
  <p class="small muted" style="margin:8px 0 0">${t("没有你要的？自己写个名字，让咩咩咩补全：为什么、怎么做、怎么说，并选好写进小月亮「情绪行为」的哪一类。")}</p>
  ${groupedCards(list, band)}

  <h2>${t("最近的记录")}</h2>
  ${recordsHTML("cf-ev", cfEvents(), recordRow, null, t("还没有记录。遇到状况时点上面的「记一笔」；过去的也能补。"))}
  ${S.bt.pendingEv.length ? `<p class="small muted" style="margin-top:8px">${t("还有 {n} 条离线记录等着联网补传。", { n: S.bt.pendingEv.length })}</p>` : ""}`;
}

/* ============ 情绪管理 ============ */
function viewEmotion(){
  const band = bandKey();
  return `${h2(t("情绪管理"), `${esc(childName())} · ${esc(ageText())}（${esc(BAND_NAME[band])}）`)}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : sidesHint()}
  <p class="small muted">${t("情绪管理讲的是「持续的情绪、态度和习惯，平时怎么陪伴」；一件事当场发生了怎么办，在「冲突管理」。情绪不是要消灭，是要被看见、被陪伴，再带到神面前。以下依据儿童发展的一般共识，只作参考，不是诊断。")}</p>
  ${angerHTML()}
  ${genderChips()}
  <div class="panel" style="margin-top:10px"><p class="small" style="margin:0">${t("下面每个话题会显示小月亮里相关的记录（情绪、自律、屏幕、情绪行为），打开这一页时自动从小月亮拉一次。这里记的情绪管理记录只存在家庭学堂，不写进小月亮。")}</p>
    <p style="margin:8px 0 0">${pullButtonHTML()}</p></div>
  <h2>${t("话题")}</h2>
  ${groupedCards(EMOTIONS, band)}
  <h2>${t("最近的记录")}</h2>
  ${recordsHTML("em-ev", emEvents(), recordRow, null, t("还没有记录。点话题上的「记一笔」；过去的也能补。"))}
  ${S.bt.pendingEv.length ? `<p class="small muted" style="margin-top:8px">${t("还有 {n} 条离线记录等着联网补传。", { n: S.bt.pendingEv.length })}</p>` : ""}`;
}

const evFields = kind => [
  { k: "situation", label: "什么情况", type: "seg", raw: true, opts: (kind === "em" ? EMOTIONS : allConflicts()).map(s => [s.id, s.when]) },
  { k: "date", label: "哪一天（过去的也能补）", type: "date" },
  { k: "children", label: "谁", type: "multi", raw: true, opts: kids().map(k => [k.id, k.name || t("宝宝")]) },
  { k: "title", label: "起因（可空）", type: "text", ph: "玩具被抢、饿了、换环境…" },
  { k: "approach", label: "怎么处理的 / 怎么陪伴的", type: "area", rows: 4, ph: "先把孩子分开，说了一次「不可以打人」，陪他冷静…" }, { k: "minutes", label: "持续几分钟", type: "num" },
  { k: "outcome", label: "结果", type: "seg", opts: OUTCOMES },
  { k: "child_state", label: "孩子当时的状态", type: "seg", opts: SIDES.event.child.map(x => [x, x]) }, { k: "parent_state", label: "大人当时的状态", type: "seg", opts: SIDES.event.parent.map(x => [x, x]) },
  { k: "keep", label: "这个做法值得继续用（会列在卡上）", type: "check" },
  { k: "note", label: "备注（可空）：孩子的反应、明天要跟进什么", type: "area" }];
const toRow = f => ({ situation: f.situation, title: f.title || "", date: f.date || dayKey(Date.now()), children: f.children || [], approach: f.approach || "", minutes: f.minutes == null || f.minutes === "" ? null : +f.minutes, outcome: f.outcome || "", child_state: f.child_state || "", parent_state: f.parent_state || "", keep: !!f.keep, note: f.note || "" });

/* ---- 自定义状况：表单顶上一个「让咩咩咩补全」，补出来的都能改 ---- */
const sitFields = () => [
  { k: "_ai", type: "html", html: () => `<div class="alert info"><b>${t("让咩咩咩补全")}</b><p class="small" style="margin:4px 0 8px">${t("先写状况名称和一句话描述，再点补全：会按孩子现在的年龄段写出为什么、怎么做、怎么说、不要、经文、何时找专业人员，并选好写进小月亮的类别。补出来的都能改，保存前请核对。用的是咩咩咩里填的 API key。")}</p><button type="button" class="btn sm" data-act="cf-ai-fill">${t("让咩咩咩补全")}</button></div>` },
  { k: "when", label: "状况名称", type: "text", ph: "不肯刷牙、吃饭要人追着喂、关电视就大哭…" },
  { k: "short", label: "一句话描述（咩咩咩据此补全）", type: "text", ph: "每晚刷牙都哭闹拖延，要大人按着才肯" },
  { k: "whyText", label: "为什么（针对孩子现在的年龄段）", type: "area", rows: 4 },
  { k: "stepsText", label: "怎么做（一行一条）", type: "area", rows: 6 }, { k: "say", label: "可以这样说", type: "area", rows: 3 },
  { k: "avoid", label: "不要（可空）", type: "area", rows: 3 }, { k: "verse", label: "经文出处（可空，会抓全文）", type: "text", ph: "箴言 15:1" },
  { k: "flag", label: "什么时候要找专业人员（可空）", type: "area", rows: 3 },
  { k: "write", label: "记一笔时，写进小月亮「情绪行为」的哪一类", type: "seg", raw: true, opts: BL_KINDS.map(k => [k, k]) }];
const rowOfSit = (f, id) => ({ id, when: f.when, short: f.short || "", why: { all: f.whyText || "" }, steps: (f.stepsText || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean), say: f.say || "", avoid: f.avoid || "", verse: f.verse || "", flag: f.flag || "", write: BL_KINDS.includes(f.write) ? f.write : "发脾气", bl: { kinds: [BL_KINDS.includes(f.write) ? f.write : "发脾气"], social: [] } });
async function aiFill(btn){
  readForm(); const f = getForm(), d = f.draft;
  if (!d.when) { toast(t("先写状况名称")); return; }
  if (!aiReady()) { toast(t("还没填 API key，在咩咩咩页的「AI 设置」里填")); return; }
  btn.disabled = true; btn.textContent = t("补全中…");
  const stage = STAGE_NAME[bandKey()], g = genderOf();
  const sys = `你是帮助基督徒家庭整理亲子冲突应对模板的助手，认同「安抚多过刑罚，不等于不管教」：按神的恩典慈善管教，不建议体罚、羞辱、威胁或制造恐惧，怒气中不管教。只输出一个 JSON 对象，不要任何多余文字。字段：
{"why":"为什么会这样（针对${stage}的孩子，2–3 句，不贴标签，不下诊断）","steps":["3–5 条具体、可操作的分步做法"],"say":"一句可以对孩子说的话","avoid":"不要做的事（一句）","verse":"一处合适的圣经出处，如 箴言 15:1（只写出处）","flag":"什么时候要找儿科医生或儿童心理专业人员（一句）","write":"从 [${BL_KINDS.join("、")}] 里选最贴近的一项，用来记进小月亮的「情绪行为」"}
用简体中文。涉及安全或持续严重的情况，flag 里要明说。`;
  try {
    const text = (await askText(sys, `孩子 ${ageText()}，${stage}阶段${g ? "，" + genderName(g) : ""}。状况：${d.when}。描述：${d.short || "（没写）"}`, { json: true, maxTokens: 1200, temperature: 0.3 })).replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    Object.assign(d, { whyText: String(j.why || d.whyText || ""), stepsText: Array.isArray(j.steps) ? j.steps.map(String).join("\n") : d.stepsText || "", say: String(j.say || d.say || ""), avoid: String(j.avoid || d.avoid || ""), flag: String(j.flag || d.flag || ""),
      verse: parseRef(String(j.verse || "")) ? String(j.verse) : d.verse || "", write: BL_KINDS.includes(j.write) ? j.write : d.write || "发脾气" });
    drawForm(); toast(t("已补全，请核对后保存"));
  } catch (e) { toast((e && e.message) || t("补全失败")); btn.disabled = false; btn.textContent = t("让咩咩咩补全"); }
}

async function cfAct(act, btn){
  const d = btn.dataset, c = cfg();
  switch (act) {
    case "cf-mirror": await saveCfg({ mirrorConflict: !c.mirrorConflict }); render(); break;
    case "cf-gender": { const gs = { ...(S.hs.settings.genders || {}) }; if (d.v) gs[S.childId] = d.v; else delete gs[S.childId]; await saveSettings({ genders: gs }); render(); break; }
    case "cf-verse-retry": retryVerse(d.ref); render(); break;
    case "cf-ask": { const s = sitOf(d.id); if (!s) break; const em = s.id.startsWith("em-");
      askAbout({ q: em ? t("孩子最近在「{s}」这方面让我有些担心。请结合他的年龄、我们家已经试过的做法和结果，以及我（大人）自己的状态，告诉我平时可以怎么陪伴他。", { s: s.when }) : t("孩子最近在「{s}」这件事上，按现在的做法不太管用。请结合他的年龄、我们家已经试过的做法和结果，以及我（大人）当时的状态，帮我想想还可以怎么做。", { s: s.when }),
        extra: flowContext({ days: 30, focus: s.id }), name: t("「{s}」的记录摘要（最近 30 天）", { s: s.when }), from: em ? "flow-emotion" : "flow-conflict" }); break; }
    case "cf-sit-add": openForm("自定义状况", sitFields(), { when: "", short: "", whyText: "", stepsText: "", say: "", avoid: "", verse: "", flag: "", write: "发脾气" },
      async f => { if (!f.when) { toast(t("请填状况名称")); return; } if (!f.stepsText) { toast(t("请填怎么做，或点「让咩咩咩补全」")); return; } await saveCfg({ situations: [...c.situations, rowOfSit(f, "cf-" + newId())] }); closeSheet(); }); break;
    case "cf-sit-edit": { const s = c.situations.find(x => x.id === d.id); if (!s) break;
      openForm("自定义状况", sitFields(), { ...s, whyText: (s.why && (s.why.all || "")) || "", stepsText: (s.steps || []).join("\n") },
        async f => { if (!f.when) { toast(t("请填状况名称")); return; } await saveCfg({ situations: c.situations.map(x => x.id === s.id ? rowOfSit(f, s.id) : x) }); closeSheet(); },
        async () => { if (confirm(t("删除这种状况？已有的记录保留，仍会显示在最近的记录里。"))) { await saveCfg({ situations: c.situations.filter(x => x.id !== s.id) }); closeSheet(); } }); break; }
    case "cf-ai-fill": await aiFill(btn); break;
    case "cf-ev-add": { const kind = d.kind === "em" ? "em" : "cf";
      openForm("记一笔", evFields(kind), { situation: d.sit || (kind === "em" ? EMOTIONS : allConflicts())[0].id, date: dayKey(Date.now()), children: kids().length === 1 ? [kids()[0].id] : (S.childId ? [S.childId] : []), title: "", approach: "", minutes: null, outcome: "calm", child_state: "", parent_state: "", keep: false, note: "" },
        async f => { if (!(f.children || []).length) { toast(t("请选是哪个孩子")); return; } await saveEvent(toRow(f)); closeSheet(); if (kind === "cf") pull({ quiet: true }); }); break; }
    case "cf-ev-edit": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break; const kind = isEm(e) ? "em" : "cf";
      openForm("这一笔", evFields(kind), e, async f => { if (!(f.children || []).length) { toast(t("请选是哪个孩子")); return; } await saveEvent({ ...e, ...toRow(f) }); closeSheet(); if (kind === "cf") pull({ quiet: true }); },
        async () => { if (confirm(kind === "cf" ? t("删除这条记录？小月亮里同步过去的那条也会删掉。") : t("删除这条记录？"))) { await deleteEvent(e.id); closeSheet(); if (kind === "cf") pull({ quiet: true }); } }); break; }
    case "cf-ev-keep": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break; await saveEvent({ ...e, keep: !e.keep }); render(); break; }
  }
}

export { viewFlows, viewConflict, viewEmotion, cfAct };
