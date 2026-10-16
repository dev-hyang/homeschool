import { familyHTML } from "./core/auth.js";
import { APP_VERSION, BABY_LOG_URL, LS_PREFIX } from "./core/config.js";
import { S, ageText, stageOf } from "./core/state.js";
import { $, esc } from "./core/util.js";

/* ============ 设置页（以整页形式替换内容区，和小月亮一样的交互） ============ */
let sheetScrollY = 0;
function showSheet(){
  const d = $("#sheet");
  if (!d.open) {
    sheetScrollY = window.scrollY;
    d.show();
    document.body.classList.add("sheet-open");
    try { history.pushState({ sheet: 1 }, ""); } catch (e) {}
  }
  window.scrollTo(0, 0);
  const first = d.querySelector(".sheet-head h3"); if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
}
$("#sheet").addEventListener("close", () => {
  document.body.classList.remove("sheet-open");
  requestAnimationFrame(() => window.scrollTo(0, sheetScrollY));
  if (history.state && history.state.sheet) { try { history.back(); } catch (e) {} }
});
window.addEventListener("popstate", () => { const d = $("#sheet"); if (d.open) d.close(); });

function themePref(){ try { return localStorage.getItem(LS_PREFIX + ".theme") || ""; } catch (e) { return ""; } }

function openSettings(){
  const kids = S.children;
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">设置</h3><button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></div>
  <h2>家庭</h2>
  ${familyHTML()}

  <h2>孩子</h2>
  <div class="panel">
    ${kids.length ? `<div class="scroll-x"><table><thead><tr><th>小名</th><th>生日</th><th>年龄</th><th>阶段</th></tr></thead><tbody>
      ${kids.map(c => `<tr><td><b>${esc(c.name || "宝宝")}</b></td><td class="num">${esc(c.birth || "—")}</td><td>${esc(ageText(c.id))}</td><td>${esc(stageOf(c.id).name)}</td></tr>`).join("")}
    </tbody></table></div>`
    : `<p class="muted">${S.cloud === "ready" ? "家庭里还没有孩子。" : "登录并进入家庭后，这里会显示孩子。"}</p>`}
    <p class="small muted" style="margin-top:8px">孩子的名字和生日在<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">小月亮</a>的设置里维护，两个应用共用同一份。${S.childrenSource === "settings" ? "（当前读取的是旧格式；数据库迁移 002 执行后会自动切到 children 表。）" : ""}</p>
  </div>

  <h2>显示</h2>
  <div class="seg" role="group" aria-label="外观">${[["", "跟随系统"], ["light", "浅色"], ["dark", "深色"]].map(([v, l]) => `<button data-theme-set="${v}" aria-pressed="${themePref() === v}">${l}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:24px">版本 ${APP_VERSION}</p>`;
  showSheet();
}

export { showSheet, openSettings };
