import { BABY_LOG_URL } from "./core/config.js";
import { S, ageText, child, childName, stageOf } from "./core/state.js";
import { $, dayKey, esc, weekday } from "./core/util.js";
import { openSettings } from "./sheet.js";

/* ============ 渲染 ============ */
function renderStatus(){
  const st = { loading: ["", "连接中"], offline: ["", "云端不可用"], signedout: ["", "未登录"], nofamily: ["", "还没加入家庭"], ready: ["ok", `家庭 · ${Object.keys(S.members).length || 1} 人`] }[S.cloud];
  $("#status").innerHTML = `<span class="dot ${st[0]}"></span>${st[1]}`;
  const c = child();
  $("#bname").innerHTML = `${esc(c ? `${c.name || "宝宝"}的学堂` : "家庭学堂")}<span class="chev" aria-hidden="true"></span>`;
  $("#bage").textContent = c ? `${ageText()} · ${stageOf().name}` : (S.cloud === "ready" ? "家庭里还没有孩子" : "登录后显示孩子");
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
  const v = { today: viewToday, course: viewCourse, resources: viewResources, calendar: viewCalendar, reports: viewReports }[S.tab] || viewToday;
  $("#main").innerHTML = v();
}
function refreshSettingsIfOpen(){ if ($("#sheet").open) openSettings(); }

/* 没登录 / 没家庭 / 没孩子时，每个页面都先把路指清楚 */
function gateHTML(){
  if (S.cloud === "loading") return `<div class="empty">正在连接云端…</div>`;
  if (S.cloud === "offline") return `<div class="empty">云端暂时不可用。<br>请检查网络后刷新页面。</div>`;
  if (S.cloud === "signedout") return `<div class="empty">用和小月亮一样的账号登录，就能看到家里的孩子。<br><button class="btn primary" data-act="settings">去登录</button></div>`;
  if (S.cloud === "nofamily") return `<div class="empty">已登录，但还没有加入家庭。<br><button class="btn primary" data-act="settings">创建或加入家庭</button></div>`;
  if (!S.children.length) return `<div class="empty">家庭里还没有孩子。先在<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">小月亮</a>的设置里添加，这里会自动出现。</div>`;
  return "";
}

function viewToday(){
  const gate = gateHTML(); if (gate) return gate;
  const now = Date.now();
  return `
  <section class="hero"><div class="moon"></div>
    <div class="lbl">${dayKey(now)} · ${weekday(now)}</div>
    <div class="big">${esc(childName())}</div>
    <div class="meta"><span>${esc(ageText())}</span><span>${esc(stageOf().name)}</span></div></section>

  <h2>阶段 0 · 地基已就位</h2>
  <div class="panel">
    <p>登录、家庭和孩子已经和小月亮打通。下一步（阶段 1）这个页面会变成每天早上打开的那一页：</p>
    <ul class="plain">
      <li><b>今日敬拜</b>：读经段落、本周经文、本月诗歌、祷告事项，一个勾</li>
      <li><b>经文卡</b>：中英对照，在学 / 会背 / 复习中，按间隔自动排复习</li>
      <li><b>今日任务</b>：由周例行模板生成，勾完成、跳过或顺延</li>
    </ul>
  </div>`;
}
const soon = (n, what) => `<div class="empty">阶段 ${n} 加入：${what}</div>`;
function viewCourse(){ return gateHTML() || soon(2, "七个领域的课程树、每课时的信仰连接、学前目标清单。"); }
function viewResources(){ return gateHTML() || soon(3, "中英文资源库，含吹号者、TBIC、AmblesideOnline 等种子数据。"); }
function viewCalendar(){ return gateHTML() || soon(3, "月历、周例行、节假日跳过；教会年历预留。"); }
function viewReports(){ return gateHTML() || soon(4, "每科时长、出勤天数、读过的书、背下的经文。"); }

export { renderStatus, toggleKids, render, refreshSettingsIfOpen };
