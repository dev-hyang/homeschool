import { LS_PREFIX } from "./core/config.js";
import { t, tc } from "./core/i18n.js";
import { esc } from "./core/util.js";
import { DEFAULT_STATE, LAWS, STATE_ORDER } from "./data/law.js";

/* ============ 法规页：按州的在家教育要求摘要，默认伊利诺伊 ============
   法规正文是应用自带的中文内容：繁体界面下逐字转换（tc），英文界面下保持中文，只翻译栏目和表头。 */
const KEY = LS_PREFIX + ".lawState";
function lawState(){ try { const s = localStorage.getItem(KEY); return LAWS[s] ? s : DEFAULT_STATE; } catch (e) { return DEFAULT_STATE; } }
function setLawState(s){ if (!LAWS[s]) return; try { localStorage.setItem(KEY, s); } catch (e) {} }

function viewLaw(){
  const cur = lawState(), L = LAWS[cur], c = s => tc(esc(s));
  const glance = [
    ["伊利诺伊", "不需要", "6–17", "无", "无"],
    ["密歇根", "不需要（豁免 f）", "6–18", "无", "无"],
    ["印第安纳", "不需要，但保存每日出勤", "7–18", "无", "无"],
    ["北卡", "7 岁前向 DNPE 备案", "7–16", "高中文凭", "每年一次"],
    ["田纳西", "独立路径每年向学区报备；伞校不用", "6–17", "独立路径需高中文凭", "独立路径 5/7/9 年级"]
  ];
  return `<h2>${t("在家教育法规")}</h2>
  <div class="chips" role="group" aria-label="${t("选择州")}">${STATE_ORDER.map(k => `<button class="chip" data-state="${k}" aria-pressed="${k === cur}">${c(LAWS[k].name.split(" ")[0])}</button>`).join("")}</div>
  <h3>${c(L.name)} <span class="small muted">· ${c(L.level)}</span></h3>
  <div class="alert info"><b>${c(L.verdict)}</b><div class="small muted" style="margin-top:4px">${t("整理日期")} ${L.asOf} · ${t("不是法律意见")}${cur === DEFAULT_STATE ? ` · ${t("我们家所在州")}` : ` · ${t("参考")}`}</div></div>
  <div class="panel scroll-x" style="margin-top:12px"><table><tbody>${L.rows.map(([k, v]) => `<tr><th style="width:30%">${c(k)}</th><td>${c(v)}</td></tr>`).join("")}</tbody></table>
    <p class="small muted" style="margin-top:8px"><b>${t("法律依据")}</b> ${c(L.basis)}</p></div>
  <h2>${t("对我们家的含义")}</h2>
  <div class="panel"><ul class="plain">${L.forUs.map(x => `<li>${c(x)}</li>`).join("")}</ul></div>
  <h2>${c(L.watch.title)}</h2>
  <div class="panel"><p>${c(L.watch.text)}</p><ul class="plain">${L.watch.actions.map(x => `<li>${c(x)}</li>`).join("")}</ul></div>
  <h2>${t("来源")}</h2>
  <div class="panel"><ul class="plain">${L.sources.map(([title, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${c(title)}</a></li>`).join("")}</ul>
    <p class="small muted" style="margin-top:8px">${c(L.caveat)}</p></div>
  <h2>${t("五州一览")}</h2>
  <div class="panel scroll-x"><table><thead><tr><th>${t("州")}</th><th>${t("报备")}</th><th>${t("义务教育年龄")}</th><th>${t("家长资质")}</th><th>${t("考试")}</th></tr></thead><tbody>
    ${glance.map(r => `<tr>${r.map(x => `<td>${c(x)}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div>`;
}

export { viewLaw, lawState, setLawState };
