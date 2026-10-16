import { LS_PREFIX } from "./core/config.js";
import { esc } from "./core/util.js";
import { DEFAULT_STATE, LAWS, STATE_ORDER } from "./data/law.js";

/* ============ 法规页：按州的在家教育要求摘要，默认伊利诺伊 ============ */
const KEY = LS_PREFIX + ".lawState";
function lawState(){ try { const s = localStorage.getItem(KEY); return LAWS[s] ? s : DEFAULT_STATE; } catch (e) { return DEFAULT_STATE; } }
function setLawState(s){ if (!LAWS[s]) return; try { localStorage.setItem(KEY, s); } catch (e) {} }

function viewLaw(){
  const cur = lawState(), L = LAWS[cur];
  return `<h2>在家教育法规</h2>
  <div class="chips" role="group" aria-label="选择州">${STATE_ORDER.map(k => `<button class="chip" data-state="${k}" aria-pressed="${k === cur}">${esc(LAWS[k].name.split(" ")[0])}</button>`).join("")}</div>
  <h3>${esc(L.name)} <span class="small muted">· ${esc(L.level)}</span></h3>
  <div class="alert info"><b>${esc(L.verdict)}</b><div class="small muted" style="margin-top:4px">整理日期 ${L.asOf} · 不是法律意见${cur === DEFAULT_STATE ? " · 我们家所在州" : " · 参考"}</div></div>
  <div class="panel scroll-x" style="margin-top:12px"><table><tbody>${L.rows.map(([k, v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
    <p class="small muted" style="margin-top:8px"><b>法律依据</b> ${esc(L.basis)}</p></div>
  <h2>对我们家的含义</h2>
  <div class="panel"><ul class="plain">${L.forUs.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <h2>${esc(L.watch.title)}</h2>
  <div class="panel"><p>${esc(L.watch.text)}</p><ul class="plain">${L.watch.actions.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <h2>来源</h2>
  <div class="panel"><ul class="plain">${L.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
    <p class="small muted" style="margin-top:8px">${esc(L.caveat)}</p></div>
  <h2>五州一览</h2>
  <div class="panel scroll-x"><table><thead><tr><th>州</th><th>报备</th><th>义务教育年龄</th><th>家长资质</th><th>考试</th></tr></thead><tbody>
    <tr><td>伊利诺伊</td><td>不需要</td><td>6–17</td><td>无</td><td>无</td></tr>
    <tr><td>密歇根</td><td>不需要（豁免 f）</td><td>6–18</td><td>无</td><td>无</td></tr>
    <tr><td>印第安纳</td><td>不需要，但保存每日出勤</td><td>7–18</td><td>无</td><td>无</td></tr>
    <tr><td>北卡</td><td>7 岁前向 DNPE 备案</td><td>7–16</td><td>高中文凭</td><td>每年一次</td></tr>
    <tr><td>田纳西</td><td>独立路径每年向学区报备；伞校不用</td><td>6–17</td><td>独立路径需高中文凭</td><td>独立路径 5/7/9 年级</td></tr>
  </tbody></table></div>`;
}

export { viewLaw, lawState, setLawState };
