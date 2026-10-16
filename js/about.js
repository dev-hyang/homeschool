import { APP_VERSION, BABY_LOG_URL } from "./core/config.js";
import { $, esc } from "./core/util.js";
import { ABOUT } from "./data/about.js";
import { showSheet } from "./sheet.js";

/* ============ 介绍页：设计思路与使用说明（设置页和未登录引导里打开） ============ */
function openAbout(){
  const A = ABOUT;
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">关于家庭学堂</h3><span><button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></span></div>
  <p>${esc(A.intro)}</p>
  <h2>设计原则</h2>
  <div class="panel"><ol class="plain" style="padding-left:20px">${A.principles.map(([t, d]) => `<li style="margin:6px 0"><b>${esc(t)}。</b>${esc(d)}</li>`).join("")}</ol></div>
  <h2>每一页怎么用</h2>
  <div class="panel scroll-x"><table><tbody>${A.pages.map(([p, d]) => `<tr><th style="width:18%">${esc(p)}</th><td>${esc(d)}</td></tr>`).join("")}</tbody></table></div>
  <h2>学习节奏怎么把握</h2>
  <div class="panel"><p><b>${esc(A.pacing.lead)}</b></p>
    <div class="scroll-x"><table><tbody>${A.pacing.rows.map(([k, v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
    <h3 class="small muted" style="margin-top:12px">安排是否合理，看这些信号</h3>
    <ul class="plain">${A.pacing.signals.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    <p class="small" style="margin-top:10px">${esc(A.pacing.how)}</p></div>
  <h2>数据与隐私</h2>
  <div class="panel"><p class="small">${esc(A.data)}</p><p class="small muted">姊妹应用：<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">小月亮</a> · 版本 ${APP_VERSION}</p></div>`;
  showSheet();
}

export { openAbout };
