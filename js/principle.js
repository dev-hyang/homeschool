import { LS_PREFIX } from "./core/config.js";
import { locale, t, tc } from "./core/i18n.js";
import { esc } from "./core/util.js";
import { ANGER, CORE, HARD, V } from "./data/principle.js";
import { ensureVerse, scheduleRender, verseText } from "./bedtime.js";

/* ============ 大原则：贯穿整个应用的提醒 ============
   今天页是完整的一张卡（默认展开，收起后记在本机）；其余每一层（课程、资源、日历、我的、定制流程、睡前、冲突、情绪、趋势）顶上一行小字，点开是同一份内容。
   怒气卡（angerHTML）放在冲突、情绪、睡前状况和播放页的「遇到状况」里。 */
const KEY = LS_PREFIX + ".coreClosed";
const closed = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
const setClosed = v => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) { /* 忽略 */ } };
/* 经文：和合本原文（离线也有）；英文界面再抓英文 */
function verseLine(ref){
  const zh = V[ref] ? `<span class="core-v">${esc(tc(V[ref]))}</span>` : "";
  let en = "";
  if (locale() === "en") { const v = verseText(ref, "en"); if (v) en = `<span class="core-v en">${esc(v.text)}</span>`; else ensureVerse(ref, "en").then(r => { if (r) scheduleRender(); }); }
  return `<p class="core-verse"><b>${esc(tc(ref))}</b> ${locale() === "en" ? en : zh}</p>`;
}
const body = () => `<p class="core-line"><b>${esc(tc(CORE.line))}</b></p>
  ${CORE.points.map(p => `<div class="core-pt"><div class="core-h">${esc(tc(p.h))}</div><p class="small" style="margin:2px 0 4px">${esc(tc(p.t))}</p>${p.refs.map(verseLine).join("")}</div>`).join("")}
  ${angerBody()}
  <div class="core-pt"><div class="core-h">${esc(tc(HARD.title))}</div><p class="small" style="margin:2px 0 4px">${esc(tc(HARD.text))}</p>${HARD.verses.map(verseLine).join("")}<p class="small muted" style="margin:4px 0 0">${esc(tc(HARD.note))}</p></div>`;
const angerBody = () => `<div class="core-pt core-anger"><div class="core-h">${esc(tc(ANGER.title))}</div>${ANGER.verses.map(verseLine).join("")}<ol class="core-steps">${ANGER.steps.map(s => `<li>${esc(tc(s))}</li>`).join("")}</ol></div>`;

/** mode: "full"（今天页，默认展开）| "mini"（其余各层，一行小字，点开是同一份）*/
function principleHTML(mode){
  if (mode === "full") return `<details class="core-card" id="coreCard" ${closed() ? "" : "open"}><summary><span class="core-ico" aria-hidden="true">🕊</span><span class="core-sum"><b>${esc(t(CORE.title))}</b><small>${esc(tc(CORE.line))}</small></span></summary><div class="core-body">${body()}</div></details>`;
  return `<details class="core-mini"><summary>🕊 ${esc(tc(CORE.mini))} <span class="muted">· ${t("怒气来时怎么办")}</span></summary><div class="core-body">${body()}</div></details>`;
}
/** 怒气卡：放在最容易起冲突的地方，常驻 */
const angerHTML = () => `<div class="panel core-anger-card">${angerBody()}<div class="core-pt" style="margin-bottom:0"><div class="core-h">${esc(tc(HARD.title))}</div><p class="small" style="margin:2px 0 0">${esc(tc(HARD.text))}</p></div></div>`;

document.addEventListener("toggle", e => { if (e.target && e.target.id === "coreCard") setClosed(!e.target.open); }, true);

export { principleHTML, angerHTML };
