import { familyHTML } from "./core/auth.js";
import { APP_VERSION, BABY_LOG_URL, LS_PREFIX, SISTER_APPS, THIS_APP } from "./core/config.js";
import { LOCALES, locale, t, tc } from "./core/i18n.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { $, dayKey, esc } from "./core/util.js";
import { PLANS } from "./data/plans.js";
import { SUBJECTS, weekdayLabel } from "./data/subjects.js";
import { VERSIONS_EN, VERSIONS_ZH, ve, vz } from "./data/versions.js";
import { currentPlan, defaultVersions, fetchVersions, planState, progressOf, yearInfo } from "./hs.js";
import { SOURCES, SOURCE_FROM, parseRef, refKey } from "./data/bible.js";
import { VERSE_SETS } from "./data/verse-sets.js";
import { render } from "./views.js";

/* ============ 整页表单（替换内容区，和小月亮一样的交互） ============ */
/* 关掉后要回到打开前的位置。坑：pushState 必须在隐藏页面之前——页面一隐藏，文档高度归零，浏览器给旧历史条目
   记下的滚动位置就是 0，返回时会把我们手动恢复的位置又盖掉。所以先 pushState、再隐藏，并把滚动恢复交给自己（manual）。 */
let sheetScrollY = 0;
function showSheet(){
  const d = $("#sheet");
  if (!d.open) {
    sheetScrollY = window.scrollY;
    try { history.scrollRestoration = "manual"; history.pushState({ sheet: 1 }, ""); } catch (e) {}
    d.show();
    document.body.classList.add("sheet-open");
  }
  window.scrollTo(0, 0);
  const first = d.querySelector(".sheet-head h3"); if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
}
// 先同步滚一次（scrollTo 会强制排版），再在下一帧补一次，防止字体 / 图片晚到把高度顶变
function restoreScroll(){ const y = sheetScrollY, go = () => window.scrollTo(0, y); go(); setTimeout(go, 0); requestAnimationFrame(() => { go(); requestAnimationFrame(go); }); }
// 关闭的全部步骤都在这里同步做完，不依赖 dialog 的 close 事件（它是异步派发的，有的环境里还不触发）
function closeSheet(){
  const d = $("#sheet");
  if (!d.open) { render(); return; }
  d.close();
  document.body.classList.remove("sheet-open");
  render(); // the sheet may have changed data the page underneath shows
  restoreScroll();
  if (history.state && history.state.sheet) { try { history.back(); } catch (e) {} }
}
// 其它途径关掉的（如 form method=dialog）：兜底收尾
$("#sheet").addEventListener("close", () => { if (document.body.classList.contains("sheet-open")) { document.body.classList.remove("sheet-open"); render(); restoreScroll(); } });
// 浏览器返回手势 / 返回键关掉表单；此时历史已经退回，closeSheet 不会再 back 一次
window.addEventListener("popstate", () => closeSheet());
const head = (title, extra = "") => `<div class="sheet-head"><h3 id="sheetTitle">${title}</h3><span>${extra}<button class="iconbtn" data-act="close" aria-label="${esc(t("关闭"))}">${esc(t("关闭"))}</button></span></div>`;

/* ---- 通用小表单：spec 描述字段，保存时把 draft 交给 onSave ----
   字段的 label / ph 和选项文字都写简体，画的时候经过 t()；用户填进去的值原样保存。 */
let form = null; // { title, fields, draft, onSave, onDelete }
function openForm(title, fields, values, onSave, onDelete){
  form = { title, fields, draft: { ...values }, onSave, onDelete };
  drawForm(); showSheet();
}
function drawForm(){
  const { title, fields, draft, onDelete } = form;
  const html = fields.map(f => {
    const v = draft[f.k], id = "f_" + f.k, label = t(f.label || ""), ph = esc(t(f.ph || ""));
    if (f.type === "seg") return `<div class="field"><div class="lab" id="${id}">${label}</div><div class="seg" role="group" aria-labelledby="${id}">${f.opts.map(([val, lab]) => `<button type="button" data-seg="${f.k}" data-v="${esc(val)}" aria-pressed="${String(v) === String(val)}">${esc(f.raw ? lab : t(lab))}</button>`).join("")}</div></div>`;
    if (f.type === "multi") return `<div class="field"><div class="lab" id="${id}">${label}</div><div class="seg" role="group" aria-labelledby="${id}">${f.opts.map(([val, lab]) => `<button type="button" data-multi="${f.k}" data-v="${esc(val)}" aria-pressed="${(v || []).map(String).includes(String(val))}">${esc(f.raw ? lab : t(lab))}</button>`).join("")}</div></div>`;
    if (f.type === "area") return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-f="${f.k}" placeholder="${ph}" ${f.rows ? `style="min-height:${f.rows * 24}px"` : ""}>${esc(v || "")}</textarea></div>`;
    if (f.type === "num") return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="numeric" min="0" data-f="${f.k}" value="${v ?? ""}" placeholder="${ph}"></div>`;
    if (f.type === "time") return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="time" data-f="${f.k}" value="${esc(v || "")}"></div>`;
    if (f.type === "date") return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="date" data-f="${f.k}" value="${esc(v || "")}"></div>`;
    if (f.type === "check") return `<div class="field"><label class="check"><input type="checkbox" data-f="${f.k}" ${v ? "checked" : ""}>${label}</label></div>`;
    if (f.type === "html") return `<div class="field">${typeof f.html === "function" ? f.html() : f.html}</div>`; // 只读说明块，不参与读取
    const list = f.list ? `<datalist id="${id}_list">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : "";
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="text" data-f="${f.k}" value="${esc(v || "")}" placeholder="${ph}" ${f.list ? `list="${id}_list"` : ""}>${list}</div>`;
  }).join("");
  const extra = fields.some(f => f.k === "ref") && fields.some(f => f.k === "text_zh") ? `<button class="btn" data-act="form-fetch">${t("按出处抓取经文")}</button>` : "";
  $("#sheetIn").innerHTML = `${head(esc(t(title)))}${html}
    <div class="btns"><button class="btn primary" data-act="form-save">${t("保存")}</button>${extra}${onDelete ? `<button class="btn danger" data-act="form-delete">${t("删除")}</button>` : ""}</div>`;
}
function readForm(){
  $("#sheetIn").querySelectorAll("[data-f]").forEach(el => {
    const k = el.dataset.f;
    if (el.type === "checkbox") form.draft[k] = el.checked;
    else if (el.type === "number") form.draft[k] = el.value === "" ? null : +el.value;
    else form.draft[k] = el.value.trim();
  });
}
// 选项：孩子名是用户数据，用 raw 标记不翻译
const childOpts = (withFamily) => [...(withFamily ? [["", t("全家")]] : []), ...S.children.map(c => [c.id, c.name || t("宝宝")])];
const subjectOpts = () => Object.entries(SUBJECTS).map(([k, s]) => [k, s.label]);
const weekdayOpts = () => [1, 2, 3, 4, 5, 6, 0].map(d => [d, weekdayLabel(d)]);

// 成套导入的选择页
function openVerseSets(){
  const have = new Set(S.hs.scriptures.map(s => refKey(s.ref)));
  $("#sheetIn").innerHTML = `${head(t("成套导入经文卡"))}
  <p class="small muted">${t("只给出处，正文按设置里的译本自动抓取（已有的出处会跳过）。抓取需要联网，几十节约十几秒。")}</p>
  ${VERSE_SETS.map(s => { const n = s.refs.filter(r => parseRef(r) && !have.has(refKey(r))).length;
    return `<div class="panel" style="margin-top:10px"><div class="row"><div class="v"><b>${tc(esc(s.name))}</b><div class="small muted">${tc(esc(s.desc))} ${t("共 {n} 节", { n: s.refs.length })}${n < s.refs.length ? `，${t("还有 {n} 节没导入", { n })}` : ""}</div></div><button class="btn ${n ? "primary" : ""}" data-act="scr-set-go" data-set="${s.id}" ${n ? "" : "disabled"}>${n ? t("生成") : t("已全部导入")}</button></div></div>`; }).join("")}
  <div class="btns"><button class="btn" data-act="scriptures">${t("返回经文卡库")}</button></div>`;
  showSheet();
}
// 只读的说明页
function openInfo(title, html){ $("#sheetIn").innerHTML = `${head(esc(t(title)))}${html}`; showSheet(); }
const fetchFields = [
  { k: "fetchZh", label: "中文抓取译本（免费直取）", type: "seg", raw: true, opts: [["和合本", "和合本"], ["新译本", "新译本"], ["当代译本", "当代译本"]] },
  { k: "fetchEn", label: "英文抓取译本：前五个免费直取，后五个有版权、需要代理", type: "seg", opts: [["BSB", "BSB（现代英语，公有领域）"], ["NLT", "NLT"], ["WEB", "WEB"], ["KJV", "KJV"], ["ASV", "ASV"], ["ESV", "ESV ＊"], ["NASB", "NASB ＊"], ["NIV", "NIV ＊"], ["CSB", "CSB ＊"], ["NKJV", "NKJV ＊"]] },
  { k: "esvProxy", label: "代理地址（Supabase Edge Function 的 URL；ESV 用 Crossway 密钥，NASB / NIV / CSB / NKJV 用 API.Bible 密钥，可空）", type: "text", ph: "https://xxxx.supabase.co/functions/v1/esv" },
  { k: "_help", type: "html", html: () => fetchHelpHTML() }];
// “自动抓取经文”里的说明：每个译本的来源、需要什么、版权状态
function fetchHelpHTML(){
  const link = f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(t(f.name))}</a>`;
  const rows = Object.entries(SOURCES).map(([v, s]) => { const f = SOURCE_FROM[s.from]; return `<tr><td><b>${esc(v)}</b><div class="small muted">${esc(t(s.about))}</div></td><td class="small">${link(f)}<div class="muted">${esc(t(s.rights))}</div></td><td class="small">${esc(t(f.need))}</td></tr>`; }).join("");
  return `<details style="margin-top:6px"><summary class="small" style="cursor:pointer">${t("各译本的来源、需要什么、版权说明")}</summary>
  <div style="overflow-x:auto;margin-top:8px"><table><thead><tr><th>${t("译本")}</th><th>${t("来源 · 版权")}</th><th>${t("需要什么")}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <ul class="small" style="padding-left:18px;margin:10px 0 0;line-height:1.55">
    <li>${t("<b>直接用</b>的译本：出处交给公开接口，浏览器直接取回，不经过任何中间服务器，也不需要注册。")}</li>
    <li>${t("<b>需要代理</b>的译本有版权，出版方的接口不允许网页直连，密钥也不能放进网页。做法是部署一个小的 Supabase Edge Function，密钥只存在它那里，网页只填它的地址（源码在 baby-log 本机的 <code>supabase/functions/esv/index.ts</code>，部署步骤在文件头注释）。")}</li>
    <li>${t("没配代理时，选了 ESV / NASB / NIV / CSB / NKJV 会自动<b>回退到 BSB</b>（公有领域、措辞接近 ESV）。零配置又想要美国教会常用的现代译本，选 <b>NLT</b>。")}</li>
    <li>${t("API.Bible 免费档只能从有版权译本里<b>选 3 本</b>，在它的后台选定后把每本的 bibleId 填进 Edge Function 的 <code>APIBIBLE_IDS</code>。NASB 有 1995 和 2020 两版，NIV 用 2011 版，选的时候留意。")}</li>
    <li>${t("有网站无需密钥就提供 NASB / NIV 全文，但没有逐译本的授权说明，这里故意不用。")}</li>
    <li>${t("版权译本的引用条款（非商业、注明译本、单次节数上限）由家庭自己遵守；每张卡都标有译本名。")}</li>
  </ul></details>`;
}
const genFields = [{ k: "refs", label: "每行一个出处，中英文都行；卡片标题会写成“诗篇 56:3 - Psalms 56:3”", type: "area", rows: 8, ph: "约翰福音 3:16\n诗篇 23\n1 John 4:19\n腓 4:13" }];
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
  const opts = [...PLANS.map(p => [p.id, tc(p.name)]), ...(custom && custom.items && custom.items.length ? [["custom", custom.name || t("自定义计划")]] : [])];
  return `<div class="seg" role="group" aria-label="${t("读经计划")}">${opts.map(([id, name]) => `<button data-plan="${esc(id)}" aria-pressed="${st.id === id}">${esc(name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">${tc(esc(cur.desc || ""))} ${t("进度 {a}/{b}，换计划时各自的进度分开保存。", { a: (st.progress[cur.id] || 0) % Math.max(1, cur.items.length) + 1, b: cur.items.length })}</p>
  <div class="btns" style="margin-top:8px"><button class="btn" data-act="plan-import">${t("导入自己的计划")}</button><button class="btn" data-act="plan-restart">${t("本计划从头开始")}</button></div>`;
}

/* ---- 学年（设置页里） ---- */
function yearHTML(){
  const yi = yearInfo(), y = S.hs.settings.year || {};
  const breaks = (y.breaks || []).map((b, i) => `<div class="medrow"><span>${esc(b.name || t("假期"))} <span class="small muted">${esc(b.from)} ${t("到")} ${esc(b.to)}</span></span><button class="chip" data-act="break-del" data-i="${i}">${t("删除")}</button></div>`).join("");
  return `${yi ? `<p>${t("开学 <b>{start}</b>，共 <b>{weeks}</b> 周，每学期 {tw} 周，预计 {end} 结束。", { start: esc(yi.start), weeks: yi.weeks, tw: yi.termWeeks, end: yi.endOn })}${yi.before ? t("还没开学。") : yi.ended ? t("学年已结束。") : t("现在是第 {w} 周、第 {term} 学期。", { w: yi.week, term: yi.term })}</p>` : `<p class="muted">${t("还没设置学年。填了开学日期和周数，课程页和报告页才能判断“按计划 / 快 / 慢”。美国惯例 36 周、3 个学期各 12 周。")}</p>`}
  <div class="btns" style="margin-top:0"><button class="btn ${yi ? "" : "primary"}" data-act="year-edit">${yi ? t("修改学年") : t("设置学年")}</button><button class="btn" data-act="break-add">＋ ${t("假期")}</button></div>
  ${breaks ? `<div style="margin-top:8px">${breaks}</div>` : ""}
  <p class="small muted" style="margin-top:8px">${t("假期期间不生成任务，报告里的“计划”也不计这些天。单日休息在日历页点那一天设置。")}</p>`;
}
const yearFields = [
  { k: "start", label: "开学日期", type: "date" }, { k: "weeks", label: "全年周数", type: "num", ph: "36" }, { k: "termWeeks", label: "每学期周数", type: "num", ph: "12" }];
const breakFields = [
  { k: "name", label: "名称", type: "text", ph: "感恩节 / 圣诞 / 春假" }, { k: "from", label: "从", type: "date" }, { k: "to", label: "到", type: "date" }];

/* ---- 设置 ---- */
function themePref(){ try { return localStorage.getItem(LS_PREFIX + ".theme") || ""; } catch (e) { return ""; } }
function openSettings(){
  const kids = S.children;
  $("#sheetIn").innerHTML = `${head(esc(t("设置")))}
  <h2>${t("家庭")}</h2>
  ${familyHTML()}

  ${S.hs.loaded ? `<h2>${t("读经计划")}</h2><div class="panel">${planHTML()}</div>
  <h2>${t("本月诗歌")}</h2><div class="panel"><p>${S.hs.settings.hymn ? esc(S.hs.settings.hymn) : `<span class="muted">${t("还没填")}</span>`}</p><div class="btns" style="margin-top:0"><button class="btn" data-act="devo-hymn">${t("修改")}</button><button class="btn" data-act="scriptures">${t("经文卡库")}</button></div></div>
  <h2>${t("经文背诵")}</h2><div class="panel"><p class="small">${S.hs.settings.autoVerse === false ? t("已关闭：") : t("已开启：")}${t("不用点“开始背”：每天 8 点，哪个孩子没有在学的经文，就自动从卡库拉一批（每批节数、问答占比在经文卡库里调；问答按顺序、经文随机）；本批全部会背后马上拉下一批。卡库背完了，自动从成套经文里按顺序抓 5 节。每天封顶按年龄：幼儿 1+1、学前 1+2、学龄 2+3。")}</p>
    <div class="btns" style="margin-top:0"><button class="btn ${S.hs.settings.autoVerse === false ? "primary" : ""}" data-act="autoverse-toggle">${S.hs.settings.autoVerse === false ? t("开启自动安排") : t("关闭自动安排")}</button></div></div>
  <h2>${t("打印")}</h2><div class="panel"><p class="small">${t("不想一直看手机：打一张贴在冰箱上。今日页竖版一页（敬拜、背诵经文全文、任务、备注）；本周横版一张表，每格一个勾；本月一张月历加周例行。晚上或周末再把勾补回手机。")}</p>
    <div class="btns" style="margin-top:0"><button class="btn primary" data-act="print-day">${t("今日页")}</button><button class="btn" data-act="print-week">${t("本周")}</button><button class="btn" data-act="print-month">${t("本月")}</button></div></div>
  <h2>${t("经文译本")}</h2><div class="panel"><p>${t("手写卡的默认标注：中文 <b>{zh}</b>，英文 <b>{en}</b>。", { zh: esc(defaultVersions().zh), en: esc(defaultVersions().en) })}</p>
    <p class="small">${t("自动抓取用：中文 <b>{zh}</b>，英文 <b>{en}</b>{fb}。免费直取：和合本、新译本、当代译本；BSB、NLT、WEB、KJV、ASV。有版权的 ESV、NASB、NIV、CSB、NKJV 要经一个 Supabase Edge Function 代理（持 Crossway / API.Bible 的免费非商业密钥），在这里填地址。", { zh: esc(fetchVersions().zh), en: esc(fetchVersions().en), fb: fetchVersions().enFallback ? t("（{v} 需要代理，暂时回退到公有领域的 BSB）", { v: esc(fetchVersions().wanted.en) }) : "" })}</p>
    <div class="btns" style="margin-top:0"><button class="btn" data-act="versions-edit">${t("手写卡默认译本")}</button><button class="btn" data-act="fetch-settings">${t("抓取译本与代理")}</button></div></div>
  <h2>${t("学年与假期")}</h2><div class="panel">${yearHTML()}</div>
  <h2>${t("回写小月亮")}</h2><div class="panel"><p class="small">${S.hs.settings.mirror ? t("已开启：") : t("未开启：")}${t("完成带分钟数的任务时，阅读与语言记为小月亮的“阅读”，艺术与音乐记为“音乐运动”，标题含“户外”记为“户外”，其余不回写。这样成长页的趋势图仍然完整。")}</p>
    <div class="btns" style="margin-top:0"><button class="btn ${S.hs.settings.mirror ? "" : "primary"}" data-act="mirror-toggle">${S.hs.settings.mirror ? t("关闭回写") : t("开启回写")}</button></div></div>` : ""}

  <h2>${t("孩子")}</h2>
  <div class="panel">
    ${kids.length ? `<div class="scroll-x"><table><thead><tr><th>${t("小名")}</th><th>${t("生日")}</th><th>${t("年龄")}</th><th>${t("阶段")}</th></tr></thead><tbody>
      ${kids.map(c => `<tr><td><b>${esc(c.name || t("宝宝"))}</b></td><td class="num">${esc(c.birth || "—")}</td><td>${esc(ageText(c.id))}</td><td>${esc(stageOf(c.id).name)}</td></tr>`).join("")}
    </tbody></table></div>`
    : `<p class="muted">${S.cloud === "ready" ? t("家庭里还没有孩子。") : t("登录并进入家庭后，这里会显示孩子。")}</p>`}
    <p class="small muted" style="margin-top:8px">${t("孩子的名字和生日在")}<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">${t("小月亮")}</a>${t("的设置里维护，两个应用共用同一份。")}${S.childrenSource === "settings" ? t("（当前读取的是旧格式；数据库迁移 002 执行后会自动切到 children 表。）") : ""}</p>
  </div>

  <h2>${t("姊妹应用")}</h2>
  <div class="panel" style="padding:4px 14px">
    ${SISTER_APPS.map(a => `<div class="medrow"><div><b>${a.id === THIS_APP ? esc(t(a.name)) : `<a href="${a.url}">${esc(t(a.name))}</a>`}</b>${a.id === THIS_APP ? ` <span class="small muted">${t("（当前）")}</span>` : ""}<div class="small muted">${tc(esc(a.desc))}</div></div>${a.id === THIS_APP ? "" : `<a class="chip" href="${a.url}" style="text-decoration:none">${t("打开")}</a>`}</div>`).join("")}
  </div>
  <p class="small muted">${t("同一个账号、同一个家庭，四个站点互通；标题旁的左右箭头也能切换。")}</p>

  <h2>${t("界面语言")}</h2>
  <div class="seg" role="group" aria-label="${t("界面语言")}">${LOCALES.map(([v, l]) => `<button data-locale-set="${v}" aria-pressed="${locale() === v}" lang="${v}">${l}</button>`).join("")}</div>
  <p class="small muted">${t("切换整个界面的文字：页签、标题、按钮、表单、提示。你们自己录入的内容（任务、课时、经文卡、备注……）保持输入时的样子，简体、繁体、英文都可以输入。法规、介绍和课程库这些自带内容，繁体会自动转换，英文界面下暂时保持中文。")}</p>

  <h2>${t("显示")}</h2>
  <div class="seg" role="group" aria-label="${t("外观")}">${[["", t("跟随系统")], ["light", t("浅色")], ["dark", t("深色")]].map(([v, l]) => `<button data-theme-set="${v}" aria-pressed="${themePref() === v}">${esc(l)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:24px">${t("版本")} ${APP_VERSION}</p>`;
  showSheet();
}

export { showSheet, closeSheet, head, openForm, drawForm, readForm, openInfo, openVerseSets, openSettings, childOpts, subjectOpts, weekdayOpts, scriptureFields, versionFields, yearFields, breakFields, fetchFields, genFields, nccFields };
export function getForm(){ return form; }
