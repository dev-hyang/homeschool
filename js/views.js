import { updateMiniBar } from "./minibar.js";
import { BABY_LOG_URL, SISTER_APPS, THIS_APP } from "./core/config.js";
import { viewMe } from "./me.js";
import { printViewHTML } from "./print.js";
import { LOCALES, locale, t } from "./core/i18n.js";
import { S, ageText, child } from "./core/state.js";
import { $, esc } from "./core/util.js";
import { viewCourse, viewGoals, viewScope, viewUnits } from "./course.js";
import { viewLaw } from "./law.js";
import { viewReports } from "./reports.js";
import { viewIdeas, viewLibrary, viewResources } from "./resources.js";
import { viewCalRoutines, viewRoutines } from "./routines.js";
import { openSettings } from "./sheet.js";
import { viewToday } from "./today.js";

/* ============ 渲染 ============ */
const TAB_LABELS = { today: "今天", course: "课程", resources: "资源", calendar: "日历", me: "我的" };
// 子页 → 所属的底部页签：子页顶上有“‹ 所属页”返回，底部仍高亮所属页
const PARENT = { "course-units": "course", "course-scope": "course", "course-goals": "course", "res-ideas": "resources", "res-library": "resources", "cal-routines": "calendar", reports: "me", law: "me" };
const VIEWS = { today: viewToday, course: viewCourse, "course-units": viewUnits, "course-scope": viewScope, "course-goals": viewGoals, resources: viewResources, "res-ideas": viewIdeas, "res-library": viewLibrary, calendar: viewRoutines, "cal-routines": viewCalRoutines, law: viewLaw, reports: viewReports, me: viewMe };
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
  const parent = PARENT[S.tab], cur = parent || S.tab;
  document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.tab === cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const v = VIEWS[S.tab] || viewToday;
  // 法规和“我的”不需要登录也能看；其余要先进家庭。子页顶上有返回所属页的按钮
  const back = parent ? `<div class="backbar"><button class="chip" data-tab="${parent}">‹ ${t(TAB_LABELS[parent])}</button></div>` : "";
  $("#main").innerHTML = (S.tab === "law" || S.tab === "me") ? back + v() : back + (gateHTML() || v());
  updateMiniBar($("#bname").textContent, parent ? `<button class="chip" data-tab="${parent}">‹ ${t(TAB_LABELS[parent])}</button>` : "", t("回到顶部"));
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

export { renderStatus, toggleKids, render, refreshSettingsIfOpen };
