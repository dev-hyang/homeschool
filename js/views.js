import { updateMiniBar } from "./minibar.js";
import { BABY_LOG_URL, SISTER_APPS, THIS_APP } from "./core/config.js";
import { viewMe, viewPrintHub } from "./me.js";
import { printViewHTML } from "./print.js";
import { LOCALES, locale, t } from "./core/i18n.js";
import { S, ageText, child } from "./core/state.js";
import { $, esc } from "./core/util.js";
import { viewCourse, viewGoals, viewScope, viewUnits } from "./course.js";
import { viewLaw } from "./law.js";
import { viewReports } from "./reports.js";
import { viewIdeas, viewLibrary, viewResources, viewSources } from "./resources.js";
import { viewScriptures } from "./library.js";
import { viewConflict, viewEmotion, viewFlows } from "./flows.js";
import { beforeRender, viewTrend } from "./flows-trend.js";
import { principleHTML } from "./principle.js";
import { viewCalRoutines, viewRoutines } from "./routines.js";
import { openSettings } from "./sheet.js";
import { viewToday } from "./today.js";
import { restoreHero } from "./sleepcard.js";
import { viewAsk } from "./ask.js";
import { BT_TABS, cacheReady, viewBedtime, viewCases, viewFlow, viewLogs, viewReadings, viewSongs, viewTexts } from "./bedtime.js";

/* ============ 渲染 ============ */
const TAB_LABELS = { today: "今天", course: "课程", resources: "资源", calendar: "日历", me: "我的" };
// 子页 → 所属页：顶上一条完整路径（‹ 我的 / 报告），底部仍高亮所属的页签。咩咩咩从哪进就以哪为父页（S.from 记录）
const PARENT = { "course-units": "course", "course-scope": "course", "course-goals": "course", "res-ideas": "resources", "res-library": "resources", "cal-routines": "calendar", reports: "me", law: "me", ask: "me",
  "res-scriptures": "resources", "res-sources": "resources", flows: "resources", "flow-conflict": "flows", "flow-emotion": "flows", "flow-trend": "flows", "me-print": "me",
  bedtime: "flows", "bt-flow": "bedtime", "bt-songs": "flows", "bt-texts": "bedtime", "bt-readings": "bedtime", "bt-logs": "bedtime", "bt-cases": "bedtime" };
const PAGE_LABELS = { "course-units": "单元与课时", "course-scope": "年度范围", "course-goals": "学习目标", "res-ideas": "日常点子", "res-library": "资源库", "cal-routines": "周例行", reports: "报告", law: "法规", ask: "咩咩咩",
  "res-scriptures": "经文卡库", "res-sources": "参考来源", flows: "定制流程", "flow-conflict": "冲突管理", "flow-emotion": "情绪管理", "flow-trend": "趋势与分析", "me-print": "打印",
  bedtime: "睡前安然", "bt-flow": "流程", "bt-songs": "歌单", "bt-texts": "带领词", "bt-readings": "睡前经文", "bt-logs": "记录", "bt-cases": "状况与应对" };
const parentOf = tab => (S.from && S.from[tab]) || PARENT[tab] || null;
const labelOf = tab => t(TAB_LABELS[tab] || PAGE_LABELS[tab] || tab);
/** 面包屑：‹ 底部页签 / 中间页 / 当前页（加粗）。中间项可点，和 home-pantry 的 crumbNav 同一版式 */
function crumbHTML(tab, tail){   // tail：当前页不是页签（比如打印出来的那张纸）时，路径从 tab 本身往上数，最后一项写 tail
  const chain = []; for (let p = tail ? tab : parentOf(tab); p; p = parentOf(p)) chain.unshift(p);
  if (!chain.length) return "";
  const parts = [...chain.map(k => `<button type="button" class="crumb-link" data-tab="${k}">${chain[0] === k ? "‹ " : ""}${esc(labelOf(k))}</button>`), `<b aria-current="page">${esc(tail || labelOf(tab))}</b>`];
  return `<nav class="crumb" aria-label="${t("位置")}">${parts.join(`<span class="sep" aria-hidden="true">/</span>`)}</nav>`;
}
const CORE_TABS = new Set(["course", "resources", "calendar", "me", "flows", "bedtime", "flow-conflict", "flow-emotion", "flow-trend", "ask"]);
const VIEWS = { ask: viewAsk, today: viewToday, course: viewCourse, "course-units": viewUnits, "course-scope": viewScope, "course-goals": viewGoals, resources: viewResources, "res-ideas": viewIdeas, "res-library": viewLibrary, calendar: viewRoutines, "cal-routines": viewCalRoutines, law: viewLaw, reports: viewReports, me: viewMe,
  "res-scriptures": viewScriptures, "res-sources": viewSources, flows: viewFlows, "flow-conflict": viewConflict, "flow-emotion": viewEmotion, "flow-trend": viewTrend, "me-print": viewPrintHub,
  bedtime: viewBedtime, "bt-flow": viewFlow, "bt-songs": viewSongs, "bt-texts": viewTexts, "bt-readings": viewReadings, "bt-logs": viewLogs, "bt-cases": viewCases };
function renderStatus(){
  const st = { loading: ["", t("连接中")], offline: ["", t("云端不可用")], signedout: ["", t("未登录")], nofamily: ["", t("还没加入家庭")], ready: ["ok", t("家庭 · {n} 人", { n: Object.keys(S.members).length || 1 })] }[S.cloud];
  $("#status").innerHTML = `<span class="dot ${st[0]}"></span>${esc(st[1])}`;
  const c = child();
  $("#bname").innerHTML = `${esc(c ? t("{name}的学堂", { name: c.name || t("宝宝") }) : t("家庭学堂"))}<span class="chev" aria-hidden="true"></span>`;
  $("#bage").textContent = c ? ageText() : (S.cloud === "ready" ? t("家庭里还没有孩子") : t("登录后显示孩子"));
  $("#kids").setAttribute("aria-label", t("切换孩子"));
  $("#kids").innerHTML = S.children.map(k => `<button role="menuitemradio" aria-checked="${k.id === S.childId}" data-kidsel="${esc(k.id)}"><b>${esc(k.name || t("宝宝"))}</b><small>${esc(ageText(k.id))}</small></button>`).join("")
    + `<button class="manage" role="menuitem" data-act="settings">${esc(t("家庭与孩子…"))}</button>`;
  renderAppSwitch();
  renderLangSwitch();
  // 底部页签文字
  document.querySelectorAll("nav.tabs button").forEach(b => { const k = TAB_LABELS[b.dataset.tab]; if (!k) return; const txt = [...b.childNodes].find(n => n.nodeType === 3); if (txt) txt.nodeValue = t(k); else b.append(t(k)); });
}
// 应用切换（四个姊妹站点共用）：右上角九宫格按钮，宽屏浮层、手机底部抽屉；标题仍是切换孩子。
// 组件放在 home-pantry/shared；首次离线加载不到时，先用原来的 ‹ 上一个 / 下一个 › 胶囊，切换不受影响。
const SWITCHER_URL = "https://dev-hyang.github.io/home-pantry/shared/app-switcher.js";
let switcherMod = null, switcherTried = false;
// 语言切换（四个姊妹站点共用）：地球按钮 + 列表，以后加语言只要在 LOCALES 里加一项
const LANG_URL = "https://dev-hyang.github.io/home-pantry/shared/lang-switcher.js";
let langMod = null, langTried = false;
function renderLangSwitch(){
  const host = $("#langsw"); if (!host) return;
  if (langMod) {
    const cur = locale();
    langMod.mountLangSwitcher({ host, current: cur, ui: cur === "en" ? "en" : cur === "zh-TW" ? "tw" : "zh", languages: LOCALES.map(([code]) => ({ code })),
      onSelect: code => document.dispatchEvent(new CustomEvent("eco-set-lang", { detail: code })) });
    return;
  }
  if (!langTried) { langTried = true; import(LANG_URL).then(m => { langMod = m; renderLangSwitch(); }).catch(() => {}); }
}
function renderAppSwitch(){
  const host = $("#apps");
  if (switcherMod) { switcherMod.mountAppSwitcher({ host, current: THIS_APP, lang: locale() }); return; }
  const i = SISTER_APPS.findIndex(a => a.id === THIS_APP), n = SISTER_APPS.length, prev = SISTER_APPS[(i - 1 + n) % n], next = SISTER_APPS[(i + 1) % n];
  const badge = (a, label) => `<a class="badge" href="${a.url}" title="${esc(t("切到{name}", { name: t(a.name) }))}" aria-label="${esc(t("切到{name}", { name: t(a.name) }))}">${label}</a>`;
  host.setAttribute("aria-label", t("切换姊妹应用"));
  host.innerHTML = badge(prev, `‹ ${esc(t(prev.short))}`) + badge(next, `${esc(t(next.short))} ›`);
  if (!switcherTried) { switcherTried = true; import(SWITCHER_URL).then(m => { switcherMod = m; renderAppSwitch(); }).catch(() => {}); }
}
function toggleKids(open = $("#kids").hidden){
  $("#kids").hidden = !open;
  $("#bname").setAttribute("aria-expanded", String(open));
  if (open) { const cur = $("#kids [aria-checked='true']"); cur && cur.focus(); }
}
function render(){
  renderStatus();
  // 打印视图：整页就是那张纸（头部、底栏由 body.printview 收起）
  document.body.classList.toggle("printview", !!S.printView);
  if (S.printView) { $("#main").innerHTML = printViewHTML(); return; }
  beforeRender(S.tab);   // 刚进冲突 / 情绪 / 趋势页：先在后台从小月亮拉一次，按钮此时就是灰的
  let cur = S.tab; for (let p = parentOf(cur); p; p = parentOf(p)) cur = p;   // 一路找到所属的底部页签
  const parent = parentOf(S.tab);
  document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.tab === cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const v = VIEWS[S.tab] || viewToday;
  // 法规和“我的”不需要登录也能看；其余要先进家庭。子页顶上有返回所属页的按钮
  const back = crumbHTML(S.tab);
  // 咩咩咩不登录也能问，只是不带学习情况；睡前安然在这台设备存过一份配置后，没连上云端也能开（播放页离线可用）
  // 大原则：今天页是完整的一张卡（在 today.js 里），其余几层顶上一行小字，点开是同一份
  const core = CORE_TABS.has(S.tab) ? principleHTML("mini") : "";
  $("#main").innerHTML = (S.tab === "law" || S.tab === "me" || S.tab === "ask" || (BT_TABS.has(S.tab) && cacheReady())) ? back + core + v() : back + core + (gateHTML() || v());
  if (S.tab === "today") restoreHero();
  updateMiniBar($("#bname").textContent, parent ? `<button class="chip" data-tab="${parent}">‹ ${esc(labelOf(parent))}</button>` : "", t("回到顶部"));
}
function refreshSettingsIfOpen(){ if ($("#sheet").open && $("#sheetTitle") && $("#sheetTitle").textContent === t("设置")) openSettings(); }

/* 没登录 / 没家庭 / 没孩子 / 表没建时，每个页面都先把路指清楚 */
function gateHTML(){
  if (S.cloud === "loading") return `<div class="empty">${t("正在连接云端…")}</div>`;
  if (S.cloud === "offline") return `<div class="empty">${t("云端暂时不可用。")}<br>${t("请检查网络后刷新页面。")}</div>`;
  if (S.cloud === "signedout") return `<div class="empty">${t("用和小月亮一样的账号登录，就能看到家里的孩子。")}<br><button class="btn primary" data-act="settings">${t("去登录")}</button> <button class="btn" data-act="about">${t("了解家庭学堂")}</button></div>`;
  if (S.cloud === "nofamily") return `<div class="empty">${t("已登录，但还没有加入家庭。")}<br><button class="btn primary" data-act="settings">${t("创建或加入家庭")}</button></div>`;
  if (!S.children.length) return `<div class="empty">${t("家庭里还没有孩子。先在")}<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">${t("小月亮")}</a>${t("的设置里添加，这里会自动出现。")}</div>`;
  if (S.hs.error === "missing") return `<div class="empty">${t("数据库还没有家庭学堂的表。")}<br>${t("请在 Supabase 执行本地")} <code>supabase/migrations/003_homeschool_phase1.sql</code>${t("，然后刷新。")}</div>`;
  if (S.hs.error) return `<div class="empty">${t("读取家庭学堂数据失败。")}<br>${t("请刷新重试。")}</div>`;
  if (!S.hs.loaded) return `<div class="empty">${t("正在读取…")}</div>`;
  return "";
}

export { renderStatus, toggleKids, render, refreshSettingsIfOpen, crumbHTML };
