import { familyHTML } from "./core/auth.js";
import { APP_VERSION, BABY_LOG_URL, LS_PREFIX } from "./core/config.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { $, esc } from "./core/util.js";
import { PLANS } from "./data/plans.js";
import { SUBJECTS, WEEKDAYS } from "./data/subjects.js";
import { VERSIONS_EN, VERSIONS_ZH, ve, vz } from "./data/versions.js";
import { currentPlan, defaultVersions, fetchVersions, planState, progressOf, yearInfo } from "./hs.js";
import { parseRef } from "./data/bible.js";
import { VERSE_SETS } from "./data/verse-sets.js";
import { render } from "./views.js";

/* ============ 整页表单（替换内容区，和小月亮一样的交互） ============ */
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
  render(); // the sheet may have changed data the page underneath shows
  requestAnimationFrame(() => window.scrollTo(0, sheetScrollY));
  if (history.state && history.state.sheet) { try { history.back(); } catch (e) {} }
});
// close + redraw in one step; the dialog's own close event also redraws, but it is dispatched asynchronously
function closeSheet(){ const d = $("#sheet"); if (d.open) d.close(); render(); }
window.addEventListener("popstate", () => closeSheet());
const head = (title, extra = "") => `<div class="sheet-head"><h3 id="sheetTitle">${title}</h3><span>${extra}<button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></span></div>`;

/* ---- 通用小表单：spec 描述字段，保存时把 draft 交给 onSave ---- */
let form = null; // { title, fields, draft, onSave, onDelete }
function openForm(title, fields, values, onSave, onDelete){
  form = { title, fields, draft: { ...values }, onSave, onDelete };
  drawForm(); showSheet();
}
function drawForm(){
  const { title, fields, draft, onDelete } = form;
  const html = fields.map(f => {
    const v = draft[f.k], id = "f_" + f.k;
    if (f.type === "seg") return `<div class="field"><div class="lab" id="${id}">${f.label}</div><div class="seg" role="group" aria-labelledby="${id}">${f.opts.map(([val, lab]) => `<button type="button" data-seg="${f.k}" data-v="${esc(val)}" aria-pressed="${String(v) === String(val)}">${esc(lab)}</button>`).join("")}</div></div>`;
    if (f.type === "multi") return `<div class="field"><div class="lab" id="${id}">${f.label}</div><div class="seg" role="group" aria-labelledby="${id}">${f.opts.map(([val, lab]) => `<button type="button" data-multi="${f.k}" data-v="${esc(val)}" aria-pressed="${(v || []).map(String).includes(String(val))}">${esc(lab)}</button>`).join("")}</div></div>`;
    if (f.type === "area") return `<div class="field"><label for="${id}">${f.label}</label><textarea id="${id}" data-f="${f.k}" placeholder="${esc(f.ph || "")}" ${f.rows ? `style="min-height:${f.rows * 24}px"` : ""}>${esc(v || "")}</textarea></div>`;
    if (f.type === "num") return `<div class="field"><label for="${id}">${f.label}</label><input id="${id}" type="number" inputmode="numeric" min="0" data-f="${f.k}" value="${v ?? ""}" placeholder="${esc(f.ph || "")}"></div>`;
    if (f.type === "time") return `<div class="field"><label for="${id}">${f.label}</label><input id="${id}" type="time" data-f="${f.k}" value="${esc(v || "")}"></div>`;
    if (f.type === "date") return `<div class="field"><label for="${id}">${f.label}</label><input id="${id}" type="date" data-f="${f.k}" value="${esc(v || "")}"></div>`;
    if (f.type === "check") return `<div class="field"><label class="check"><input type="checkbox" data-f="${f.k}" ${v ? "checked" : ""}>${f.label}</label></div>`;
    const list = f.list ? `<datalist id="${id}_list">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : "";
    return `<div class="field"><label for="${id}">${f.label}</label><input id="${id}" type="text" data-f="${f.k}" value="${esc(v || "")}" placeholder="${esc(f.ph || "")}" ${f.list ? `list="${id}_list"` : ""}>${list}</div>`;
  }).join("");
  const extra = fields.some(f => f.k === "ref") && fields.some(f => f.k === "text_zh") ? `<button class="btn" data-act="form-fetch">按出处抓取经文</button>` : "";
  $("#sheetIn").innerHTML = `${head(title)}${html}
    <div class="btns"><button class="btn primary" data-act="form-save">保存</button>${extra}${onDelete ? `<button class="btn danger" data-act="form-delete">删除</button>` : ""}</div>`;
}
function readForm(){
  $("#sheetIn").querySelectorAll("[data-f]").forEach(el => {
    const k = el.dataset.f;
    if (el.type === "checkbox") form.draft[k] = el.checked;
    else if (el.type === "number") form.draft[k] = el.value === "" ? null : +el.value;
    else form.draft[k] = el.value.trim();
  });
}
const childOpts = (withFamily) => [...(withFamily ? [["", "全家"]] : []), ...S.children.map(c => [c.id, c.name || "宝宝"])];
const subjectOpts = Object.entries(SUBJECTS).map(([k, s]) => [k, s.label]);
const weekdayOpts = [1, 2, 3, 4, 5, 6, 0].map(d => [d, "周" + WEEKDAYS[d]]);

/* ---- 经文卡库 ---- */
function openScriptures(){
  const cid = S.childId, list = S.hs.scriptures, fv = fetchVersions();
  const stateOf = s => { const p = progressOf(s.id, cid); return !p ? "" : p.status === "learning" ? "在学" : `会背 · 复习 ${p.next_review || ""}`; };
  $("#sheetIn").innerHTML = `${head("经文卡库")}
  <p class="small muted">经文卡属于全家，背诵进度按孩子分开。当前孩子：${esc(childName())}。</p>
  <p class="small muted">自动抓取用：中文 ${esc(fv.zh)}${fv.zhFallback ? "（已回退）" : ""} · 英文 ${esc(fv.en)}${fv.enFallback ? "（ESV 需代理，已回退）" : ""} <button class="chip" data-act="fetch-settings">改</button>${S.hs.versions ? "" : " · 译本字段需要迁移 005"}</p>
  <div class="btns" style="margin-top:0"><button class="btn primary" data-act="scr-gen">按出处生成</button><button class="btn" data-act="scr-set">成套导入</button><button class="btn" data-act="ncc-import">新城要理问答</button><button class="btn" data-act="scr-add">手写一张</button></div>
  ${list.length ? "" : `<p class="small muted">“按出处生成”：贴几行出处（如 约翰福音 3:16），中英文经文自动抓取。或先<button class="chip" data-act="seed-scriptures">导入起步经文卡（和合本 / ESV）</button>。</p>`}
  ${list.length ? list.map(s => `<div class="card" style="margin-top:10px"><div class="row" style="align-items:flex-start"><div class="v"><b>${esc(s.ref)}</b> <span class="small muted">${s.kind === "catechism" ? "问答" : s.kind === "hymn" ? "诗歌" : "经文"}${stateOf(s) ? " · " + esc(stateOf(s)) : ""}</span><div>${esc(s.text_zh)}<span class="small muted">${esc(vz(s))}</span></div><div class="small muted">${esc(s.text_en)}${esc(ve(s))}</div>${s.source ? `<div class="small muted">${esc(s.source)}</div>` : ""}</div></div>
    <div class="btns" style="margin-top:8px">
      ${!progressOf(s.id, cid) ? `<button class="btn" data-act="scr-start" data-sid="${esc(s.id)}">${esc(childName())}开始背</button>` : `<button class="btn" data-act="scr-reset" data-sid="${esc(s.id)}">清除${esc(childName())}的进度</button>`}
      <button class="chip" data-act="scr-week" data-sid="${esc(s.id)}" aria-pressed="${S.hs.settings.weekVerse === s.id}">${S.hs.settings.weekVerse === s.id ? "本周经文 ✓" : "设为本周经文"}</button>
      <button class="chip" data-act="scr-edit" data-sid="${esc(s.id)}">编辑</button></div></div>`).join("")
    : `<div class="empty">还没有经文卡。导入起步卡，或者添加你们自己选的经文。</div>`}
  ${list.length ? `<div class="btns"><button class="btn" data-act="seed-scriptures">补充导入起步经文卡（和合本 / ESV）</button></div>` : ""}`;
  showSheet();
}
// 成套导入的选择页
function openVerseSets(){
  const have = new Set(S.hs.scriptures.map(s => s.ref.replace(/\s+/g, "")));
  $("#sheetIn").innerHTML = `${head("成套导入经文卡")}
  <p class="small muted">只给出处，正文按设置里的译本自动抓取（已有的出处会跳过）。抓取需要联网，几十节约十几秒。</p>
  ${VERSE_SETS.map(s => { const n = s.refs.filter(r => { const p = parseRef(r); return p && !have.has(p.label.replace(/\s+/g, "")); }).length;
    return `<div class="panel" style="margin-top:10px"><div class="row"><div class="v"><b>${esc(s.name)}</b><div class="small muted">${esc(s.desc)} 共 ${s.refs.length} 节${n < s.refs.length ? `，还有 ${n} 节没导入` : ""}</div></div><button class="btn ${n ? "primary" : ""}" data-act="scr-set-go" data-set="${s.id}" ${n ? "" : "disabled"}>${n ? "生成" : "已全部导入"}</button></div></div>`; }).join("")}
  <div class="btns"><button class="btn" data-act="scriptures">返回经文卡库</button></div>`;
  showSheet();
}
// 只读的说明页
function openInfo(title, html){ $("#sheetIn").innerHTML = `${head(esc(title))}${html}`; showSheet(); }
const fetchFields = [
  { k: "fetchZh", label: "中文抓取译本", type: "seg", opts: [["和合本", "和合本"], ["新译本", "新译本"]] },
  { k: "fetchEn", label: "英文抓取译本", type: "seg", opts: [["WEB", "WEB（公有领域，现代英语）"], ["KJV", "KJV"], ["ASV", "ASV"], ["ESV", "ESV（需代理）"]] },
  { k: "esvProxy", label: "ESV 代理地址（Supabase Edge Function 的 URL，可空）", type: "text", ph: "https://xxxx.supabase.co/functions/v1/esv" }];
const genFields = [{ k: "refs", label: "每行一个出处，中英文都行", type: "area", rows: 8, ph: "约翰福音 3:16\n诗篇 23\n1 John 4:19\n腓 4:13" }];
const nccFields = [
  { k: "lang", label: "粘贴的是哪种语言", type: "seg", opts: [["zh", "中文（官方简体页）"], ["en", "English"]] },
  { k: "text", label: "全选复制官方页面的全文，粘贴到这里", type: "area", rows: 10, ph: "问题1：\n你无论是生是死，唯一的安慰是什么？\n我无论是生是死……" }];
const scriptureFields = [
  { k: "kind", label: "类型", type: "seg", opts: [["verse", "经文"], ["catechism", "要理问答"], ["hymn", "诗歌"]] },
  { k: "ref", label: "出处 / 问答编号 / 诗歌名", type: "text", ph: "约翰福音 3:16" },
  { k: "text_zh", label: "中文", type: "area", ph: "神爱世人…" },
  { k: "version_zh", label: "中文译本", type: "text", list: VERSIONS_ZH, ph: "和合本" },
  { k: "text_en", label: "English", type: "area", ph: "For God so loved the world…" },
  { k: "version_en", label: "English version", type: "text", list: VERSIONS_EN, ph: "ESV" },
  { k: "source", label: "来源 / 备注（可空）", type: "text", ph: "New City Catechism" }
];
const versionFields = [
  { k: "zh", label: "中文默认译本", type: "text", list: VERSIONS_ZH },
  { k: "en", label: "英文默认译本", type: "text", list: VERSIONS_EN }
];

/* ---- 读经计划（设置页里） ---- */
function planHTML(){
  const st = planState(), cur = currentPlan(), custom = S.hs.settings.customPlan;
  const opts = [...PLANS.map(p => [p.id, p.name]), ...(custom && custom.items && custom.items.length ? [["custom", custom.name || "自定义计划"]] : [])];
  return `<div class="seg" role="group" aria-label="读经计划">${opts.map(([id, name]) => `<button data-plan="${esc(id)}" aria-pressed="${st.id === id}">${esc(name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">${esc(cur.desc || "")} 进度 ${(st.progress[cur.id] || 0) % Math.max(1, cur.items.length) + 1}/${cur.items.length}，换计划时各自的进度分开保存。</p>
  <div class="btns" style="margin-top:8px"><button class="btn" data-act="plan-import">导入自己的计划</button><button class="btn" data-act="plan-restart">本计划从头开始</button></div>`;
}

/* ---- 学年（设置页里） ---- */
function yearHTML(){
  const yi = yearInfo(), y = S.hs.settings.year || {};
  const breaks = (y.breaks || []).map((b, i) => `<div class="medrow"><span>${esc(b.name || "假期")} <span class="small muted">${esc(b.from)} 到 ${esc(b.to)}</span></span><button class="chip" data-act="break-del" data-i="${i}">删除</button></div>`).join("");
  return `${yi ? `<p>开学 <b>${esc(yi.start)}</b>，共 <b>${yi.weeks}</b> 周，每学期 ${yi.termWeeks} 周，预计 ${yi.endOn} 结束。${yi.before ? "还没开学。" : yi.ended ? "学年已结束。" : `现在是第 ${yi.week} 周、第 ${yi.term} 学期。`}</p>` : `<p class="muted">还没设置学年。填了开学日期和周数，课程页和报告页才能判断“按计划 / 快 / 慢”。美国惯例 36 周、3 个学期各 12 周。</p>`}
  <div class="btns" style="margin-top:0"><button class="btn ${yi ? "" : "primary"}" data-act="year-edit">${yi ? "修改学年" : "设置学年"}</button><button class="btn" data-act="break-add">＋ 假期</button></div>
  ${breaks ? `<div style="margin-top:8px">${breaks}</div>` : ""}
  <p class="small muted" style="margin-top:8px">假期期间不生成任务，报告里的“计划”也不计这些天。单日休息在日历页点那一天设置。</p>`;
}
const yearFields = [
  { k: "start", label: "开学日期", type: "date" }, { k: "weeks", label: "全年周数", type: "num", ph: "36" }, { k: "termWeeks", label: "每学期周数", type: "num", ph: "12" }];
const breakFields = [
  { k: "name", label: "名称", type: "text", ph: "感恩节 / 圣诞 / 春假" }, { k: "from", label: "从", type: "date" }, { k: "to", label: "到", type: "date" }];

/* ---- 设置 ---- */
function themePref(){ try { return localStorage.getItem(LS_PREFIX + ".theme") || ""; } catch (e) { return ""; } }
function openSettings(){
  const kids = S.children;
  $("#sheetIn").innerHTML = `${head("设置", `<button class="iconbtn" data-act="about">介绍</button> `)}
  <h2>家庭</h2>
  ${familyHTML()}

  ${S.hs.loaded ? `<h2>读经计划</h2><div class="panel">${planHTML()}</div>
  <h2>本月诗歌</h2><div class="panel"><p>${S.hs.settings.hymn ? esc(S.hs.settings.hymn) : `<span class="muted">还没填</span>`}</p><div class="btns" style="margin-top:0"><button class="btn" data-act="devo-hymn">修改</button><button class="btn" data-act="scriptures">经文卡库</button></div></div>
  <h2>经文译本</h2><div class="panel"><p>手写卡的默认标注：中文 <b>${esc(defaultVersions().zh)}</b>，英文 <b>${esc(defaultVersions().en)}</b>。</p>
    <p class="small">自动抓取用：中文 <b>${esc(fetchVersions().zh)}</b>，英文 <b>${esc(fetchVersions().en)}</b>${fetchVersions().enFallback ? "（ESV 需要代理，暂时回退到公有领域的 WEB）" : ""}。和合本、新译本、WEB、KJV、ASV 从 getBible 免费直取；ESV 有版权，需要一个 Supabase Edge Function 代理并在这里填地址。</p>
    <div class="btns" style="margin-top:0"><button class="btn" data-act="versions-edit">手写卡默认译本</button><button class="btn" data-act="fetch-settings">抓取译本与 ESV 代理</button></div></div>
  <h2>学年与假期</h2><div class="panel">${yearHTML()}</div>
  <h2>回写小月亮</h2><div class="panel"><p class="small">${S.hs.settings.mirror ? "已开启：" : "未开启："}完成带分钟数的任务时，阅读与语言记为小月亮的“阅读”，艺术与音乐记为“音乐运动”，标题含“户外”记为“户外”，其余不回写。这样成长页的趋势图仍然完整。</p>
    <div class="btns" style="margin-top:0"><button class="btn ${S.hs.settings.mirror ? "" : "primary"}" data-act="mirror-toggle">${S.hs.settings.mirror ? "关闭回写" : "开启回写"}</button></div></div>` : ""}

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

export { showSheet, closeSheet, openForm, drawForm, readForm, openInfo, openScriptures, openVerseSets, openSettings, childOpts, subjectOpts, weekdayOpts, scriptureFields, versionFields, yearFields, breakFields, fetchFields, genFields, nccFields };
export function getForm(){ return form; }
