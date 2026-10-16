import { BABY_LOG_URL } from "./core/config.js";
import { S, ageText, child } from "./core/state.js";
import { $, esc } from "./core/util.js";
import { viewCourse } from "./course.js";
import { viewLaw } from "./law.js";
import { viewReports } from "./reports.js";
import { viewResources } from "./resources.js";
import { viewRoutines } from "./routines.js";
import { openSettings } from "./sheet.js";
import { viewToday } from "./today.js";

/* ============ 渲染 ============ */
function renderStatus(){
  const st = { loading: ["", "连接中"], offline: ["", "云端不可用"], signedout: ["", "未登录"], nofamily: ["", "还没加入家庭"], ready: ["ok", `家庭 · ${Object.keys(S.members).length || 1} 人`] }[S.cloud];
  $("#status").innerHTML = `<span class="dot ${st[0]}"></span>${st[1]}`;
  const c = child();
  $("#bname").innerHTML = `${esc(c ? `${c.name || "宝宝"}的学堂` : "家庭学堂")}<span class="chev" aria-hidden="true"></span>`;
  $("#bage").textContent = c ? ageText() : (S.cloud === "ready" ? "家庭里还没有孩子" : "登录后显示孩子");
  $("#kids").innerHTML = S.children.map(k => `<button role="menuitemradio" aria-checked="${k.id === S.childId}" data-kidsel="${esc(k.id)}"><b>${esc(k.name || "宝宝")}</b><small>${esc(ageText(k.id))}</small></button>`).join("")
    + `<button class="manage" role="menuitem" data-act="settings">家庭与孩子…</button>`;
}
function toggleKids(open = $("#kids").hidden){
  $("#kids").hidden = !open;
  $("#bname").setAttribute("aria-expanded", String(open));
  if (open) { const cur = $("#kids [aria-checked='true']"); cur && cur.focus(); }
}
function render(){
  renderStatus();
  document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.tab === S.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const v = { today: viewToday, course: viewCourse, resources: viewResources, calendar: viewRoutines, law: viewLaw, reports: viewReports }[S.tab] || viewToday;
  $("#main").innerHTML = S.tab === "law" ? v() : (gateHTML() || v());
}
function refreshSettingsIfOpen(){ if ($("#sheet").open && $("#sheetTitle") && $("#sheetTitle").textContent === "设置") openSettings(); }

/* 没登录 / 没家庭 / 没孩子 / 表没建时，每个页面都先把路指清楚 */
function gateHTML(){
  if (S.cloud === "loading") return `<div class="empty">正在连接云端…</div>`;
  if (S.cloud === "offline") return `<div class="empty">云端暂时不可用。<br>请检查网络后刷新页面。</div>`;
  if (S.cloud === "signedout") return `<div class="empty">用和小月亮一样的账号登录，就能看到家里的孩子。<br><button class="btn primary" data-act="settings">去登录</button> <button class="btn" data-act="about">了解家庭学堂</button></div>`;
  if (S.cloud === "nofamily") return `<div class="empty">已登录，但还没有加入家庭。<br><button class="btn primary" data-act="settings">创建或加入家庭</button></div>`;
  if (!S.children.length) return `<div class="empty">家庭里还没有孩子。先在<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">小月亮</a>的设置里添加，这里会自动出现。</div>`;
  if (S.hs.error === "missing") return `<div class="empty">数据库还没有家庭学堂的表。<br>请在 Supabase 执行本地 <code>supabase/migrations/003_homeschool_phase1.sql</code>，然后刷新。</div>`;
  if (S.hs.error) return `<div class="empty">读取家庭学堂数据失败。<br>请刷新重试。</div>`;
  if (!S.hs.loaded) return `<div class="empty">正在读取…</div>`;
  return "";
}

export { renderStatus, toggleKids, render, refreshSettingsIfOpen };
