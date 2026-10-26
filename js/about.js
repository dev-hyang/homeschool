import { APP_VERSION, SISTER_APPS, THIS_APP } from "./core/config.js";
import { t, tc } from "./core/i18n.js";
import { $, esc } from "./core/util.js";
import { ABOUT } from "./data/about.js";
import { showSheet } from "./sheet.js";

/* ============ 介绍页：设计思路与使用说明（设置页和未登录引导里打开） ============
   正文是应用自带的中文内容：繁体界面逐字转换，英文界面保持中文，只翻译栏目标题。 */
function openAbout(){
  const A = ABOUT, c = s => esc(tc(s));
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">${esc(t("关于家庭学堂"))}</h3><span><button class="iconbtn" data-act="close" aria-label="${esc(t("关闭"))}">${esc(t("关闭"))}</button></span></div>
  <p>${c(A.intro)}</p>
  <h2>${t("设计原则")}</h2>
  <div class="panel"><ol class="plain" style="padding-left:20px">${A.principles.map(([k, d]) => `<li style="margin:6px 0"><b>${c(k)}。</b>${c(d)}</li>`).join("")}</ol></div>
  <h2>${t("每一页怎么用")}</h2>
  <div class="panel scroll-x"><table><tbody>${A.pages.map(([p, d]) => `<tr><th style="width:18%">${c(p)}</th><td>${c(d)}</td></tr>`).join("")}</tbody></table></div>
  <h2>${t("学习节奏怎么把握")}</h2>
  <div class="panel"><p><b>${c(A.pacing.lead)}</b></p>
    <div class="scroll-x"><table><tbody>${A.pacing.rows.map(([k, v]) => `<tr><th style="width:30%">${c(k)}</th><td>${c(v)}</td></tr>`).join("")}</tbody></table></div>
    <h3 class="small muted" style="margin-top:12px">${t("安排是否合理，看这些信号")}</h3>
    <ul class="plain">${A.pacing.signals.map(s => `<li>${c(s)}</li>`).join("")}</ul>
    <p class="small" style="margin-top:10px">${c(A.pacing.how)}</p></div>
  <h2>${t("数据与隐私")}</h2>
  <div class="panel"><p class="small">${c(A.data)}</p><p class="small muted">${t("姊妹应用：")}${SISTER_APPS.filter(a => a.id !== THIS_APP).map(a => `<a href="${a.url}">${esc(t(a.name))}</a>`).join(" · ")} · ${t("版本")} ${APP_VERSION}</p></div>`;
  showSheet();
}

export { openAbout };
