import { APP_VERSION, SISTER_APPS, THIS_APP } from "./core/config.js";
import { t, tc } from "./core/i18n.js";
import { S, ageText, childName } from "./core/state.js";
import { esc } from "./core/util.js";

/* ============ “我的”页：把不常用的入口收到一处 ============
   报告、法规、设置、介绍、打印、姊妹应用。底部一个页签，宽窄屏一样，不再折叠。
   没登录也能打开（设置在这里登录）。 */
// 入口行：图标 + 标题 + 一句摘要 + ›。课程 / 资源 / 日历的入口页也用它
const mrow = (act, title, desc, icon) => `<button class="mrow" ${act}><span class="mi" aria-hidden="true">${icon}</span><span class="mt"><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</span><span class="mch" aria-hidden="true">›</span></button>`;
function viewMe(){
  const ready = S.cloud === "ready" && S.hs.loaded;
  const who = ready ? t("{name} · {age}", { name: esc(childName()), age: esc(ageText()) }) : S.cloud === "signedout" ? t("还没登录") : S.cloud === "nofamily" ? t("还没加入家庭") : "";
  const row = mrow;
  const link = (a) => `<a class="mrow" href="${a.url}"><span class="mi" aria-hidden="true">↗</span><span class="mt"><b>${esc(t(a.name))}</b><small>${tc(esc(a.desc))}</small></span><span class="mch" aria-hidden="true">›</span></a>`;
  return `
  <h2>${t("我的")}${who ? ` <span class="small muted" style="font-family:var(--f-body);font-weight:400">${who}</span>` : ""}</h2>
  <div class="panel mlist">
    ${row('data-tab="reports"', t("报告"), t("按月出勤、每科时长、敬拜、经文、课时、目标，CSV 导出"), "↗")}
    ${row('data-tab="law"', t("法规"), t("各州在家教育法规摘要"), "§")}
    ${row('data-act="settings"', t("设置"), t("家庭与成员、读经计划、译本、学年与假期、语言、显示"), "⚙")}
    ${row('data-act="about"', t("介绍"), t("设计思路、每页用法、节奏怎么把握"), "✎")}
  </div>

  <h2>${t("打印")}</h2>
  <div class="panel mlist">
    ${row('data-act="print-day"', t("今日页"), t("竖版一页：敬拜、背诵经文全文、任务、备注"), "▫")}
    ${row('data-act="print-week"', t("本周"), t("横版一张表，每格一个勾"), "▦")}
    ${row('data-act="print-month"', t("本月"), t("月历加周例行"), "▤")}
  </div>
  <p class="small muted">${t("不想一直看手机：打一张贴在冰箱上，晚上或周末再把勾补回手机。")}</p>

  <h2>${t("姊妹应用")}</h2>
  <div class="panel mlist">${SISTER_APPS.filter(a => a.id !== THIS_APP).map(link).join("")}</div>
  <p class="small muted">${t("同一个账号、同一个家庭，三个站点互通。")}</p>
  <p class="small muted" style="margin-top:24px">${t("家庭学堂")} · ${t("版本")} ${APP_VERSION}</p>`;
}

export { viewMe, mrow };
