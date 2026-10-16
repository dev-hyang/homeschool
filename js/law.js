import { esc } from "./core/util.js";
import { DEFAULT_STATE, LAWS } from "./data/law.js";

/* ============ 法规页：按州的在家教育要求摘要 ============ */
function viewLaw(){
  const L = LAWS[DEFAULT_STATE];
  return `<h2>${esc(L.name)} · 在家教育法规</h2>
  <div class="alert info"><b>${esc(L.verdict)}</b><div class="small muted" style="margin-top:4px">整理日期 ${L.asOf} · 不是法律意见</div></div>
  <div class="panel scroll-x" style="margin-top:12px"><table><tbody>${L.rows.map(([k, v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
    <p class="small muted" style="margin-top:8px"><b>法律依据</b> ${esc(L.basis)}</p></div>
  <h2>对我们家的含义</h2>
  <div class="panel"><ul class="plain">${L.forUs.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <h2>${esc(L.watch.title)}</h2>
  <div class="panel"><p>${esc(L.watch.text)}</p><ul class="plain">${L.watch.actions.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <h2>来源</h2>
  <div class="panel"><ul class="plain">${L.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
    <p class="small muted" style="margin-top:8px">${esc(L.caveat)}</p></div>`;
}

export { viewLaw };
